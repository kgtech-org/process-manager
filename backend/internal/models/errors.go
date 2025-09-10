package models

import "errors"

// ============================================
// Domain Errors
// ============================================

var (
	// User errors
	ErrUserNotFound  = errors.New("user not found")
	ErrEmailExists   = errors.New("email already exists")
	ErrInvalidEmail  = errors.New("invalid email format")
	ErrInvalidRole   = errors.New("invalid user role")
	ErrInvalidStatus = errors.New("invalid user status")

	// Authentication errors
	ErrInvalidToken     = errors.New("invalid or expired token")
	ErrTokenExpired     = errors.New("token has expired")
	ErrTokenAlreadyUsed = errors.New("token has already been used")
	ErrInvalidOTP       = errors.New("invalid or expired OTP")
	ErrOTPExpired       = errors.New("OTP has expired")
	ErrTooManyAttempts  = errors.New("too many OTP attempts")
	ErrUnauthorized     = errors.New("unauthorized access")

	// User status errors
	ErrAccountPending  = errors.New("account is pending admin validation")
	ErrAccountRejected = errors.New("account has been rejected")
	ErrAccountInactive = errors.New("account is inactive")
	ErrCannotLogin     = errors.New("user cannot login")

	// Permission errors
	ErrInsufficientPermissions = errors.New("insufficient permissions")
	ErrForbidden               = errors.New("forbidden access")

	// Validation errors
	ErrValidationFailed = errors.New("validation failed")
	ErrInvalidRequest   = errors.New("invalid request")
	ErrMissingRequired  = errors.New("missing required fields")

	// Database errors
	ErrDatabaseConnection = errors.New("database connection failed")
	ErrDatabaseOperation  = errors.New("database operation failed")

	// Service errors
	ErrServiceUnavailable = errors.New("service temporarily unavailable")
	ErrEmailSendFailed    = errors.New("failed to send email")
	ErrRedisOperation     = errors.New("redis operation failed")
)

// ============================================
// Error Type Checking Functions
// ============================================

// IsNotFoundError checks if error is a not found error
func IsNotFoundError(err error) bool {
	return errors.Is(err, ErrUserNotFound)
}

// IsValidationError checks if error is a validation error
func IsValidationError(err error) bool {
	return errors.Is(err, ErrValidationFailed) ||
		errors.Is(err, ErrInvalidRequest) ||
		errors.Is(err, ErrMissingRequired)
}

// IsAuthenticationError checks if error is an authentication error
func IsAuthenticationError(err error) bool {
	return errors.Is(err, ErrInvalidToken) ||
		errors.Is(err, ErrTokenExpired) ||
		errors.Is(err, ErrInvalidOTP) ||
		errors.Is(err, ErrOTPExpired) ||
		errors.Is(err, ErrUnauthorized)
}

// IsPermissionError checks if error is a permission error
func IsPermissionError(err error) bool {
	return errors.Is(err, ErrInsufficientPermissions) ||
		errors.Is(err, ErrForbidden)
}

// IsUserStatusError checks if error is related to user status
func IsUserStatusError(err error) bool {
	return errors.Is(err, ErrAccountPending) ||
		errors.Is(err, ErrAccountRejected) ||
		errors.Is(err, ErrAccountInactive) ||
		errors.Is(err, ErrCannotLogin)
}

// GetAccountStatusError returns the appropriate error for user status
func GetAccountStatusError(status UserStatus) error {
	switch status {
	case StatusPending:
		return ErrAccountPending
	case StatusRejected:
		return ErrAccountRejected
	case StatusInactive:
		return ErrAccountInactive
	default:
		return ErrUnauthorized
	}
}
