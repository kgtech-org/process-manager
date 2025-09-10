package handlers

import (
	"context"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kodesonik/process-manager/internal/helpers"
	"github.com/kodesonik/process-manager/internal/middleware"
	"github.com/kodesonik/process-manager/internal/models"
	"github.com/kodesonik/process-manager/internal/services"
)

// AuthHandler handles authentication-related HTTP requests
type AuthHandler struct {
	userService  *services.UserService
	jwtService   *services.JWTService
	emailService *services.EmailService
	otpService   *services.OTPService
}

// NewAuthHandler creates a new auth handler instance
func NewAuthHandler(userService *services.UserService, jwtService *services.JWTService, emailService *services.EmailService, otpService *services.OTPService) *AuthHandler {
	return &AuthHandler{
		userService:  userService,
		jwtService:   jwtService,
		emailService: emailService,
		otpService:   otpService,
	}
}

// RequestOTP sends an OTP to the user's email for login
// POST /api/auth/request-otp
func (h *AuthHandler) RequestOTP(c *gin.Context) {
	var req models.LoginRequest
	if err := helpers.BindAndValidate(c, &req); err != nil {
		helpers.SendValidationErrors(c, err)
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	// Find user by email
	user, err := h.userService.GetUserByEmail(ctx, req.Email)
	if err != nil {
		// Don't reveal if user exists for security
		helpers.SendSuccess(c, "If the email exists in our system, an OTP has been sent", nil)
		return
	}

	// Check user status before sending OTP
	if !user.CanLogin() {
		helpers.SendError(c, models.GetAccountStatusError(user.Status))
		return
	}

	// Generate and store OTP
	otp, err := h.otpService.GenerateOTP(ctx, user.Email)
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	// Generate temporary token for OTP verification
	tempToken, err := h.otpService.GenerateTemporaryToken(ctx, user.Email)
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	// Send OTP via email
	if err := h.emailService.SendOTPEmail(user.Email, user.Name, otp); err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	// Check if development mode
	isDevelopment := os.Getenv("GIN_MODE") == "debug" || os.Getenv("DEVELOPMENT_MODE") == "true"

	// Send OTP response with temporary token
	helpers.SendOTPResponseWithToken(c, tempToken, otp, isDevelopment)
}

// VerifyOTP verifies the OTP and logs in the user
// POST /api/auth/verify-otp
func (h *AuthHandler) VerifyOTP(c *gin.Context) {
	// Get temporary token from header
	tempToken := c.GetHeader("X-Temp-Token")
	if tempToken == "" {
		helpers.SendError(c, models.ErrInvalidToken)
		return
	}

	var req models.VerifyOTPRequest
	if err := helpers.BindAndValidate(c, &req); err != nil {
		helpers.SendValidationErrors(c, err)
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	// Get email from temporary token
	email, err := h.otpService.GetEmailFromTemporaryToken(ctx, tempToken)
	if err != nil {
		helpers.SendError(c, err)
		return
	}

	// Verify OTP
	if err := h.otpService.VerifyOTP(ctx, email, req.OTP); err != nil {
		helpers.SendError(c, err)
		return
	}

	// Delete temporary token after successful verification
	h.otpService.DeleteTemporaryToken(ctx, tempToken)

	// Get user for token generation
	user, err := h.userService.GetUserByEmail(ctx, email)
	if err != nil {
		helpers.SendError(c, err)
		return
	}

	// Generate tokens
	tokenPair, err := h.jwtService.GenerateTokenPair(user)
	if err != nil {
		helpers.SendInternalError(c, err)
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

	// Send login response using centralized function
	helpers.SendLoginResponse(c, user, tokenPair)
}

// Logout handles user logout
// POST /api/auth/logout
func (h *AuthHandler) Logout(c *gin.Context) {
	var req models.LogoutRequest
	if err := c.ShouldBindJSON(&req); err == nil && req.RefreshToken != "" {
		// Revoke the specific refresh token
		ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
		defer cancel()

		if err := h.userService.RevokeRefreshToken(ctx, req.RefreshToken); err != nil {
			// Log error but continue with logout
		}
	}

	helpers.SendSuccess(c, "Logout successful", nil)
}

// RefreshToken handles token refresh
// POST /api/auth/refresh
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var req models.RefreshTokenRequest
	if err := helpers.BindAndValidate(c, &req); err != nil {
		helpers.SendValidationErrors(c, err)
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	// Validate refresh token in database
	storedToken, err := h.userService.ValidateRefreshToken(ctx, req.RefreshToken)
	if err != nil {
		helpers.SendError(c, err)
		return
	}

	// Get user
	user, err := h.userService.GetUserByID(ctx, storedToken.UserID)
	if err != nil {
		helpers.SendError(c, err)
		return
	}

	// Generate new token pair
	tokenPair, err := h.jwtService.GenerateTokenPair(user)
	if err != nil {
		helpers.SendInternalError(c, err)
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

	helpers.SendLoginResponse(c, user, tokenPair)
}

// GetMe returns current user information
// GET /api/auth/me
func (h *AuthHandler) GetMe(c *gin.Context) {
	user, exists := middleware.GetCurrentUser(c)
	if !exists {
		helpers.SendInternalError(c, models.ErrUserNotFound)
		return
	}

	helpers.SendSuccess(c, "User information retrieved successfully", user.ToResponse())
}

// UpdateProfile handles profile updates
// PUT /api/auth/profile
func (h *AuthHandler) UpdateProfile(c *gin.Context) {
	var req models.UpdateProfileRequest
	if err := helpers.BindAndValidate(c, &req); err != nil {
		helpers.SendValidationErrors(c, err)
		return
	}

	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		helpers.SendInternalError(c, models.ErrUserNotFound)
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	updatedUser, err := h.userService.UpdateUser(ctx, userID, &req)
	if err != nil {
		helpers.SendError(c, err)
		return
	}

	helpers.SendSuccess(c, "Profile updated successfully", updatedUser.ToResponse())
}

// VerifyEmail handles email verification
// POST /api/auth/verify-email
func (h *AuthHandler) VerifyEmail(c *gin.Context) {
	var req models.VerifyEmailRequest
	if err := helpers.BindAndValidate(c, &req); err != nil {
		helpers.SendValidationErrors(c, err)
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	err := h.userService.VerifyEmailToken(ctx, req.Token)
	if err != nil {
		helpers.SendError(c, err)
		return
	}

	helpers.SendSuccess(c, "Email verified successfully", nil)
}

// ResendVerification resends email verification
// POST /api/auth/resend-verification
func (h *AuthHandler) ResendVerification(c *gin.Context) {
	user, exists := middleware.GetCurrentUser(c)
	if !exists {
		helpers.SendInternalError(c, models.ErrUserNotFound)
		return
	}

	if user.Verified {
		helpers.SendBadRequest(c, "Email is already verified")
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	// Create new verification token
	verificationToken, err := h.userService.CreateEmailVerificationToken(ctx, user.ID)
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	// Send verification email
	if err := h.emailService.SendVerificationEmail(user.Email, user.Name, verificationToken.Token); err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	helpers.SendSuccess(c, "Verification email sent successfully", nil)
}

// RevokeAllTokens revokes all refresh tokens for current user
// POST /api/auth/revoke-all-tokens
func (h *AuthHandler) RevokeAllTokens(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		helpers.SendInternalError(c, models.ErrUserNotFound)
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	err := h.userService.RevokeAllUserRefreshTokens(ctx, userID)
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	helpers.SendSuccess(c, "All tokens revoked successfully. Please log in again on all devices.", nil)
}

// Register handles user registration
// POST /api/auth/register
func (h *AuthHandler) Register(c *gin.Context) {
	var req models.RegisterUserRequest
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

	// Create user in database using RegisterUser method
	createdUser, err := h.userService.RegisterUser(ctx, &req)
	if err != nil {
		helpers.SendError(c, err)
		return
	}

	// Send registration pending email
	if err := h.emailService.SendRegistrationPendingEmail(createdUser.Email, createdUser.Name); err != nil {
		// Log error but don't fail the registration
	}

	responseData := map[string]interface{}{
		"user_id": createdUser.ID,
		"email":   createdUser.Email,
		"status":  createdUser.Status,
	}

	helpers.SendCreated(c, "Registration successful. Your account is pending admin validation.", responseData)
}
