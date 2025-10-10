package handlers

import (
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

// GetSignature retrieves the user's signature
// GET /api/users/me/signature
func (h *UserSignatureHandler) GetSignature(c *gin.Context) {
	// Get current user
	user, exists := middleware.GetCurrentUser(c)
	if !exists {
		helpers.SendUnauthorized(c, "User not found in context", "UNAUTHORIZED")
		return
	}

	ctx := c.Request.Context()

	// Find user's signature
	var signature models.UserSignature
	err := h.signatureCollection.FindOne(ctx, bson.M{"user_id": user.ID}).Decode(&signature)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"message": "No signature found",
				"data":    nil,
			})
			return
		}
		helpers.SendInternalError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Signature retrieved successfully",
		"data":    signature.ToResponse(),
	})
}

// CreateOrUpdateSignature creates or updates the user's signature (only one allowed)
// POST /api/users/me/signature
func (h *UserSignatureHandler) CreateOrUpdateSignature(c *gin.Context) {
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

	// Check if user already has a signature (only one allowed)
	var existingSignature models.UserSignature
	err := h.signatureCollection.FindOne(ctx, bson.M{"user_id": user.ID}).Decode(&existingSignature)

	if err == nil {
		// User already has a signature, update it
		existingSignature.Type = req.Type
		existingSignature.Data = req.Data
		existingSignature.Font = req.Font
		existingSignature.BeforeUpdate()

		_, err := h.signatureCollection.UpdateOne(
			ctx,
			bson.M{"_id": existingSignature.ID},
			bson.M{"$set": bson.M{
				"type":       existingSignature.Type,
				"data":       existingSignature.Data,
				"font":       existingSignature.Font,
				"updated_at": existingSignature.UpdatedAt,
			}},
		)
		if err != nil {
			helpers.SendInternalError(c, err)
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "Signature updated successfully",
			"data":    existingSignature.ToResponse(),
		})
		return
	} else if err != mongo.ErrNoDocuments {
		helpers.SendInternalError(c, err)
		return
	}

	// Create new signature (first time)
	signature := &models.UserSignature{
		UserID: user.ID,
		Type:   req.Type,
		Data:   req.Data,
		Font:   req.Font,
	}
	signature.BeforeCreate()

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

// DeleteSignature deletes the user's signature
// DELETE /api/users/me/signature
func (h *UserSignatureHandler) DeleteSignature(c *gin.Context) {
	// Get current user
	user, exists := middleware.GetCurrentUser(c)
	if !exists {
		helpers.SendUnauthorized(c, "User not found in context", "UNAUTHORIZED")
		return
	}

	ctx := c.Request.Context()

	// Delete the signature
	result, err := h.signatureCollection.DeleteOne(ctx, bson.M{"user_id": user.ID})
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	if result.DeletedCount == 0 {
		helpers.SendNotFound(c, "Signature not found")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Signature deleted successfully",
		"data":    nil,
	})
}
