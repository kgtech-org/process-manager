package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kodesonik/process-manager/internal/helpers"
	"github.com/kodesonik/process-manager/internal/middleware"
	"github.com/kodesonik/process-manager/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type SignatureHandler struct {
	signatureCollection *mongo.Collection
	documentCollection  *mongo.Collection
	versionCollection   *mongo.Collection
	userCollection      *mongo.Collection
}

func NewSignatureHandler(db *mongo.Database) *SignatureHandler {
	return &SignatureHandler{
		signatureCollection: db.Collection("signatures"),
		documentCollection:  db.Collection("documents"),
		versionCollection:   db.Collection("document_versions"),
		userCollection:      db.Collection("users"),
	}
}

// GetDocumentSignatures retrieves all signatures for a document
// GET /api/documents/:id/signatures
func (h *SignatureHandler) GetDocumentSignatures(c *gin.Context) {
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

	// Find all signatures for this document
	cursor, err := h.signatureCollection.Find(ctx, bson.M{"document_id": documentID})
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}
	defer cursor.Close(ctx)

	var signatures []models.Signature
	if err = cursor.All(ctx, &signatures); err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	// Convert to responses and enrich with user data
	responses := make([]models.SignatureResponse, 0, len(signatures))
	for _, sig := range signatures {
		response := sig.ToResponse()

		// Fetch user details
		var user models.User
		if err := h.userCollection.FindOne(ctx, bson.M{"_id": sig.UserID}).Decode(&user); err == nil {
			response.UserName = user.FirstName + " " + user.LastName
			response.UserEmail = user.Email
		}

		responses = append(responses, response)
	}

	helpers.SendSuccess(c, "Signatures retrieved successfully", responses)
}

// AddDocumentSignature adds a digital signature to a document
// POST /api/documents/:id/signatures
func (h *SignatureHandler) AddDocumentSignature(c *gin.Context) {
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

	var req models.CreateSignatureRequest
	if err := helpers.BindAndValidate(c, &req); err != nil {
		helpers.SendValidationErrors(c, err)
		return
	}

	// Validate signature type
	if !models.IsValidSignatureType(req.Type) {
		helpers.SendBadRequest(c, "Invalid signature type")
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

	// Check if user is a contributor of the appropriate team
	isAuthorized := false
	var contributorTeam models.ContributorTeam

	switch req.Type {
	case models.SignatureTypeAuthor:
		contributorTeam = models.ContributorTeamAuthors
		for _, author := range document.Contributors.Authors {
			if author.UserID == user.ID {
				isAuthorized = true
				break
			}
		}
	case models.SignatureTypeVerifier:
		contributorTeam = models.ContributorTeamVerifiers
		for _, verifier := range document.Contributors.Verifiers {
			if verifier.UserID == user.ID {
				isAuthorized = true
				break
			}
		}
	case models.SignatureTypeValidator:
		contributorTeam = models.ContributorTeamValidators
		for _, validator := range document.Contributors.Validators {
			if validator.UserID == user.ID {
				isAuthorized = true
				break
			}
		}
	}

	if !isAuthorized {
		helpers.SendForbidden(c, "You are not authorized to sign this document as "+string(req.Type), "FORBIDDEN")
		return
	}

	// Check if user has already signed
	var existingSignature models.Signature
	err = h.signatureCollection.FindOne(ctx, bson.M{
		"document_id": documentID,
		"user_id":     user.ID,
		"type":        req.Type,
	}).Decode(&existingSignature)
	if err == nil {
		helpers.SendBadRequest(c, "You have already signed this document")
		return
	}

	// Get client info
	ipAddress := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")

	// Create signature
	signature := &models.Signature{
		DocumentID:    documentID,
		UserID:        user.ID,
		Type:          req.Type,
		SignatureData: req.SignatureData,
		Comments:      req.Comments,
		IPAddress:     ipAddress,
		UserAgent:     userAgent,
	}
	signature.BeforeCreate()

	result, err := h.signatureCollection.InsertOne(ctx, signature)
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}
	signature.ID = result.InsertedID.(primitive.ObjectID)

	// Update contributor status in document
	now := time.Now()

	// Get the appropriate contributors array
	var contributors []models.Contributor
	switch contributorTeam {
	case models.ContributorTeamAuthors:
		contributors = document.Contributors.Authors
	case models.ContributorTeamVerifiers:
		contributors = document.Contributors.Verifiers
	case models.ContributorTeamValidators:
		contributors = document.Contributors.Validators
	}

	// Update the contributor status
	for i, contrib := range contributors {
		if contrib.UserID == user.ID {
			contributors[i].Status = models.SignatureStatusSigned
			contributors[i].SignatureDate = &now
			break
		}
	}

	// Update document with new contributor status
	var updateDoc bson.M
	switch contributorTeam {
	case models.ContributorTeamAuthors:
		updateDoc = bson.M{"contributors.authors": contributors}
	case models.ContributorTeamVerifiers:
		updateDoc = bson.M{"contributors.verifiers": contributors}
	case models.ContributorTeamValidators:
		updateDoc = bson.M{"contributors.validators": contributors}
	}

	_, err = h.documentCollection.UpdateOne(ctx,
		bson.M{"_id": documentID},
		bson.M{"$set": updateDoc},
	)
	if err != nil {
		// Don't fail the signature creation if contributor update fails
		// Just log the error
		println("Warning: Failed to update contributor status:", err.Error())
	}

	// Check if all signatures are complete and update document status if needed
	h.updateDocumentStatus(ctx, documentID)

	response := signature.ToResponse()
	response.UserName = user.FirstName + " " + user.LastName
	response.UserEmail = user.Email

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Signature added successfully",
		"data":    response,
	})
}

// updateDocumentStatus updates the document status based on signatures
// Implements automatic workflow transitions for Issue #47
func (h *SignatureHandler) updateDocumentStatus(ctx context.Context, documentID primitive.ObjectID) {
	// Get document
	var document models.Document
	err := h.documentCollection.FindOne(ctx, bson.M{"_id": documentID}).Decode(&document)
	if err != nil {
		return
	}

	// Count signatures by type
	authorSigs, _ := h.signatureCollection.CountDocuments(ctx, bson.M{
		"document_id": documentID,
		"type":        models.SignatureTypeAuthor,
	})
	verifierSigs, _ := h.signatureCollection.CountDocuments(ctx, bson.M{
		"document_id": documentID,
		"type":        models.SignatureTypeVerifier,
	})
	validatorSigs, _ := h.signatureCollection.CountDocuments(ctx, bson.M{
		"document_id": documentID,
		"type":        models.SignatureTypeValidator,
	})

	// Count required signatures
	authorsCount := len(document.Contributors.Authors)
	verifiersCount := len(document.Contributors.Verifiers)
	validatorsCount := len(document.Contributors.Validators)

	// Determine new status based on current status and signature completion
	var newStatus models.DocumentStatus
	shouldUpdate := false

	switch document.Status {
	case models.DocumentStatusAuthorReview:
		// All authors have signed -> automatically transition to verifier_signed or verifier_review
		if authorSigs >= int64(authorsCount) && authorsCount > 0 {
			if verifiersCount > 0 {
				newStatus = models.DocumentStatusVerifierReview
				// Set verifiers to pending
				for i := range document.Contributors.Verifiers {
					if document.Contributors.Verifiers[i].Status == models.SignatureStatusJoined {
						document.Contributors.Verifiers[i].Status = models.SignatureStatusPending
					}
				}
			} else {
				// No verifiers, go straight to author_signed
				newStatus = models.DocumentStatusAuthorSigned
			}
			shouldUpdate = true
		}

	case models.DocumentStatusVerifierReview:
		// All verifiers have signed -> automatically transition to validator_signed or validator_review
		if verifierSigs >= int64(verifiersCount) && verifiersCount > 0 {
			if validatorsCount > 0 {
				newStatus = models.DocumentStatusValidatorReview
				// Set validators to pending
				for i := range document.Contributors.Validators {
					if document.Contributors.Validators[i].Status == models.SignatureStatusJoined {
						document.Contributors.Validators[i].Status = models.SignatureStatusPending
					}
				}
			} else {
				// No validators, go straight to verifier_signed
				newStatus = models.DocumentStatusVerifierSigned
			}
			shouldUpdate = true
		}

	case models.DocumentStatusValidatorReview:
		// All validators have signed -> approve document
		if validatorSigs >= int64(validatorsCount) && validatorsCount > 0 {
			newStatus = models.DocumentStatusApproved
			shouldUpdate = true
		}
	}

	// Update document status if needed
	if shouldUpdate {
		updateDoc := bson.M{
			"status": newStatus,
		}

		// Update contributor arrays if they were modified
		if newStatus == models.DocumentStatusVerifierReview || newStatus == models.DocumentStatusValidatorReview {
			if newStatus == models.DocumentStatusVerifierReview {
				updateDoc["contributors.verifiers"] = document.Contributors.Verifiers
			} else {
				updateDoc["contributors.validators"] = document.Contributors.Validators
			}
		}

		// Set approved_at timestamp if document is approved
		if newStatus == models.DocumentStatusApproved {
			updateDoc["approved_at"] = time.Now()

			// Create immutable version snapshot when document is approved
			err = h.createVersionSnapshot(ctx, &document, "Approved version snapshot")
			if err != nil {
				println("Warning: Failed to create version snapshot:", err.Error())
			}
		}

		_, err = h.documentCollection.UpdateOne(ctx,
			bson.M{"_id": documentID},
			bson.M{"$set": updateDoc},
		)
		if err != nil {
			println("Warning: Failed to update document status:", err.Error())
		}
	}
}

// createVersionSnapshot creates an immutable snapshot of the document
func (h *SignatureHandler) createVersionSnapshot(ctx context.Context, document *models.Document, changeNote string) error {
	version := &models.DocumentVersion{
		ID:         primitive.NewObjectID(),
		DocumentID: document.ID,
		Version:    document.Version,
		Data:       *document,
		CreatedBy:  document.CreatedBy,
		CreatedAt:  time.Now(),
		ChangeNote: changeNote,
	}

	_, err := h.versionCollection.InsertOne(ctx, version)
	if err != nil {
		return err
	}

	return nil
}
