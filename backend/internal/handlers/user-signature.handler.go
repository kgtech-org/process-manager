package handlers

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kodesonik/process-manager/internal/helpers"
	"github.com/kodesonik/process-manager/internal/middleware"
	"github.com/kodesonik/process-manager/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type UserSignatureHandler struct {
	signatureCollection *mongo.Collection
}

func NewUserSignatureHandler(db *mongo.Database) *UserSignatureHandler {
	return &UserSignatureHandler{
		signatureCollection: db.Collection("user_signatures"),
	}
}

// CreateSignature creates a new signature for the user
// POST /api/users/me/signatures
func (h *UserSignatureHandler) CreateSignature(c *gin.Context) {
	var req models.CreateUserSignatureRequest
	if err := helpers.BindAndValidate(c, &req); err != nil {
		helpers.SendValidationErrors(c, err)
		return
	}

	// Get current user
	user, exists := middleware.GetCurrentUser(c)
	if !exists {
		helpers.SendUnauthorized(c, "User not found in context", "UNAUTHORIZED")
		return
	}

	// Validate signature type
	if !models.IsValidUserSignatureType(req.Type) {
		helpers.SendBadRequest(c, "Invalid signature type")
		return
	}

	ctx := c.Request.Context()

	// If this is set as default, unset other defaults
	signature := &models.UserSignature{
		UserID:    user.ID,
		Name:      req.Name,
		Type:      req.Type,
		Data:      req.Data,
		Font:      req.Font,
		IsDefault: false, // Will be set to true if it's the first signature
	}
	signature.BeforeCreate()

	// Check if user has any signatures
	count, err := h.signatureCollection.CountDocuments(ctx, bson.M{"user_id": user.ID})
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	// If this is the first signature, make it default
	if count == 0 {
		signature.IsDefault = true
	}

	result, err := h.signatureCollection.InsertOne(ctx, signature)
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}
	signature.ID = result.InsertedID.(primitive.ObjectID)

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Signature created successfully",
		"data":    signature.ToResponse(),
	})
}

// ListSignatures retrieves all signatures for the current user
// GET /api/users/me/signatures
func (h *UserSignatureHandler) ListSignatures(c *gin.Context) {
	// Get current user
	user, exists := middleware.GetCurrentUser(c)
	if !exists {
		helpers.SendUnauthorized(c, "User not found in context", "UNAUTHORIZED")
		return
	}

	ctx := c.Request.Context()

	// Find all signatures for the user
	cursor, err := h.signatureCollection.Find(ctx, bson.M{"user_id": user.ID})
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}
	defer cursor.Close(ctx)

	var signatures []models.UserSignature
	if err := cursor.All(ctx, &signatures); err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	// Convert to response format
	responses := make([]models.UserSignatureResponse, len(signatures))
	for i, sig := range signatures {
		responses[i] = sig.ToResponse()
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Signatures retrieved successfully",
		"data":    responses,
	})
}

// UpdateSignature updates a signature
// PUT /api/users/me/signatures/:id
func (h *UserSignatureHandler) UpdateSignature(c *gin.Context) {
	signatureID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		helpers.SendBadRequest(c, "Invalid signature ID format")
		return
	}

	var req models.UpdateUserSignatureRequest
	if err := helpers.BindAndValidate(c, &req); err != nil {
		helpers.SendValidationErrors(c, err)
		return
	}

	// Get current user
	user, exists := middleware.GetCurrentUser(c)
	if !exists {
		helpers.SendUnauthorized(c, "User not found in context", "UNAUTHORIZED")
		return
	}

	ctx := c.Request.Context()

	// Check if signature exists and belongs to user
	var signature models.UserSignature
	err = h.signatureCollection.FindOne(ctx, bson.M{
		"_id":     signatureID,
		"user_id": user.ID,
	}).Decode(&signature)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			helpers.SendNotFound(c, "Signature not found")
			return
		}
		helpers.SendInternalError(c, err)
		return
	}

	// Build update
	update := bson.M{}
	if req.Name != "" {
		update["name"] = req.Name
	}
	if req.IsDefault != nil {
		// If setting as default, unset other defaults first
		if *req.IsDefault {
			_, err = h.signatureCollection.UpdateMany(ctx,
				bson.M{"user_id": user.ID},
				bson.M{"$set": bson.M{"is_default": false}},
			)
			if err != nil {
				helpers.SendInternalError(c, err)
				return
			}
		}
		update["is_default"] = *req.IsDefault
	}

	if len(update) == 0 {
		helpers.SendBadRequest(c, "No fields to update")
		return
	}

	update["updated_at"] = signature.UpdatedAt

	// Update signature
	result, err := h.signatureCollection.UpdateOne(ctx,
		bson.M{"_id": signatureID},
		bson.M{"$set": update},
	)
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	if result.MatchedCount == 0 {
		helpers.SendNotFound(c, "Signature not found")
		return
	}

	// Fetch updated signature
	err = h.signatureCollection.FindOne(ctx, bson.M{"_id": signatureID}).Decode(&signature)
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Signature updated successfully",
		"data":    signature.ToResponse(),
	})
}

// DeleteSignature deletes a signature
// DELETE /api/users/me/signatures/:id
func (h *UserSignatureHandler) DeleteSignature(c *gin.Context) {
	signatureID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		helpers.SendBadRequest(c, "Invalid signature ID format")
		return
	}

	// Get current user
	user, exists := middleware.GetCurrentUser(c)
	if !exists {
		helpers.SendUnauthorized(c, "User not found in context", "UNAUTHORIZED")
		return
	}

	ctx := c.Request.Context()

	// Check if signature exists and belongs to user
	var signature models.UserSignature
	err = h.signatureCollection.FindOne(ctx, bson.M{
		"_id":     signatureID,
		"user_id": user.ID,
	}).Decode(&signature)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			helpers.SendNotFound(c, "Signature not found")
			return
		}
		helpers.SendInternalError(c, err)
		return
	}

	// Delete signature
	result, err := h.signatureCollection.DeleteOne(ctx, bson.M{"_id": signatureID})
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	if result.DeletedCount == 0 {
		helpers.SendNotFound(c, "Signature not found")
		return
	}

	// If deleted signature was default, set another as default
	if signature.IsDefault {
		h.setFirstAsDefault(ctx, user.ID)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Signature deleted successfully",
	})
}

// GetDefaultSignature gets the user's default signature
// GET /api/users/me/signatures/default
func (h *UserSignatureHandler) GetDefaultSignature(c *gin.Context) {
	// Get current user
	user, exists := middleware.GetCurrentUser(c)
	if !exists {
		helpers.SendUnauthorized(c, "User not found in context", "UNAUTHORIZED")
		return
	}

	ctx := c.Request.Context()

	// Find default signature
	var signature models.UserSignature
	err := h.signatureCollection.FindOne(ctx, bson.M{
		"user_id":    user.ID,
		"is_default": true,
	}).Decode(&signature)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			helpers.SendNotFound(c, "No default signature found")
			return
		}
		helpers.SendInternalError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Default signature retrieved successfully",
		"data":    signature.ToResponse(),
	})
}

// setFirstAsDefault sets the first signature as default if no default exists
func (h *UserSignatureHandler) setFirstAsDefault(ctx context.Context, userID primitive.ObjectID) {
	var signature models.UserSignature
	err := h.signatureCollection.FindOne(ctx, bson.M{"user_id": userID}).Decode(&signature)
	if err == nil {
		h.signatureCollection.UpdateOne(ctx,
			bson.M{"_id": signature.ID},
			bson.M{"$set": bson.M{"is_default": true}},
		)
	}
}
