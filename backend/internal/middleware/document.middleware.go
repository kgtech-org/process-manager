package middleware

import (
	"context"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kodesonik/process-manager/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type DocumentMiddleware struct {
	documentCollection   *mongo.Collection
	invitationCollection *mongo.Collection
}

func NewDocumentMiddleware(db *mongo.Database) *DocumentMiddleware {
	return &DocumentMiddleware{
		documentCollection:   db.Collection("documents"),
		invitationCollection: db.Collection("invitations"),
	}
}

// RequireDocumentAccess checks if the user has permission to access a document
// Users can access a document if:
// 1. They are the document creator
// 2. They are an admin
// 3. They have been invited to the document (with accepted invitation)
// 4. They are a contributor (author, verifier, or validator)
func (m *DocumentMiddleware) RequireDocumentAccess() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get current user
		user, exists := GetCurrentUser(c)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"message": "User not found in context",
				"code":    "UNAUTHORIZED",
			})
			c.Abort()
			return
		}

		// Get document ID from URL parameter
		docIDParam := c.Param("id")
		docID, err := primitive.ObjectIDFromHex(docIDParam)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "Invalid document ID format",
				"code":    "INVALID_ID",
			})
			c.Abort()
			return
		}

		// Admin users have access to all documents
		if user.Role == models.RoleAdmin {
			c.Next()
			return
		}

		ctx := c.Request.Context()

		// Check if user is the document creator
		isCreator, err := m.isDocumentCreator(ctx, docID, user.ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "Failed to verify document access",
				"code":    "INTERNAL_ERROR",
			})
			c.Abort()
			return
		}

		if isCreator {
			c.Next()
			return
		}

		// Check if user is a contributor
		isContributor, err := m.isDocumentContributor(ctx, docID, user.ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "Failed to verify document access",
				"code":    "INTERNAL_ERROR",
			})
			c.Abort()
			return
		}

		if isContributor {
			c.Next()
			return
		}

		// Check if user has an accepted invitation
		hasInvitation, err := m.hasAcceptedInvitation(ctx, docID, user.ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "Failed to verify document access",
				"code":    "INTERNAL_ERROR",
			})
			c.Abort()
			return
		}

		if hasInvitation {
			c.Next()
			return
		}

		// Log unauthorized access attempt
		fmt.Printf("Unauthorized document access attempt - User: %s, Document: %s\n", user.ID.Hex(), docID.Hex())

		// User doesn't have access
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"message": "You do not have permission to access this document",
			"code":    "FORBIDDEN",
		})
		c.Abort()
	}
}

// isDocumentCreator checks if the user is the creator of the document
func (m *DocumentMiddleware) isDocumentCreator(ctx context.Context, docID, userID primitive.ObjectID) (bool, error) {
	var document models.Document
	err := m.documentCollection.FindOne(ctx, bson.M{
		"_id":        docID,
		"created_by": userID,
	}).Decode(&document)

	if err != nil {
		if err == mongo.ErrNoDocuments {
			return false, nil
		}
		return false, err
	}

	return true, nil
}

// isDocumentContributor checks if the user is listed as a contributor in the document
func (m *DocumentMiddleware) isDocumentContributor(ctx context.Context, docID, userID primitive.ObjectID) (bool, error) {
	var document models.Document
	err := m.documentCollection.FindOne(ctx, bson.M{
		"_id": docID,
		"$or": []bson.M{
			{"contributors.authors.user_id": userID},
			{"contributors.verifiers.user_id": userID},
			{"contributors.validators.user_id": userID},
		},
	}).Decode(&document)

	if err != nil {
		if err == mongo.ErrNoDocuments {
			return false, nil
		}
		return false, err
	}

	return true, nil
}

// hasAcceptedInvitation checks if the user has an accepted invitation to the document
func (m *DocumentMiddleware) hasAcceptedInvitation(ctx context.Context, docID, userID primitive.ObjectID) (bool, error) {
	var invitation models.Invitation
	err := m.invitationCollection.FindOne(ctx, bson.M{
		"document_id":     docID,
		"invited_user_id": userID,
		"status":          models.InvitationStatusAccepted,
	}).Decode(&invitation)

	if err != nil {
		if err == mongo.ErrNoDocuments {
			return false, nil
		}
		return false, err
	}

	return true, nil
}
