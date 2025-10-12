package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kodesonik/process-manager/internal/helpers"
	"github.com/kodesonik/process-manager/internal/middleware"
	"github.com/kodesonik/process-manager/internal/models"
	"github.com/kodesonik/process-manager/internal/services"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type InvitationHandler struct {
	invitationCollection *mongo.Collection
	documentCollection   *mongo.Collection
	userCollection       *mongo.Collection
	emailService         *services.EmailService
	notificationService  *services.NotificationService
	activityLogService   *services.ActivityLogService
}

func NewInvitationHandler(
	db *mongo.Database,
	emailService *services.EmailService,
	notificationService *services.NotificationService,
	activityLogService *services.ActivityLogService,
) *InvitationHandler {
	return &InvitationHandler{
		invitationCollection: db.Collection("invitations"),
		documentCollection:   db.Collection("documents"),
		userCollection:       db.Collection("users"),
		emailService:         emailService,
		notificationService:  notificationService,
		activityLogService:   activityLogService,
	}
}

// generateInvitationToken generates a secure random token
func generateInvitationToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// CreateInvitation sends an invitation to collaborate on a document
// POST /api/invitations
func (h *InvitationHandler) CreateInvitation(c *gin.Context) {
	var req models.CreateInvitationRequest
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

	// Validate document ID
	documentID, err := primitive.ObjectIDFromHex(req.DocumentID)
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

	// Validate invitation type and team
	if !models.IsValidInvitationType(req.Type) {
		helpers.SendBadRequest(c, "Invalid invitation type")
		return
	}
	if !models.IsValidTeam(req.Team) {
		helpers.SendBadRequest(c, "Invalid team")
		return
	}

	// Check if user already has a pending invitation
	var existingInvitation models.Invitation
	err = h.invitationCollection.FindOne(ctx, bson.M{
		"document_id":    documentID,
		"invitee_email":  req.InvitedEmail,
		"status":         models.InvitationStatusPending,
	}).Decode(&existingInvitation)
	if err == nil {
		helpers.SendBadRequest(c, "User already has a pending invitation for this document")
		return
	}

	// Check if user exists
	var invitedUser models.User
	var invitedUserID *primitive.ObjectID
	err = h.userCollection.FindOne(ctx, bson.M{"email": req.InvitedEmail}).Decode(&invitedUser)
	if err == nil {
		invitedUserID = &invitedUser.ID
	}

	// Generate invitation token
	token, err := generateInvitationToken()
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	// Create invitation
	fmt.Printf("📬 [INVITATION] Creating new invitation:\n")
	fmt.Printf("   - Document: %s (%s)\n", document.Title, document.Reference)
	fmt.Printf("   - Invited Email: %s\n", req.InvitedEmail)
	fmt.Printf("   - Invited By: %s %s (%s)\n", user.FirstName, user.LastName, user.ID.Hex())
	fmt.Printf("   - Team: %s\n", req.Team)
	fmt.Printf("   - Type: %s\n", req.Type)
	fmt.Printf("   - User Exists: %v\n", invitedUserID != nil)

	invitation := &models.Invitation{
		DocumentID:    documentID,
		InvitedBy:     user.ID,
		InvitedEmail:  req.InvitedEmail,
		InvitedUserID: invitedUserID,
		Token:         token,
		Type:          req.Type,
		Team:          req.Team,
		Message:       req.Message,
	}
	invitation.BeforeCreate()

	result, err := h.invitationCollection.InsertOne(ctx, invitation)
	if err != nil {
		fmt.Printf("❌ [INVITATION] Failed to create invitation in database: %v\n", err)
		helpers.SendInternalError(c, err)
		return
	}
	invitation.ID = result.InsertedID.(primitive.ObjectID)
	fmt.Printf("✅ [INVITATION] Invitation created in database - ID: %s\n", invitation.ID.Hex())

	// Send invitation email
	invitedUserName := req.InvitedEmail
	if invitedUserID != nil {
		invitedUserName = invitedUser.FirstName + " " + invitedUser.LastName
	}

	teamName := string(req.Team)
	if req.Team == models.ContributorTeamAuthors {
		teamName = "Authors"
	} else if req.Team == models.ContributorTeamVerifiers {
		teamName = "Verifiers"
	} else if req.Team == models.ContributorTeamValidators {
		teamName = "Validators"
	}

	err = h.emailService.SendInvitationEmail(
		req.InvitedEmail,
		invitedUserName,
		user.FirstName + " " + user.LastName,
		document.Title,
		document.Reference,
		teamName,
		token,
	)
	if err != nil {
		fmt.Printf("Failed to send invitation email: %v\n", err)
		// Don't fail the request if email fails
	}

	// Send push notification if user exists
	if invitedUserID != nil {
		fmt.Printf("📱 [INVITATION] Sending push notification to existing user %s\n", invitedUserID.Hex())
		notifTitle := fmt.Sprintf("Document Invitation from %s %s", user.FirstName, user.LastName)
		notifBody := fmt.Sprintf("You have been invited to collaborate on '%s' as a %s", document.Title, teamName)

		notifReq := &models.SendNotificationRequest{
			UserIDs:  []string{invitedUserID.Hex()},
			Title:    notifTitle,
			Body:     notifBody,
			Category: models.NotificationCategorySystem,
			Priority: models.NotificationPriorityHigh,
			Data: map[string]interface{}{
				"type":       "invitation",
				"documentId": documentID.Hex(),
				"team":       string(req.Team),
			},
		}

		_, notifErr := h.notificationService.SendNotification(ctx, notifReq, user.ID)
		if notifErr != nil {
			fmt.Printf("❌ [INVITATION] Failed to send push notification: %v\n", notifErr)
		} else {
			fmt.Printf("✅ [INVITATION] Push notification sent successfully\n")
		}
	} else {
		fmt.Printf("ℹ️  [INVITATION] Skipping push notification - user does not exist in system yet\n")
	}

	// Log activity
	activityDescription := fmt.Sprintf("Invited %s to collaborate on document '%s' (%s) as %s",
		req.InvitedEmail, document.Title, document.Reference, teamName)
	activityReq := models.ActivityLogRequest{
		Action:       "document_invitation_sent",
		Description:  activityDescription,
		ResourceType: "document",
		ResourceID:   &documentID,
		Success:      true,
		Details: map[string]interface{}{
			"documentId":     documentID.Hex(),
			"invitedEmail":   req.InvitedEmail,
			"team":           string(req.Team),
			"invitationType": string(req.Type),
			"invitationId":   invitation.ID.Hex(),
		},
	}
	if invitedUserID != nil {
		activityReq.TargetUserID = invitedUserID
	}
	logErr := h.activityLogService.LogActivity(ctx, activityReq, c)
	if logErr != nil {
		fmt.Printf("⚠️  [INVITATION] Failed to log activity: %v\n", logErr)
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Invitation sent successfully",
		"data":    invitation.ToResponse(),
	})
}

// ListInvitations retrieves invitations
// GET /api/invitations
func (h *InvitationHandler) ListInvitations(c *gin.Context) {
	user, exists := middleware.GetCurrentUser(c)
	if !exists {
		helpers.SendUnauthorized(c, "User not found in context", "UNAUTHORIZED")
		return
	}

	ctx := c.Request.Context()

	// Build filter
	filter := bson.M{}

	// Check if filtering for invitations sent TO the current user only
	forMe := c.Query("forMe") == "true"

	if forMe {
		// Only show invitations sent TO the current user
		filter["$or"] = []bson.M{
			{"invitee_email": user.Email},
			{"invited_user_id": user.ID},
		}
	} else {
		// Show invitations sent to or by the current user
		filter["$or"] = []bson.M{
			{"invitee_email": user.Email},
			{"invited_user_id": user.ID},
			{"inviter_id": user.ID},
		}
	}

	// Additional filters
	if documentID := c.Query("documentId"); documentID != "" {
		objID, err := primitive.ObjectIDFromHex(documentID)
		if err == nil {
			filter["document_id"] = objID
		}
	}

	if status := c.Query("status"); status != "" {
		filter["status"] = status
	}

	// Parse pagination
	page := 1
	if pageStr := c.Query("page"); pageStr != "" {
		var p int
		if _, err := fmt.Sscanf(pageStr, "%d", &p); err == nil && p > 0 {
			page = p
		}
	}
	limit := 20
	if limitStr := c.Query("limit"); limitStr != "" {
		var l int
		if _, err := fmt.Sscanf(limitStr, "%d", &l); err == nil && l > 0 {
			limit = l
		}
	}

	// Get total count
	total, err := h.invitationCollection.CountDocuments(ctx, filter)
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	// Find invitations
	cursor, err := h.invitationCollection.Find(ctx, filter)
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}
	defer cursor.Close(ctx)

	var invitations []models.Invitation
	if err = cursor.All(ctx, &invitations); err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	// Convert to responses
	responses := make([]models.InvitationResponse, 0, len(invitations))
	for _, inv := range invitations {
		response := inv.ToResponse()

		// Fetch document title
		var doc models.Document
		if err := h.documentCollection.FindOne(ctx, bson.M{"_id": inv.DocumentID}).Decode(&doc); err == nil {
			response.DocumentTitle = doc.Title
		}

		// Fetch inviter name
		var inviter models.User
		if err := h.userCollection.FindOne(ctx, bson.M{"_id": inv.InvitedBy}).Decode(&inviter); err == nil {
			response.InvitedByName = inviter.FirstName + " " + inviter.LastName
		}

		responses = append(responses, response)
	}

	// Calculate pagination info
	totalPages := (int(total) + limit - 1) / limit

	helpers.SendSuccessWithPagination(c, "Invitations retrieved successfully", responses, helpers.PaginationInfo{
		Page:       page,
		Limit:      limit,
		Total:      int(total),
		TotalPages: totalPages,
	})
}

// AcceptInvitation accepts an invitation
// PUT /api/invitations/:id/accept
func (h *InvitationHandler) AcceptInvitation(c *gin.Context) {
	user, exists := middleware.GetCurrentUser(c)
	if !exists {
		helpers.SendUnauthorized(c, "User not found in context", "UNAUTHORIZED")
		return
	}

	idParam := c.Param("id")
	id, err := primitive.ObjectIDFromHex(idParam)
	if err != nil {
		helpers.SendBadRequest(c, "Invalid invitation ID format")
		return
	}

	ctx := c.Request.Context()

	// Find invitation
	var invitation models.Invitation
	err = h.invitationCollection.FindOne(ctx, bson.M{"_id": id}).Decode(&invitation)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			helpers.SendNotFound(c, "Invitation not found")
			return
		}
		helpers.SendInternalError(c, err)
		return
	}

	// Verify invitation is for this user
	if invitation.InvitedEmail != user.Email {
		helpers.SendForbidden(c, "This invitation is not for you", "FORBIDDEN")
		return
	}

	// Check if invitation can be accepted
	if !invitation.CanAccept() {
		helpers.SendBadRequest(c, "This invitation cannot be accepted (expired or already processed)")
		return
	}

	// Update invitation status
	now := primitive.DateTime(invitation.UpdatedAt.Unix() * 1000)
	_, err = h.invitationCollection.UpdateOne(ctx, bson.M{"_id": id}, bson.M{
		"$set": bson.M{
			"status":         models.InvitationStatusAccepted,
			"accepted_at":    now,
			"invited_user_id": user.ID,
			"updated_at":     now,
		},
	})
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	// Add user to document contributors
	var document models.Document
	err = h.documentCollection.FindOne(ctx, bson.M{"_id": invitation.DocumentID}).Decode(&document)
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	// Create contributor entry
	contributor := models.Contributor{
		UserID:     user.ID,
		Name:       user.FirstName + " " + user.LastName,
		Title:      "", // Can be set later
		Department: "", // Can be set later
		Team:       invitation.Team,
		Status:     models.SignatureStatusPending,
		InvitedAt:  invitation.CreatedAt,
	}

	// Update document contributors based on team
	update := bson.M{}
	switch invitation.Team {
	case models.ContributorTeamAuthors:
		update["$push"] = bson.M{"contributors.authors": contributor}
	case models.ContributorTeamVerifiers:
		update["$push"] = bson.M{"contributors.verifiers": contributor}
	case models.ContributorTeamValidators:
		update["$push"] = bson.M{"contributors.validators": contributor}
	}

	_, err = h.documentCollection.UpdateOne(ctx, bson.M{"_id": invitation.DocumentID}, update)
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	// Log activity
	teamName := string(invitation.Team)
	if invitation.Team == models.ContributorTeamAuthors {
		teamName = "Authors"
	} else if invitation.Team == models.ContributorTeamVerifiers {
		teamName = "Verifiers"
	} else if invitation.Team == models.ContributorTeamValidators {
		teamName = "Validators"
	}

	activityDescription := fmt.Sprintf("Accepted invitation to collaborate on document '%s' (%s) as %s",
		document.Title, document.Reference, teamName)
	activityReq := models.ActivityLogRequest{
		Action:       "document_invitation_accepted",
		Description:  activityDescription,
		ResourceType: "document",
		ResourceID:   &invitation.DocumentID,
		Success:      true,
		Details: map[string]interface{}{
			"documentId":   invitation.DocumentID.Hex(),
			"team":         string(invitation.Team),
			"invitationId": invitation.ID.Hex(),
		},
	}
	logErr := h.activityLogService.LogActivity(ctx, activityReq, c)
	if logErr != nil {
		fmt.Printf("⚠️  [INVITATION] Failed to log activity: %v\n", logErr)
	}

	helpers.SendSuccess(c, "Invitation accepted successfully", nil)
}

// DeclineInvitation declines an invitation
// PUT /api/invitations/:id/decline
func (h *InvitationHandler) DeclineInvitation(c *gin.Context) {
	user, exists := middleware.GetCurrentUser(c)
	if !exists {
		helpers.SendUnauthorized(c, "User not found in context", "UNAUTHORIZED")
		return
	}

	idParam := c.Param("id")
	id, err := primitive.ObjectIDFromHex(idParam)
	if err != nil {
		helpers.SendBadRequest(c, "Invalid invitation ID format")
		return
	}

	var req models.DeclineInvitationRequest
	if err := helpers.BindAndValidate(c, &req); err != nil {
		// Reason is optional, so just set it to empty
		req.Reason = ""
	}

	ctx := c.Request.Context()

	// Find invitation
	var invitation models.Invitation
	err = h.invitationCollection.FindOne(ctx, bson.M{"_id": id}).Decode(&invitation)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			helpers.SendNotFound(c, "Invitation not found")
			return
		}
		helpers.SendInternalError(c, err)
		return
	}

	// Verify invitation is for this user
	if invitation.InvitedEmail != user.Email {
		helpers.SendForbidden(c, "This invitation is not for you", "FORBIDDEN")
		return
	}

	// Check if invitation can be declined
	if !invitation.CanDecline() {
		helpers.SendBadRequest(c, "This invitation cannot be declined (expired or already processed)")
		return
	}

	// Get document details for activity log
	var document models.Document
	err = h.documentCollection.FindOne(ctx, bson.M{"_id": invitation.DocumentID}).Decode(&document)
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	// Update invitation status
	now := primitive.DateTime(invitation.UpdatedAt.Unix() * 1000)
	_, err = h.invitationCollection.UpdateOne(ctx, bson.M{"_id": id}, bson.M{
		"$set": bson.M{
			"status":         models.InvitationStatusDeclined,
			"declined_at":    now,
			"decline_reason": req.Reason,
			"updated_at":     now,
		},
	})
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	// Log activity
	teamName := string(invitation.Team)
	activityDescription := fmt.Sprintf("Declined invitation to collaborate on document '%s' (%s) as %s", document.Title, document.Reference, teamName)
	if req.Reason != "" {
		activityDescription += fmt.Sprintf(" - Reason: %s", req.Reason)
	}

	activityReq := models.ActivityLogRequest{
		Action:       "document_invitation_declined",
		Description:  activityDescription,
		ResourceType: "document",
		ResourceID:   &invitation.DocumentID,
		Success:      true,
		Details: map[string]interface{}{
			"documentId":     invitation.DocumentID.Hex(),
			"documentTitle":  document.Title,
			"team":           teamName,
			"declineReason":  req.Reason,
			"invitationId":   id.Hex(),
		},
	}
	if logErr := h.activityLogService.LogActivity(ctx, activityReq, c); logErr != nil {
		fmt.Printf("Failed to log decline activity: %v\n", logErr)
	}

	helpers.SendSuccess(c, "Invitation declined successfully", nil)
}

// ResendInvitation resends an invitation email
// POST /api/invitations/:id/resend
func (h *InvitationHandler) ResendInvitation(c *gin.Context) {
	user, exists := middleware.GetCurrentUser(c)
	if !exists {
		helpers.SendUnauthorized(c, "User not found in context", "UNAUTHORIZED")
		return
	}

	idParam := c.Param("id")
	id, err := primitive.ObjectIDFromHex(idParam)
	if err != nil {
		helpers.SendBadRequest(c, "Invalid invitation ID format")
		return
	}

	ctx := c.Request.Context()

	// Get invitation
	var invitation models.Invitation
	err = h.invitationCollection.FindOne(ctx, bson.M{"_id": id}).Decode(&invitation)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			helpers.SendNotFound(c, "Invitation not found")
			return
		}
		helpers.SendInternalError(c, err)
		return
	}

	// Only the inviter can resend
	if invitation.InvitedBy != user.ID {
		helpers.SendForbidden(c, "Only the inviter can resend this invitation", "FORBIDDEN")
		return
	}

	// Only resend pending invitations
	if invitation.Status != models.InvitationStatusPending {
		helpers.SendBadRequest(c, "Can only resend pending invitations")
		return
	}

	// Get document details
	var document models.Document
	err = h.documentCollection.FindOne(ctx, bson.M{"_id": invitation.DocumentID}).Decode(&document)
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	// Generate new token
	token, err := generateInvitationToken()
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	// Update invitation with new token and sent date
	now := time.Now()
	_, err = h.invitationCollection.UpdateOne(ctx, bson.M{"_id": id}, bson.M{
		"$set": bson.M{
			"token":      token,
			"sent_at":    now,
			"expires_at": now.Add(7 * 24 * time.Hour),
			"updated_at": now,
		},
	})
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	// Resend email
	invitedUserName := invitation.InvitedEmail
	if invitation.InvitedUserID != nil {
		var invitedUser models.User
		err = h.userCollection.FindOne(ctx, bson.M{"_id": invitation.InvitedUserID}).Decode(&invitedUser)
		if err == nil {
			invitedUserName = invitedUser.FirstName + " " + invitedUser.LastName
		}
	}

	teamName := string(invitation.Team)
	if invitation.Team == models.ContributorTeamAuthors {
		teamName = "Authors"
	} else if invitation.Team == models.ContributorTeamVerifiers {
		teamName = "Verifiers"
	} else if invitation.Team == models.ContributorTeamValidators {
		teamName = "Validators"
	}

	err = h.emailService.SendInvitationEmail(
		invitation.InvitedEmail,
		invitedUserName,
		user.FirstName + " " + user.LastName,
		document.Title,
		document.Reference,
		teamName,
		token,
	)
	if err != nil {
		fmt.Printf("Failed to resend invitation email: %v\n", err)
		// Don't fail the request if email fails
	}

	helpers.SendSuccess(c, "Invitation resent successfully", nil)
}

// CancelInvitation cancels a pending invitation
// DELETE /api/invitations/:id/cancel
func (h *InvitationHandler) CancelInvitation(c *gin.Context) {
	user, exists := middleware.GetCurrentUser(c)
	if !exists {
		helpers.SendUnauthorized(c, "User not found in context", "UNAUTHORIZED")
		return
	}

	idParam := c.Param("id")
	id, err := primitive.ObjectIDFromHex(idParam)
	if err != nil {
		helpers.SendBadRequest(c, "Invalid invitation ID format")
		return
	}

	ctx := c.Request.Context()

	// Get invitation
	var invitation models.Invitation
	err = h.invitationCollection.FindOne(ctx, bson.M{"_id": id}).Decode(&invitation)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			helpers.SendNotFound(c, "Invitation not found")
			return
		}
		helpers.SendInternalError(c, err)
		return
	}

	// Only the inviter can cancel
	if invitation.InvitedBy != user.ID {
		helpers.SendForbidden(c, "Only the inviter can cancel this invitation", "FORBIDDEN")
		return
	}

	// Only cancel pending invitations
	if invitation.Status != models.InvitationStatusPending {
		helpers.SendBadRequest(c, "Can only cancel pending invitations")
		return
	}

	// Delete the invitation
	_, err = h.invitationCollection.DeleteOne(ctx, bson.M{"_id": id})
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	helpers.SendSuccess(c, "Invitation cancelled successfully", nil)
}
