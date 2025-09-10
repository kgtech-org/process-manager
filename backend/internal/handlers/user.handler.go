package handlers

import (
	"context"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kodesonik/process-manager/internal/helpers"
	"github.com/kodesonik/process-manager/internal/middleware"
	"github.com/kodesonik/process-manager/internal/models"
	"github.com/kodesonik/process-manager/internal/services"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// UserHandler handles user management HTTP requests
type UserHandler struct {
	userService  *services.UserService
	emailService *services.EmailService
}

// NewUserHandler creates a new user handler instance
func NewUserHandler(userService *services.UserService, emailService *services.EmailService) *UserHandler {
	return &UserHandler{
		userService:  userService,
		emailService: emailService,
	}
}

// GetAllUsers returns all users with pagination and filters (admin only)
// GET /api/users
func (h *UserHandler) GetAllUsers(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	// Parse pagination parameters
	page, limit := helpers.GetPaginationParams(c)
	status := c.Query("status")
	role := c.Query("role")

	// Build filter
	filter := bson.M{}
	if status != "" {
		filter["status"] = status
	}
	if role != "" {
		filter["role"] = role
	}

	// Get users from database
	users, total, err := h.userService.ListUsers(ctx, int64((page-1)*limit), int64(limit), filter)
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	// Convert to response format
	userResponses := make([]models.UserResponse, len(users))
	for i, user := range users {
		userResponses[i] = user.ToResponse()
	}

	helpers.SendPaginated(c, userResponses, page, limit, total)
}

// GetUserByID returns a specific user by ID (admin only)
// GET /api/users/:id
func (h *UserHandler) GetUserByID(c *gin.Context) {
	idStr, err := helpers.ValidatePathParam(c, "id", func(id string) error {
		_, err := primitive.ObjectIDFromHex(id)
		return err
	})
	if err != nil {
		return
	}

	userID, _ := primitive.ObjectIDFromHex(idStr)

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	user, err := h.userService.GetUserByID(ctx, userID)
	if err != nil {
		helpers.SendError(c, err)
		return
	}

	helpers.SendSuccess(c, "User retrieved successfully", user.ToResponse())
}

// CreateUser creates a new user (admin only)
// POST /api/users
func (h *UserHandler) CreateUser(c *gin.Context) {
	var req models.CreateUserRequest
	if err := helpers.BindAndValidate(c, &req); err != nil {
		helpers.SendValidationErrors(c, err)
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	// Check if user already exists
	existingUser, err := h.userService.GetUserByEmail(ctx, req.Email)
	if err == nil && existingUser != nil {
		helpers.SendError(c, models.ErrEmailExists)
		return
	}

	// Create user
	createdUser, err := h.userService.CreateUser(ctx, &req)
	if err != nil {
		helpers.SendError(c, err)
		return
	}

	helpers.SendCreated(c, "User created successfully", createdUser.ToResponse())
}

// UpdateUser updates a user (admin only)
// PUT /api/users/:id
func (h *UserHandler) UpdateUser(c *gin.Context) {
	idStr, err := helpers.ValidatePathParam(c, "id", func(id string) error {
		_, err := primitive.ObjectIDFromHex(id)
		return err
	})
	if err != nil {
		return
	}

	userID, _ := primitive.ObjectIDFromHex(idStr)

	var req models.UpdateProfileRequest
	if err := helpers.BindAndValidate(c, &req); err != nil {
		helpers.SendValidationErrors(c, err)
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	updatedUser, err := h.userService.UpdateUser(ctx, userID, &req)
	if err != nil {
		helpers.SendError(c, err)
		return
	}

	helpers.SendSuccess(c, "User updated successfully", updatedUser.ToResponse())
}

// DeleteUser soft deletes a user (admin only)
// DELETE /api/users/:id
func (h *UserHandler) DeleteUser(c *gin.Context) {
	idStr, err := helpers.ValidatePathParam(c, "id", func(id string) error {
		_, err := primitive.ObjectIDFromHex(id)
		return err
	})
	if err != nil {
		return
	}

	userID, _ := primitive.ObjectIDFromHex(idStr)

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	err = h.userService.SoftDeleteUser(ctx, userID)
	if err != nil {
		helpers.SendError(c, err)
		return
	}

	helpers.SendSuccess(c, "User deleted successfully", nil)
}

// ActivateUser activates a user account (admin only)
// PUT /api/users/:id/activate
func (h *UserHandler) ActivateUser(c *gin.Context) {
	idStr, err := helpers.ValidatePathParam(c, "id", func(id string) error {
		_, err := primitive.ObjectIDFromHex(id)
		return err
	})
	if err != nil {
		return
	}

	userID, _ := primitive.ObjectIDFromHex(idStr)

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	err = h.userService.SetUserActiveStatus(ctx, userID, true)
	if err != nil {
		helpers.SendError(c, err)
		return
	}

	helpers.SendSuccess(c, "User activated successfully", nil)
}

// DeactivateUser deactivates a user account (admin only)
// PUT /api/users/:id/deactivate
func (h *UserHandler) DeactivateUser(c *gin.Context) {
	idStr, err := helpers.ValidatePathParam(c, "id", func(id string) error {
		_, err := primitive.ObjectIDFromHex(id)
		return err
	})
	if err != nil {
		return
	}

	userID, _ := primitive.ObjectIDFromHex(idStr)

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	err = h.userService.SetUserActiveStatus(ctx, userID, false)
	if err != nil {
		helpers.SendError(c, err)
		return
	}

	helpers.SendSuccess(c, "User deactivated successfully", nil)
}

// UpdateUserRole updates a user's role (admin only)
// PUT /api/users/:id/role
func (h *UserHandler) UpdateUserRole(c *gin.Context) {
	idStr, err := helpers.ValidatePathParam(c, "id", func(id string) error {
		_, err := primitive.ObjectIDFromHex(id)
		return err
	})
	if err != nil {
		return
	}

	userID, _ := primitive.ObjectIDFromHex(idStr)

	var req models.UpdateUserRoleRequest
	if err := helpers.BindAndValidate(c, &req); err != nil {
		helpers.SendValidationErrors(c, err)
		return
	}

	// Validate role
	if !models.IsValidRole(req.Role) {
		helpers.SendBadRequest(c, "Invalid role")
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	err = h.userService.UpdateUserRole(ctx, userID, req.Role)
	if err != nil {
		helpers.SendError(c, err)
		return
	}

	helpers.SendSuccess(c, "User role updated successfully", nil)
}

// ValidateUser handles admin validation of pending user registrations
// PUT /api/users/:id/validate
func (h *UserHandler) ValidateUser(c *gin.Context) {
	idStr, err := helpers.ValidatePathParam(c, "id", func(id string) error {
		_, err := primitive.ObjectIDFromHex(id)
		return err
	})
	if err != nil {
		return
	}

	userID, _ := primitive.ObjectIDFromHex(idStr)

	var req models.ValidateUserRequest
	if err := helpers.BindAndValidate(c, &req); err != nil {
		helpers.SendValidationErrors(c, err)
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	// Get current admin user
	currentUser, exists := middleware.GetCurrentUser(c)
	if !exists {
		helpers.SendInternalError(c, models.ErrUserNotFound)
		return
	}

	// Get the user to validate
	user, err := h.userService.GetUserByID(ctx, userID)
	if err != nil {
		helpers.SendError(c, err)
		return
	}

	// Check if user is in pending status
	if user.Status != models.StatusPending {
		helpers.SendBadRequest(c, "User is not in pending status")
		return
	}

	var updatedUser *models.User
	if req.Action == "approve" {
		// Validate role if provided
		role := models.RoleUser // Default role
		if req.Role != "" {
			if !models.IsValidRole(req.Role) {
				helpers.SendBadRequest(c, "Invalid role specified")
				return
			}
			role = req.Role
		}

		// Approve user
		updatedUser, err = h.userService.ValidateUser(ctx, userID, &models.ValidateUserRequest{
			Action: "approve",
			Role:   role,
		}, currentUser.ID)
		if err != nil {
			helpers.SendInternalError(c, err)
			return
		}

		// Send approval email
		if err := h.emailService.SendAccountApprovedEmail(user.Email, user.Name); err != nil {
			// Log error but don't fail the approval
		}

		helpers.SendSuccess(c, "User approved successfully", updatedUser.ToResponse())

	} else if req.Action == "reject" {
		// Reject user
		updatedUser, err = h.userService.ValidateUser(ctx, userID, &models.ValidateUserRequest{
			Action: "reject",
			Reason: req.Reason,
		}, currentUser.ID)
		if err != nil {
			helpers.SendInternalError(c, err)
			return
		}

		// Send rejection email
		if err := h.emailService.SendAccountRejectedEmail(user.Email, user.Name, req.Reason); err != nil {
			// Log error but don't fail the rejection
		}

		helpers.SendSuccess(c, "User rejected successfully", updatedUser.ToResponse())

	} else {
		helpers.SendBadRequest(c, "Invalid action. Must be 'approve' or 'reject'")
	}
}
