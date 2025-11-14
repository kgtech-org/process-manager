package handlers

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kodesonik/process-manager/internal/helpers"
	"github.com/kodesonik/process-manager/internal/middleware"
	"github.com/kodesonik/process-manager/internal/models"
	"github.com/kodesonik/process-manager/internal/services"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// AuthHandler handles authentication-related HTTP requests
type AuthHandler struct {
	userService  *services.UserService
	jwtService   *services.JWTService
	emailService *services.EmailService
	otpService   *services.OTPService
	pinService   *services.PinService
	minioService *services.MinIOService
}

// NewAuthHandler creates a new auth handler instance
func NewAuthHandler(userService *services.UserService, jwtService *services.JWTService, emailService *services.EmailService, otpService *services.OTPService, pinService *services.PinService, minioService *services.MinIOService) *AuthHandler {
	return &AuthHandler{
		userService:  userService,
		jwtService:   jwtService,
		emailService: emailService,
		otpService:   otpService,
		pinService:   pinService,
		minioService: minioService,
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

	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
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

	// Send OTP via email asynchronously to avoid blocking the response
	fullName := user.FirstName + " " + user.LastName
	go func() {
		if err := h.emailService.SendOTPEmail(user.Email, fullName, otp); err != nil {
			// Log error but don't block the response
			fmt.Printf("Failed to send OTP email to %s: %v\n", user.Email, err)
		}
	}()

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

	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
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

	// Generate access token
	accessToken, err := h.jwtService.GenerateAccessToken(user)
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	// Create refresh token in Redis
	refreshToken, err := h.otpService.CreateRefreshToken(ctx, user.ID.Hex())
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	// Create token pair using Redis refresh token
	tokenPair := &models.TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresAt:    time.Now().Add(15 * time.Minute), // Access token expiry
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
		// Revoke the specific refresh token in Redis
		ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
		defer cancel()

		if err := h.otpService.RevokeRefreshToken(ctx, req.RefreshToken); err != nil {
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

	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	// Validate refresh token in Redis
	userIDStr, err := h.otpService.ValidateRefreshToken(ctx, req.RefreshToken)
	if err != nil {
		helpers.SendError(c, err)
		return
	}

	// Convert userID string to ObjectID
	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		helpers.SendError(c, models.ErrInvalidToken)
		return
	}

	// Get user
	user, err := h.userService.GetUserByID(ctx, userID)
	if err != nil {
		helpers.SendError(c, err)
		return
	}

	// Generate new access token
	accessToken, err := h.jwtService.GenerateAccessToken(user)
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	// Revoke current refresh token in Redis
	if err := h.otpService.RevokeRefreshToken(ctx, req.RefreshToken); err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	// Create new refresh token in Redis
	refreshToken, err := h.otpService.CreateRefreshToken(ctx, user.ID.Hex())
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	// Create token pair using Redis refresh token
	tokenPair := &models.TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresAt:    time.Now().Add(15 * time.Minute), // Access token expiry
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

	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	// Get user response with populated details
	userResponse, err := h.userService.ToResponseWithDetails(ctx, user)
	if err != nil {
		// Fallback to basic response if population fails
		userResponse = user.ToResponse()
	}

	helpers.SendSuccess(c, "User information retrieved successfully", userResponse)
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

	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	updatedUser, err := h.userService.UpdateUser(ctx, userID, &req)
	if err != nil {
		helpers.SendError(c, err)
		return
	}

	// Get user response with populated details
	userResponse, err := h.userService.ToResponseWithDetails(ctx, updatedUser)
	if err != nil {
		// Fallback to basic response if population fails
		userResponse = updatedUser.ToResponse()
	}

	helpers.SendSuccess(c, "Profile updated successfully", userResponse)
}

// RevokeAllTokens revokes all refresh tokens for current user
// POST /api/auth/revoke-all-tokens
func (h *AuthHandler) RevokeAllTokens(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		helpers.SendInternalError(c, models.ErrUserNotFound)
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	err := h.otpService.RevokeAllUserRefreshTokens(ctx, userID.Hex())
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	helpers.SendSuccess(c, "All tokens revoked successfully. Please log in again on all devices.", nil)
}

// ============================================
// 3-Step Registration Process
// ============================================

// RegisterStep1 handles step 1 of registration (email verification)
// POST /api/auth/register/step1
func (h *AuthHandler) RegisterStep1(c *gin.Context) {
	var req models.Step1RegistrationRequest
	if err := helpers.BindAndValidate(c, &req); err != nil {
		helpers.SendValidationErrors(c, err)
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	// Check if user already exists
	existingUser, err := h.userService.GetUserByEmail(ctx, req.Email)
	if err == nil && existingUser != nil {
		helpers.SendError(c, models.ErrEmailExists)
		return
	}

	// Generate and store OTP
	otp, err := h.otpService.GenerateOTP(ctx, req.Email)
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	// Generate temporary token for OTP verification
	tempToken, err := h.otpService.GenerateTemporaryToken(ctx, req.Email)
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	// Send OTP via email
	if err := h.emailService.SendRegistrationOTPEmail(req.Email, otp); err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	// Check if development mode
	isDevelopment := os.Getenv("GIN_MODE") == "debug" || os.Getenv("DEVELOPMENT_MODE") == "true"

	response := models.RegistrationStep1Response{
		TemporaryToken:   tempToken,
		ExpiresInMinutes: 5,
		NextStep:         2,
	}

	// Include OTP in response for development mode
	if isDevelopment {
		response.OTP = otp
	}

	helpers.SendSuccess(c, "OTP sent to your email address. Please verify to continue registration.", response)
}

// RegisterStep2 handles step 2 of registration (OTP verification)
// POST /api/auth/register/step2
func (h *AuthHandler) RegisterStep2(c *gin.Context) {
	// Get temporary token from header
	tempToken := c.GetHeader("X-Temp-Token")
	if tempToken == "" {
		helpers.SendError(c, models.ErrInvalidToken)
		return
	}

	var req models.Step2RegistrationRequest
	if err := helpers.BindAndValidate(c, &req); err != nil {
		helpers.SendValidationErrors(c, err)
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
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

	// Generate registration token for step 3
	registrationToken, err := h.otpService.GenerateRegistrationToken(ctx, email)
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	response := models.RegistrationStep2Response{
		RegistrationToken: registrationToken,
		ExpiresInMinutes:  30,
		NextStep:          3,
	}

	helpers.SendSuccess(c, "Email verified successfully. Please complete your registration.", response)
}

// RegisterStep3 handles step 3 of registration (complete profile)
// POST /api/auth/register/step3
func (h *AuthHandler) RegisterStep3(c *gin.Context) {
	log.Println("📝 RegisterStep3: Starting registration step 3")

	// Get registration token from header
	regToken := c.GetHeader("X-Registration-Token")
	if regToken == "" {
		log.Println("❌ RegisterStep3: No registration token provided")
		helpers.SendError(c, models.ErrInvalidToken)
		return
	}
	log.Printf("✓ RegisterStep3: Registration token received: %s...\n", regToken[:10])

	var req models.Step3RegistrationRequest
	if err := helpers.BindAndValidate(c, &req); err != nil {
		log.Printf("❌ RegisterStep3: Validation failed: %v\n", err)
		helpers.SendValidationErrors(c, err)
		return
	}
	log.Printf("✓ RegisterStep3: Request validated - DeptID: %s, JobPosID: %s\n", req.DepartmentID, req.JobPositionID)

	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	// Get email from registration token
	log.Println("🔍 RegisterStep3: Getting email from registration token")
	email, err := h.otpService.GetEmailFromRegistrationToken(ctx, regToken)
	if err != nil {
		log.Printf("❌ RegisterStep3: Failed to get email from token: %v\n", err)
		helpers.SendError(c, err)
		return
	}
	log.Printf("✓ RegisterStep3: Email retrieved: %s\n", email)

	// Check if user already exists (double-check)
	log.Println("🔍 RegisterStep3: Checking for existing user")
	existingUser, err := h.userService.GetUserByEmail(ctx, email)
	if err == nil && existingUser != nil {
		log.Printf("❌ RegisterStep3: User already exists: %s\n", email)
		helpers.SendError(c, models.ErrEmailExists)
		return
	}
	log.Println("✓ RegisterStep3: No existing user found")

	// Create user in database
	log.Println("📝 RegisterStep3: Creating user in database")
	createdUser, err := h.userService.CreateUserFromRegistration(ctx, email, &req)
	if err != nil {
		log.Printf("❌ RegisterStep3: Failed to create user: %v\n", err)
		helpers.SendError(c, err)
		return
	}
	log.Printf("✓ RegisterStep3: User created successfully: %s (ID: %s)\n", createdUser.Email, createdUser.ID.Hex())

	// Delete registration token after successful registration
	log.Println("🗑️  RegisterStep3: Deleting registration token")
	h.otpService.DeleteRegistrationToken(ctx, regToken)

	// Send registration pending email to admins
	fullName := createdUser.FirstName + " " + createdUser.LastName
	log.Printf("📧 RegisterStep3: Sending registration pending email for %s\n", fullName)
	if err := h.emailService.SendRegistrationPendingEmail(createdUser.Email, fullName); err != nil {
		log.Printf("⚠️  RegisterStep3: Failed to send email (non-critical): %v\n", err)
		// Log error but don't fail the registration
	}

	response := models.RegistrationStep3Response{
		UserID:    createdUser.ID.Hex(),
		Email:     createdUser.Email,
		FirstName: createdUser.FirstName,
		LastName:  createdUser.LastName,
		Status:    string(createdUser.Status),
		Message:   "Registration completed successfully. Your account is pending admin validation.",
	}

	log.Println("✅ RegisterStep3: Registration completed successfully")
	helpers.SendCreated(c, "Registration successful. Your account is pending admin validation.", response)
}

// UploadAvatar handles user avatar/profile picture upload
// POST /api/auth/avatar
func (h *AuthHandler) UploadAvatar(c *gin.Context) {
	// Get current user from middleware
	user, exists := middleware.GetCurrentUser(c)
	if !exists {
		helpers.SendInternalError(c, models.ErrUserNotFound)
		return
	}

	// Parse multipart form
	err := c.Request.ParseMultipartForm(10 << 20) // 10MB max memory
	if err != nil {
		helpers.SendBadRequest(c, "Failed to parse multipart form")
		return
	}

	// Get the file from form
	fileHeader, err := c.FormFile("avatar")
	if err != nil {
		helpers.SendBadRequest(c, "No file provided. Please include 'avatar' field in form")
		return
	}

	// Get upload limits
	maxSizeMB, _ := h.minioService.GetUploadLimits()
	maxSizeMBInt := maxSizeMB / (1024 * 1024)

	// Validate the uploaded file
	validation := helpers.ValidateImageUpload(fileHeader, maxSizeMBInt)
	if !validation.Valid {
		helpers.SendBadRequest(c, validation.Error)
		return
	}

	// Open the file
	file, err := fileHeader.Open()
	if err != nil {
		helpers.SendInternalError(c, models.ErrServiceUnavailable)
		return
	}
	defer file.Close()

	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	// Delete old avatar if exists
	if user.Avatar != "" {
		err := h.minioService.DeleteAvatar(ctx, user.Avatar)
		if err != nil {
			// Log error but don't fail the upload
		}
	}

	// Upload new avatar to MinIO
	avatarURL, err := h.minioService.UploadAvatar(
		ctx,
		user.ID.Hex(),
		file,
		fileHeader.Size,
		validation.ContentType,
		validation.Filename,
	)
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	// Update user's avatar URL in database
	updateReq := &models.UpdateProfileRequest{
		Avatar: avatarURL,
	}

	updatedUser, err := h.userService.UpdateUser(ctx, user.ID, updateReq)
	if err != nil {
		// Avatar uploaded but failed to update database
		// Try to clean up the uploaded file
		h.minioService.DeleteAvatar(ctx, avatarURL)
		helpers.SendInternalError(c, err)
		return
	}

	// Return success response
	response := gin.H{
		"userId":  updatedUser.ID.Hex(),
		"avatar":  avatarURL,
		"message": "Profile picture uploaded successfully",
	}

	helpers.SendSuccess(c, "Profile picture uploaded successfully", response)
}

// DeleteAvatar handles user avatar deletion
// DELETE /api/auth/avatar
func (h *AuthHandler) DeleteAvatar(c *gin.Context) {
	// Get current user from middleware
	user, exists := middleware.GetCurrentUser(c)
	if !exists {
		helpers.SendInternalError(c, models.ErrUserNotFound)
		return
	}

	if user.Avatar == "" {
		helpers.SendBadRequest(c, "No profile picture to delete")
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	// Delete avatar from MinIO
	err := h.minioService.DeleteAvatar(ctx, user.Avatar)
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	// Update user's avatar URL in database (set to empty)
	updateReq := &models.UpdateProfileRequest{
		Avatar: "",
	}

	updatedUser, err := h.userService.UpdateUser(ctx, user.ID, updateReq)
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	response := gin.H{
		"user_id": updatedUser.ID.Hex(),
		"message": "Profile picture deleted successfully",
	}

	helpers.SendSuccess(c, "Profile picture deleted successfully", response)
}

// ============================================
// PIN Authentication Endpoints
// ============================================

// SetPin sets or updates a user's PIN
// POST /api/auth/set-pin
func (h *AuthHandler) SetPin(c *gin.Context) {
	var req models.SetPinRequest
	if err := helpers.BindAndValidate(c, &req); err != nil {
		helpers.SendValidationErrors(c, err)
		return
	}

	// Get authenticated user from context
	user, exists := middleware.GetCurrentUser(c)
	if !exists {
		helpers.SendUnauthorized(c, "User not authenticated", "AUTH_REQUIRED")
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	// Set PIN
	err := h.pinService.SetPin(ctx, user.ID, req.Pin, req.ConfirmPin)
	if err != nil {
		helpers.SendBadRequest(c, err.Error())
		return
	}

	helpers.SendSuccess(c, "PIN set successfully", nil)
}

// VerifyPin verifies a user's PIN and logs them in
// POST /api/auth/verify-pin
func (h *AuthHandler) VerifyPin(c *gin.Context) {
	var req models.VerifyPinRequest
	if err := helpers.BindAndValidate(c, &req); err != nil {
		helpers.SendValidationErrors(c, err)
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	// Verify PIN
	user, err := h.pinService.VerifyPin(ctx, req.Email, req.Pin)
	if err != nil {
		// Check if account is locked
		isLocked, _ := h.pinService.IsLocked(ctx, req.Email)
		if isLocked {
			helpers.SendForbidden(c, err.Error(), "PIN_LOCKED")
			return
		}
		helpers.SendBadRequest(c, err.Error())
		return
	}

	// Check if user can login
	if !user.CanLogin() {
		helpers.SendForbidden(c, "Account is not active or is pending validation", "ACCOUNT_INACTIVE")
		return
	}

	// Generate access token
	accessToken, err := h.jwtService.GenerateAccessToken(user)
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	// Create refresh token in Redis
	refreshToken, err := h.otpService.CreateRefreshToken(ctx, user.ID.Hex())
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	// Create token pair
	tokenPair := &models.TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresAt:    time.Now().Add(15 * time.Minute), // Access token expiry
	}

	// Update last login
	if err := h.userService.UpdateLastLogin(ctx, user.ID); err != nil {
		// Log error but continue
		fmt.Printf("Failed to update last login: %v\n", err)
	}

	// Send login response
	helpers.SendLoginResponse(c, user, tokenPair)
}

// RequestPinReset sends an OTP for PIN reset
// POST /api/auth/request-pin-reset
func (h *AuthHandler) RequestPinReset(c *gin.Context) {
	var req models.RequestPinResetRequest
	if err := helpers.BindAndValidate(c, &req); err != nil {
		helpers.SendValidationErrors(c, err)
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	// Find user by email
	user, err := h.userService.GetUserByEmail(ctx, req.Email)
	if err != nil {
		// Don't reveal if user exists or not for security
		helpers.SendSuccess(c, "If the email exists in our system, an OTP has been sent", nil)
		return
	}

	// Generate OTP
	otp, err := h.otpService.GenerateOTP(ctx, user.Email)
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	// Send OTP email for PIN reset
	fullName := fmt.Sprintf("%s %s", user.FirstName, user.LastName)
	if err := h.emailService.SendOTPEmail(user.Email, fullName, otp); err != nil {
		fmt.Printf("Failed to send PIN reset email to %s: %v\n", user.Email, err)
	}

	helpers.SendSuccess(c, "If the email exists in our system, an OTP has been sent", nil)
}

// ResetPin resets a user's PIN after OTP verification
// POST /api/auth/reset-pin
func (h *AuthHandler) ResetPin(c *gin.Context) {
	var req models.ResetPinRequest
	if err := helpers.BindAndValidate(c, &req); err != nil {
		helpers.SendValidationErrors(c, err)
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	// Reset PIN (OTP verification happens inside this method)
	err := h.pinService.ResetPin(ctx, req.Email, req.Otp, req.NewPin, req.ConfirmPin)
	if err != nil {
		helpers.SendBadRequest(c, err.Error())
		return
	}

	helpers.SendSuccess(c, "PIN reset successfully", nil)
}

// CheckPinStatus checks if a user has PIN set up
// POST /api/auth/check-pin-status
func (h *AuthHandler) CheckPinStatus(c *gin.Context) {
	var req models.CheckPinStatusRequest
	if err := helpers.BindAndValidate(c, &req); err != nil {
		helpers.SendValidationErrors(c, err)
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	hasPin, isLocked, err := h.pinService.CheckPinStatus(ctx, req.Email)
	if err != nil {
		// Don't reveal if user exists
		response := gin.H{
			"hasPin":   false,
			"isLocked": false,
		}
		helpers.SendSuccess(c, "Status retrieved", response)
		return
	}

	response := gin.H{
		"hasPin":   hasPin,
		"isLocked": isLocked,
	}

	helpers.SendSuccess(c, "Status retrieved", response)
}

