package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/kodesonik/process-manager/internal/middleware"
	"github.com/kodesonik/process-manager/internal/models"
	"github.com/kodesonik/process-manager/internal/services"
)

// AuthHandler handles authentication-related HTTP requests
type AuthHandler struct {
	userService  *services.UserService
	jwtService   *services.JWTService
	emailService *services.EmailService
	validator    *validator.Validate
}

// NewAuthHandler creates a new auth handler instance
func NewAuthHandler(userService *services.UserService, jwtService *services.JWTService, emailService *services.EmailService) *AuthHandler {
	return &AuthHandler{
		userService:  userService,
		jwtService:   jwtService,
		emailService: emailService,
		validator:    validator.New(),
	}
}

// LoginResponse represents the login response
type LoginResponse struct {
	User         models.UserResponse      `json:"user"`
	AccessToken  string                   `json:"access_token"`
	RefreshToken string                   `json:"refresh_token"`
	ExpiresAt    time.Time               `json:"expires_at"`
	TokenType    string                  `json:"token_type"`
}

// Register handles user registration
// POST /api/auth/register
func (h *AuthHandler) Register(c *gin.Context) {
	var req models.CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	// Validate request
	if err := h.validator.Struct(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Validation failed",
			"details": err.Error(),
		})
		return
	}

	// Create user
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	user, err := h.userService.CreateUser(ctx, &req)
	if err != nil {
		if err == models.ErrEmailExists {
			c.JSON(http.StatusConflict, gin.H{
				"success": false,
				"error":   "Email already exists",
				"code":    "EMAIL_EXISTS",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to create user",
			"details": err.Error(),
		})
		return
	}

	// Create email verification token
	verificationToken, err := h.userService.CreateEmailVerificationToken(ctx, user.ID)
	if err != nil {
		// Log error but don't fail registration
		// User can request verification later
	} else {
		// Send verification email
		if err := h.emailService.SendVerificationEmail(user.Email, user.Name, verificationToken.Token); err != nil {
			// Log error but don't fail registration
		}
	}

	// Generate tokens
	tokenPair, err := h.jwtService.GenerateTokenPair(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to generate tokens",
			"details": err.Error(),
		})
		return
	}

	// Store refresh token in database
	_, err = h.userService.CreateRefreshToken(ctx, user.ID)
	if err != nil {
		// Log error but continue
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "User registered successfully. Please check your email for verification.",
		"data": LoginResponse{
			User:         user.ToResponse(),
			AccessToken:  tokenPair.AccessToken,
			RefreshToken: tokenPair.RefreshToken,
			ExpiresAt:    tokenPair.ExpiresAt,
			TokenType:    "Bearer",
		},
	})
}

// Login handles user login
// POST /api/auth/login
func (h *AuthHandler) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	// Validate request
	if err := h.validator.Struct(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Validation failed",
			"details": err.Error(),
		})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	// Find user by email
	user, err := h.userService.GetUserByEmail(ctx, req.Email)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Invalid email or password",
			"code":    "INVALID_CREDENTIALS",
		})
		return
	}

	// Verify password
	if err := user.CheckPassword(req.Password); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Invalid email or password",
			"code":    "INVALID_CREDENTIALS",
		})
		return
	}

	// Generate tokens
	tokenPair, err := h.jwtService.GenerateTokenPair(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to generate tokens",
			"details": err.Error(),
		})
		return
	}

	// Store refresh token in database
	_, err = h.userService.CreateRefreshToken(ctx, user.ID)
	if err != nil {
		// Log error but continue
	}

	// Update last login
	if err := h.userService.UpdateLastLogin(ctx, user.ID); err != nil {
		// Log error but continue
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Login successful",
		"data": LoginResponse{
			User:         user.ToResponse(),
			AccessToken:  tokenPair.AccessToken,
			RefreshToken: tokenPair.RefreshToken,
			ExpiresAt:    tokenPair.ExpiresAt,
			TokenType:    "Bearer",
		},
	})
}

// Logout handles user logout
// POST /api/auth/logout
func (h *AuthHandler) Logout(c *gin.Context) {
	// Get refresh token from request body
	var req struct {
		RefreshToken string `json:"refresh_token"`
	}

	if err := c.ShouldBindJSON(&req); err == nil && req.RefreshToken != "" {
		// Revoke the specific refresh token
		ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
		defer cancel()

		if err := h.userService.RevokeRefreshToken(ctx, req.RefreshToken); err != nil {
			// Log error but continue with logout
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Logout successful",
	})
}

// RefreshToken handles token refresh
// POST /api/auth/refresh
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var req struct {
		RefreshToken string `json:"refresh_token" validate:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	if err := h.validator.Struct(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Refresh token is required",
		})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	// Validate refresh token in database
	storedToken, err := h.userService.ValidateRefreshToken(ctx, req.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Invalid or expired refresh token",
			"code":    "INVALID_REFRESH_TOKEN",
		})
		return
	}

	// Get user
	user, err := h.userService.GetUserByID(ctx, storedToken.UserID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "User not found",
			"code":    "USER_NOT_FOUND",
		})
		return
	}

	// Generate new token pair
	tokenPair, err := h.jwtService.GenerateTokenPair(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to generate tokens",
			"details": err.Error(),
		})
		return
	}

	// Revoke old refresh token and create new one
	if err := h.userService.RevokeRefreshToken(ctx, req.RefreshToken); err != nil {
		// Log error but continue
	}

	_, err = h.userService.CreateRefreshToken(ctx, user.ID)
	if err != nil {
		// Log error but continue
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Tokens refreshed successfully",
		"data": LoginResponse{
			User:         user.ToResponse(),
			AccessToken:  tokenPair.AccessToken,
			RefreshToken: tokenPair.RefreshToken,
			ExpiresAt:    tokenPair.ExpiresAt,
			TokenType:    "Bearer",
		},
	})
}

// ForgotPassword handles password reset request
// POST /api/auth/forgot
func (h *AuthHandler) ForgotPassword(c *gin.Context) {
	var req models.ForgotPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	if err := h.validator.Struct(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Email is required",
		})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	// Find user by email
	user, err := h.userService.GetUserByEmail(ctx, req.Email)
	if err != nil {
		// Don't reveal if email exists or not for security reasons
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "If the email exists, a password reset link has been sent",
		})
		return
	}

	// Create password reset token
	resetToken, err := h.userService.CreatePasswordResetToken(ctx, user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to create reset token",
			"details": err.Error(),
		})
		return
	}

	// Send password reset email
	if err := h.emailService.SendPasswordResetEmail(user.Email, user.Name, resetToken.Token); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to send reset email",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Password reset email sent successfully",
	})
}

// ResetPassword handles password reset confirmation
// POST /api/auth/reset
func (h *AuthHandler) ResetPassword(c *gin.Context) {
	var req models.ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	if err := h.validator.Struct(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Validation failed",
			"details": err.Error(),
		})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	// Use password reset token
	err := h.userService.UsePasswordResetToken(ctx, req.Token, req.NewPassword)
	if err != nil {
		if err == models.ErrInvalidToken {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "Invalid or expired reset token",
				"code":    "INVALID_RESET_TOKEN",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to reset password",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Password reset successful",
	})
}

// GetMe returns current user information
// GET /api/auth/me
func (h *AuthHandler) GetMe(c *gin.Context) {
	user, exists := middleware.GetCurrentUser(c)
	if !exists {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "User context not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    user.ToResponse(),
	})
}

// UpdateProfile handles profile updates
// PUT /api/auth/profile
func (h *AuthHandler) UpdateProfile(c *gin.Context) {
	var req models.UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	if err := h.validator.Struct(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Validation failed",
			"details": err.Error(),
		})
		return
	}

	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "User ID not found in context",
		})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	updatedUser, err := h.userService.UpdateUser(ctx, userID, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to update profile",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Profile updated successfully",
		"data":    updatedUser.ToResponse(),
	})
}

// ChangePassword handles password changes
// PUT /api/auth/change-password
func (h *AuthHandler) ChangePassword(c *gin.Context) {
	var req models.ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	if err := h.validator.Struct(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Validation failed",
			"details": err.Error(),
		})
		return
	}

	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "User ID not found in context",
		})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	err := h.userService.ChangePassword(ctx, userID, &req)
	if err != nil {
		if err == models.ErrInvalidPassword {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "Current password is incorrect",
				"code":    "INVALID_CURRENT_PASSWORD",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to change password",
			"details": err.Error(),
		})
		return
	}

	// Revoke all refresh tokens to force re-login on all devices
	if err := h.userService.RevokeAllUserRefreshTokens(ctx, userID); err != nil {
		// Log error but continue
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Password changed successfully. Please log in again on all devices.",
	})
}

// VerifyEmail handles email verification
// POST /api/auth/verify-email
func (h *AuthHandler) VerifyEmail(c *gin.Context) {
	var req struct {
		Token string `json:"token" validate:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	if err := h.validator.Struct(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Verification token is required",
		})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	err := h.userService.VerifyEmailToken(ctx, req.Token)
	if err != nil {
		if err == models.ErrInvalidToken {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "Invalid or expired verification token",
				"code":    "INVALID_VERIFICATION_TOKEN",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to verify email",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Email verified successfully",
	})
}

// ResendVerification resends email verification
// POST /api/auth/resend-verification
func (h *AuthHandler) ResendVerification(c *gin.Context) {
	user, exists := middleware.GetCurrentUser(c)
	if !exists {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "User context not found",
		})
		return
	}

	if user.Verified {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Email is already verified",
			"code":    "ALREADY_VERIFIED",
		})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	// Create new verification token
	verificationToken, err := h.userService.CreateEmailVerificationToken(ctx, user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to create verification token",
			"details": err.Error(),
		})
		return
	}

	// Send verification email
	if err := h.emailService.SendVerificationEmail(user.Email, user.Name, verificationToken.Token); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to send verification email",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Verification email sent successfully",
	})
}

// RevokeAllTokens revokes all refresh tokens for current user
// POST /api/auth/revoke-all-tokens
func (h *AuthHandler) RevokeAllTokens(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "User ID not found in context",
		})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	err := h.userService.RevokeAllUserRefreshTokens(ctx, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to revoke tokens",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "All tokens revoked successfully. Please log in again on all devices.",
	})
}