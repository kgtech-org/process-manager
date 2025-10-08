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

type PermissionHandler struct {
	permissionCollection *mongo.Collection
	documentCollection   *mongo.Collection
	userCollection       *mongo.Collection
}

func NewPermissionHandler(db *mongo.Database) *PermissionHandler {
	return &PermissionHandler{
		permissionCollection: db.Collection("permissions"),
		documentCollection:   db.Collection("documents"),
		userCollection:       db.Collection("users"),
	}
}

// GetDocumentPermissions retrieves all permissions for a document
// GET /api/documents/:id/permissions
func (h *PermissionHandler) GetDocumentPermissions(c *gin.Context) {
	user, exists := middleware.GetCurrentUser(c)
	if !exists {
		helpers.SendUnauthorized(c, "User not found in context", "UNAUTHORIZED")
		return
	}

	idParam := c.Param("id")
	documentID, err := primitive.ObjectIDFromHex(idParam)
	if err != nil {
		helpers.SendBadRequest(c, "Invalid document ID format")
		return
	}

	ctx := c.Request.Context()

	// Check if document exists
	var document models.Document
	err = h.documentCollection.FindOne(ctx, bson.M{"_id": documentID}).Decode(&document)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			helpers.SendNotFound(c, "Document not found")
			return
		}
		helpers.SendInternalError(c, err)
		return
	}

	// Only document creator or users with admin permission can view permissions
	if document.CreatedBy != user.ID {
		var userPermission models.Permission
		err = h.permissionCollection.FindOne(ctx, bson.M{
			"document_id": documentID,
			"user_id":     user.ID,
			"level":       models.PermissionLevelAdmin,
		}).Decode(&userPermission)
		if err != nil {
			helpers.SendForbidden(c, "You don't have permission to view document permissions", "FORBIDDEN")
			return
		}
	}

	// Find all permissions for this document
	cursor, err := h.permissionCollection.Find(ctx, bson.M{"document_id": documentID})
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}
	defer cursor.Close(ctx)

	var permissions []models.Permission
	if err = cursor.All(ctx, &permissions); err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	// Convert to responses and enrich with user data
	responses := make([]models.PermissionResponse, 0, len(permissions))
	for _, perm := range permissions {
		response := perm.ToResponse()

		// Fetch user details
		var user models.User
		if err := h.userCollection.FindOne(ctx, bson.M{"_id": perm.UserID}).Decode(&user); err == nil {
			response.UserName = user.Name
			response.UserEmail = user.Email
		}

		// Fetch granter details
		var granter models.User
		if err := h.userCollection.FindOne(ctx, bson.M{"_id": perm.GrantedBy}).Decode(&granter); err == nil {
			response.GrantedByName = granter.Name
		}

		responses = append(responses, response)
	}

	helpers.SendSuccess(c, "Permissions retrieved successfully", responses)
}

// AddDocumentPermission adds a permission to a document
// POST /api/documents/:id/permissions
func (h *PermissionHandler) AddDocumentPermission(c *gin.Context) {
	user, exists := middleware.GetCurrentUser(c)
	if !exists {
		helpers.SendUnauthorized(c, "User not found in context", "UNAUTHORIZED")
		return
	}

	idParam := c.Param("id")
	documentID, err := primitive.ObjectIDFromHex(idParam)
	if err != nil {
		helpers.SendBadRequest(c, "Invalid document ID format")
		return
	}

	var req models.CreatePermissionRequest
	if err := helpers.BindAndValidate(c, &req); err != nil {
		helpers.SendValidationErrors(c, err)
		return
	}

	// Validate permission level
	if !models.IsValidPermissionLevel(req.Level) {
		helpers.SendBadRequest(c, "Invalid permission level")
		return
	}

	// Validate user ID
	targetUserID, err := primitive.ObjectIDFromHex(req.UserID)
	if err != nil {
		helpers.SendBadRequest(c, "Invalid user ID format")
		return
	}

	ctx := c.Request.Context()

	// Check if document exists
	var document models.Document
	err = h.documentCollection.FindOne(ctx, bson.M{"_id": documentID}).Decode(&document)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			helpers.SendNotFound(c, "Document not found")
			return
		}
		helpers.SendInternalError(c, err)
		return
	}

	// Only document creator or users with admin permission can add permissions
	if document.CreatedBy != user.ID {
		var userPermission models.Permission
		err = h.permissionCollection.FindOne(ctx, bson.M{
			"document_id": documentID,
			"user_id":     user.ID,
			"level":       models.PermissionLevelAdmin,
		}).Decode(&userPermission)
		if err != nil {
			helpers.SendForbidden(c, "You don't have permission to manage document permissions", "FORBIDDEN")
			return
		}
	}

	// Check if target user exists
	var targetUser models.User
	err = h.userCollection.FindOne(ctx, bson.M{"_id": targetUserID}).Decode(&targetUser)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			helpers.SendNotFound(c, "User not found")
			return
		}
		helpers.SendInternalError(c, err)
		return
	}

	// Check if permission already exists
	var existingPermission models.Permission
	err = h.permissionCollection.FindOne(ctx, bson.M{
		"document_id": documentID,
		"user_id":     targetUserID,
	}).Decode(&existingPermission)
	if err == nil {
		helpers.SendBadRequest(c, "Permission already exists for this user")
		return
	}

	// Create permission
	permission := &models.Permission{
		DocumentID: documentID,
		UserID:     targetUserID,
		Level:      req.Level,
		GrantedBy:  user.ID,
	}
	permission.BeforeCreate()

	result, err := h.permissionCollection.InsertOne(ctx, permission)
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}
	permission.ID = result.InsertedID.(primitive.ObjectID)

	response := permission.ToResponse()
	response.UserName = targetUser.Name
	response.UserEmail = targetUser.Email
	response.GrantedByName = user.Name

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Permission added successfully",
		"data":    response,
	})
}

// UpdateDocumentPermission updates a permission on a document
// PUT /api/documents/:id/permissions/:userId
func (h *PermissionHandler) UpdateDocumentPermission(c *gin.Context) {
	user, exists := middleware.GetCurrentUser(c)
	if !exists {
		helpers.SendUnauthorized(c, "User not found in context", "UNAUTHORIZED")
		return
	}

	idParam := c.Param("id")
	documentID, err := primitive.ObjectIDFromHex(idParam)
	if err != nil {
		helpers.SendBadRequest(c, "Invalid document ID format")
		return
	}

	userIDParam := c.Param("userId")
	targetUserID, err := primitive.ObjectIDFromHex(userIDParam)
	if err != nil {
		helpers.SendBadRequest(c, "Invalid user ID format")
		return
	}

	var req models.UpdatePermissionRequest
	if err := helpers.BindAndValidate(c, &req); err != nil {
		helpers.SendValidationErrors(c, err)
		return
	}

	// Validate permission level
	if !models.IsValidPermissionLevel(req.Level) {
		helpers.SendBadRequest(c, "Invalid permission level")
		return
	}

	ctx := c.Request.Context()

	// Check if document exists
	var document models.Document
	err = h.documentCollection.FindOne(ctx, bson.M{"_id": documentID}).Decode(&document)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			helpers.SendNotFound(c, "Document not found")
			return
		}
		helpers.SendInternalError(c, err)
		return
	}

	// Only document creator or users with admin permission can update permissions
	if document.CreatedBy != user.ID {
		var userPermission models.Permission
		err = h.permissionCollection.FindOne(ctx, bson.M{
			"document_id": documentID,
			"user_id":     user.ID,
			"level":       models.PermissionLevelAdmin,
		}).Decode(&userPermission)
		if err != nil {
			helpers.SendForbidden(c, "You don't have permission to manage document permissions", "FORBIDDEN")
			return
		}
	}

	// Find existing permission
	var permission models.Permission
	err = h.permissionCollection.FindOne(ctx, bson.M{
		"document_id": documentID,
		"user_id":     targetUserID,
	}).Decode(&permission)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			helpers.SendNotFound(c, "Permission not found")
			return
		}
		helpers.SendInternalError(c, err)
		return
	}

	// Update permission
	permission.Level = req.Level
	permission.BeforeUpdate()

	_, err = h.permissionCollection.UpdateOne(ctx,
		bson.M{
			"document_id": documentID,
			"user_id":     targetUserID,
		},
		bson.M{"$set": bson.M{
			"level":      req.Level,
			"updated_at": permission.UpdatedAt,
		}},
	)
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	helpers.SendSuccess(c, "Permission updated successfully", permission.ToResponse())
}

// DeleteDocumentPermission removes a permission from a document
// DELETE /api/documents/:id/permissions/:userId
func (h *PermissionHandler) DeleteDocumentPermission(c *gin.Context) {
	user, exists := middleware.GetCurrentUser(c)
	if !exists {
		helpers.SendUnauthorized(c, "User not found in context", "UNAUTHORIZED")
		return
	}

	idParam := c.Param("id")
	documentID, err := primitive.ObjectIDFromHex(idParam)
	if err != nil {
		helpers.SendBadRequest(c, "Invalid document ID format")
		return
	}

	userIDParam := c.Param("userId")
	targetUserID, err := primitive.ObjectIDFromHex(userIDParam)
	if err != nil {
		helpers.SendBadRequest(c, "Invalid user ID format")
		return
	}

	ctx := c.Request.Context()

	// Check if document exists
	var document models.Document
	err = h.documentCollection.FindOne(ctx, bson.M{"_id": documentID}).Decode(&document)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			helpers.SendNotFound(c, "Document not found")
			return
		}
		helpers.SendInternalError(c, err)
		return
	}

	// Only document creator or users with admin permission can delete permissions
	if document.CreatedBy != user.ID {
		var userPermission models.Permission
		err = h.permissionCollection.FindOne(ctx, bson.M{
			"document_id": documentID,
			"user_id":     user.ID,
			"level":       models.PermissionLevelAdmin,
		}).Decode(&userPermission)
		if err != nil {
			helpers.SendForbidden(c, "You don't have permission to manage document permissions", "FORBIDDEN")
			return
		}
	}

	// Delete permission
	result, err := h.permissionCollection.DeleteOne(ctx, bson.M{
		"document_id": documentID,
		"user_id":     targetUserID,
	})
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	if result.DeletedCount == 0 {
		helpers.SendNotFound(c, "Permission not found")
		return
	}

	helpers.SendSuccess(c, "Permission deleted successfully", nil)
}

// CheckPermission checks if a user has a specific permission on a document
func (h *PermissionHandler) CheckPermission(ctx context.Context, documentID primitive.ObjectID, userID primitive.ObjectID, requiredLevel models.PermissionLevel) bool {
	var permission models.Permission
	err := h.permissionCollection.FindOne(ctx, bson.M{
		"document_id": documentID,
		"user_id":     userID,
	}).Decode(&permission)
	if err != nil {
		return false
	}

	switch requiredLevel {
	case models.PermissionLevelRead:
		return permission.CanRead()
	case models.PermissionLevelWrite:
		return permission.CanWrite()
	case models.PermissionLevelSign:
		return permission.CanSign()
	case models.PermissionLevelAdmin:
		return permission.CanAdmin()
	default:
		return false
	}
}
