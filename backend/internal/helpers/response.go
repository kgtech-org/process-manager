package helpers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kodesonik/process-manager/internal/models"
	"go.mongodb.org/mongo-driver/mongo"
)

// ============================================
// Success Response Handlers
// ============================================

// SendSuccess sends a success response with data
func SendSuccess(c *gin.Context, message string, data interface{}) {
	c.JSON(http.StatusOK, models.NewSuccessResponse(message, data))
}

// SendCreated sends a created response with data
func SendCreated(c *gin.Context, message string, data interface{}) {
	c.JSON(http.StatusCreated, models.NewSuccessResponse(message, data))
}

// SendPaginated sends a paginated response
func SendPaginated(c *gin.Context, data interface{}, page, limit int, total int64) {
	c.JSON(http.StatusOK, models.NewPaginatedResponse(data, page, limit, total))
}

// SendNoContent sends a no content response
func SendNoContent(c *gin.Context) {
	c.Status(http.StatusNoContent)
}

// ============================================
// Error Response Handlers
// ============================================

// SendError sends an error response based on error type
func SendError(c *gin.Context, err error) {
	switch {
	case err == models.ErrUserNotFound:
		SendNotFound(c, "User not found")
	case err == models.ErrEmailExists:
		SendConflict(c, "Email already exists")
	case err == models.ErrInvalidOTP || err == models.ErrOTPExpired:
		SendUnauthorized(c, err.Error(), models.CodeInvalidOTP)
	case err == models.ErrTooManyAttempts:
		SendTooManyRequests(c, "Too many attempts, please try again later")
	case err == models.ErrAccountPending:
		SendForbidden(c, "Account is pending admin validation", models.CodeAccountPending)
	case err == models.ErrAccountRejected:
		SendForbidden(c, "Account has been rejected", models.CodeAccountRejected)
	case err == models.ErrAccountInactive:
		SendForbidden(c, "Account is inactive", models.CodeAccountInactive)
	case err == models.ErrInvalidToken || err == models.ErrTokenExpired:
		SendUnauthorized(c, err.Error(), models.CodeInvalidToken)
	case err == models.ErrUnauthorized:
		SendUnauthorized(c, "Unauthorized access", models.CodeUnauthorized)
	case err == models.ErrInsufficientPermissions:
		SendForbidden(c, "Insufficient permissions", models.CodeInsufficientRole)
	case err == mongo.ErrNoDocuments:
		SendNotFound(c, "Resource not found")
	default:
		SendInternalError(c, err)
	}
}

// SendBadRequest sends a bad request error response
func SendBadRequest(c *gin.Context, message string, details ...string) {
	c.JSON(http.StatusBadRequest, models.NewErrorResponse(
		message,
		models.CodeInvalidRequest,
		details...,
	))
}

// SendUnauthorized sends an unauthorized error response
func SendUnauthorized(c *gin.Context, message string, code string) {
	c.JSON(http.StatusUnauthorized, models.NewErrorResponse(
		message,
		code,
	))
}

// SendForbidden sends a forbidden error response
func SendForbidden(c *gin.Context, message string, code string) {
	c.JSON(http.StatusForbidden, models.NewErrorResponse(
		message,
		code,
	))
}

// SendNotFound sends a not found error response
func SendNotFound(c *gin.Context, message string) {
	c.JSON(http.StatusNotFound, models.NewErrorResponse(
		message,
		models.CodeUserNotFound,
	))
}

// SendConflict sends a conflict error response
func SendConflict(c *gin.Context, message string) {
	c.JSON(http.StatusConflict, models.NewErrorResponse(
		message,
		models.CodeEmailExists,
	))
}

// SendTooManyRequests sends a rate limit error response
func SendTooManyRequests(c *gin.Context, message string) {
	c.JSON(http.StatusTooManyRequests, models.NewErrorResponse(
		message,
		models.CodeTooManyAttempts,
	))
}

// SendInternalError sends an internal server error response
func SendInternalError(c *gin.Context, err error) {
	// Log the actual error for debugging
	// TODO: Add proper logging here

	c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
		"An internal error occurred",
		models.CodeInternalError,
		err.Error(),
	))
}

// SendValidationError sends a validation error response
func SendValidationError(c *gin.Context, errors []models.ValidationError) {
	c.JSON(http.StatusBadRequest, models.ValidationErrorResponse{
		Success: false,
		Error:   "Validation failed",
		Errors:  errors,
	})
}

// ============================================
// Conditional Response Handlers
// ============================================

// SendOTPResponse sends OTP response based on environment
func SendOTPResponse(c *gin.Context, email string, otp string, isDevelopment bool) {
	response := models.OTPResponse{
		Email:            email,
		ExpiresInMinutes: 5,
	}

	// Include OTP in response for development mode
	if isDevelopment {
		response.OTP = otp
	}

	SendSuccess(c, "OTP sent to your email address", response)
}

// SendLoginResponse sends login response with tokens
func SendLoginResponse(c *gin.Context, user *models.User, tokens *models.TokenPair) {
	response := models.LoginResponse{
		User:         user.ToResponse(),
		AccessToken:  tokens.AccessToken,
		RefreshToken: tokens.RefreshToken,
		ExpiresAt:    tokens.ExpiresAt,
		TokenType:    "Bearer",
	}

	SendSuccess(c, "Login successful", response)
}
