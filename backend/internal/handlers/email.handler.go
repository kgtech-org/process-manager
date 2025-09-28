package handlers

import (
	"context"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kodesonik/process-manager/internal/helpers"
	"github.com/kodesonik/process-manager/internal/middleware"
	"github.com/kodesonik/process-manager/internal/services"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// EmailHandler handles email-related operations (SMTP)
type EmailHandler struct {
	emailService *services.EmailService
	userService  *services.UserService
}

// NewEmailHandler creates a new email handler
func NewEmailHandler(emailService *services.EmailService, userService *services.UserService) *EmailHandler {
	return &EmailHandler{
		emailService: emailService,
		userService:  userService,
	}
}

// SendTestEmail tests email configuration
func (h *EmailHandler) SendTestEmail(c *gin.Context) {
	currentUser, _ := middleware.GetCurrentUser(c)

	var input struct {
		Email string `json:"email"`
	}

	// Use current user's email if not provided
	if err := c.ShouldBindJSON(&input); err != nil || input.Email == "" {
		input.Email = currentUser.Email
	}

	// Send test email
	subject := "Test Email - Process Manager"
	body := `<p>This is a test email from Process Manager to verify email configuration is working properly.</p>
	<p>If you received this email, it means the email service is configured correctly.</p>`

	if err := h.emailService.SendCustomEmail(input.Email, currentUser.Name, subject, body); err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	helpers.SendSuccess(c, "Test email sent successfully", gin.H{
		"email":  input.Email,
		"status": "sent",
	})
}

// SendEmailToUser sends a custom email to a specific user (Admin only)
func (h *EmailHandler) SendEmailToUser(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	var input struct {
		UserID  string `json:"userId" binding:"required"`
		Subject string `json:"subject" binding:"required"`
		Body    string `json:"body" binding:"required"`
		IsHTML  bool   `json:"isHtml"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		helpers.SendValidationError(c, "Invalid input", err)
		return
	}

	// Validate user ID
	userID, err := primitive.ObjectIDFromHex(input.UserID)
	if err != nil {
		helpers.SendBadRequest(c, "Invalid user ID", err.Error())
		return
	}

	// Get user details
	user, err := h.userService.GetUserByID(ctx, userID)
	if err != nil {
		helpers.SendNotFound(c, "User not found")
		return
	}

	// Format body based on type
	emailBody := input.Body
	if !input.IsHTML {
		// Convert plain text to basic HTML
		emailBody = "<p>" + input.Body + "</p>"
	}

	// Send email
	if err := h.emailService.SendCustomEmail(user.Email, user.Name, input.Subject, emailBody); err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	helpers.SendSuccess(c, "Email sent successfully", gin.H{
		"userId":  user.ID,
		"email":   user.Email,
		"name":    user.Name,
		"subject": input.Subject,
		"status":  "sent",
	})
}

// SendBroadcastEmail sends an email to all users (Admin only)
func (h *EmailHandler) SendBroadcastEmail(c *gin.Context) {
	var input struct {
		Subject string   `json:"subject" binding:"required"`
		Body    string   `json:"body" binding:"required"`
		IsHTML  bool     `json:"isHtml"`
		Roles   []string `json:"roles"`  // Optional: filter by roles
		Status  string   `json:"status"` // Optional: filter by status
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		helpers.SendValidationError(c, "Invalid input", err)
		return
	}

	// Get all users based on filters
	users, err := h.userService.GetAllUsersForNotification(input.Roles, input.Status)
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	if len(users) == 0 {
		helpers.SendNotFound(c, "No users match the specified criteria")
		return
	}

	// Format body based on type
	emailBody := input.Body
	if !input.IsHTML {
		emailBody = "<p>" + input.Body + "</p>"
	}

	// Send emails to all users
	sent := 0
	failed := 0
	var errors []string

	for _, user := range users {
		if err := h.emailService.SendCustomEmail(user.Email, user.Name, input.Subject, emailBody); err != nil {
			failed++
			errors = append(errors, user.Email+": "+err.Error())
		} else {
			sent++
		}
	}

	// Prepare response
	response := gin.H{
		"total":   len(users),
		"sent":    sent,
		"failed":  failed,
		"subject": input.Subject,
	}

	if len(errors) > 0 {
		response["errors"] = errors
	}

	if failed > 0 && sent > 0 {
		helpers.SendSuccess(c, "Emails partially sent", response)
	} else if failed > 0 {
		helpers.SendErrorWithCode(c, 500, "Failed to send emails", "Check error details in response")
	} else {
		helpers.SendSuccess(c, "Broadcast email sent successfully", response)
	}
}

// SendEmailToGroup sends an email to a group of users (Admin only)
func (h *EmailHandler) SendEmailToGroup(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	var input struct {
		UserIDs []string `json:"userIds" binding:"required"`
		Subject string   `json:"subject" binding:"required"`
		Body    string   `json:"body" binding:"required"`
		IsHTML  bool     `json:"isHtml"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		helpers.SendValidationError(c, "Invalid input", err)
		return
	}

	if len(input.UserIDs) == 0 {
		helpers.SendBadRequest(c, "No users selected", "At least one user must be selected")
		return
	}

	// Format body based on type
	emailBody := input.Body
	if !input.IsHTML {
		emailBody = "<p>" + input.Body + "</p>"
	}

	// Send emails to selected users
	sent := 0
	failed := 0
	var errors []string
	var recipients []gin.H

	for _, userIDStr := range input.UserIDs {
		userID, err := primitive.ObjectIDFromHex(userIDStr)
		if err != nil {
			failed++
			errors = append(errors, userIDStr+": Invalid ID")
			continue
		}

		user, err := h.userService.GetUserByID(ctx, userID)
		if err != nil {
			failed++
			errors = append(errors, userIDStr+": User not found")
			continue
		}

		if err := h.emailService.SendCustomEmail(user.Email, user.Name, input.Subject, emailBody); err != nil {
			failed++
			errors = append(errors, user.Email+": "+err.Error())
		} else {
			sent++
			recipients = append(recipients, gin.H{
				"id":    user.ID,
				"email": user.Email,
				"name":  user.Name,
			})
		}
	}

	// Prepare response
	response := gin.H{
		"total":      len(input.UserIDs),
		"sent":       sent,
		"failed":     failed,
		"subject":    input.Subject,
		"recipients": recipients,
	}

	if len(errors) > 0 {
		response["errors"] = errors
	}

	if failed > 0 && sent > 0 {
		helpers.SendSuccess(c, "Emails partially sent", response)
	} else if failed > 0 {
		helpers.SendErrorWithCode(c, 500, "Failed to send emails", "Check error details in response")
	} else {
		helpers.SendSuccess(c, "Group email sent successfully", response)
	}
}