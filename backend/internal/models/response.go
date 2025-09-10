package models

// ============================================
// Generic API Response Models
// ============================================

// SuccessResponse represents a standard success response
type SuccessResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
}

// ErrorResponse represents a standard error response
type ErrorResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
	Code    string `json:"code,omitempty"`
	Details string `json:"details,omitempty"`
}

// PaginatedResponse represents a paginated response
type PaginatedResponse struct {
	Success    bool        `json:"success"`
	Data       interface{} `json:"data"`
	Pagination Pagination  `json:"pagination"`
}

// Pagination represents pagination metadata
type Pagination struct {
	Page       int   `json:"page"`
	Limit      int   `json:"limit"`
	Total      int64 `json:"total"`
	TotalPages int64 `json:"total_pages"`
}

// ValidationError represents field validation errors
type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
	Tag     string `json:"tag,omitempty"`
}

// ValidationErrorResponse represents validation error response
type ValidationErrorResponse struct {
	Success bool              `json:"success"`
	Error   string            `json:"error"`
	Errors  []ValidationError `json:"errors,omitempty"`
}

// ============================================
// Standard Response Codes
// ============================================

const (
	// Success codes
	CodeSuccess = "SUCCESS"

	// Authentication error codes
	CodeInvalidCredentials = "INVALID_CREDENTIALS"
	CodeInvalidOTP         = "INVALID_OTP"
	CodeOTPExpired         = "OTP_EXPIRED"
	CodeTooManyAttempts    = "TOO_MANY_ATTEMPTS"
	CodeTokenExpired       = "TOKEN_EXPIRED"
	CodeInvalidToken       = "INVALID_TOKEN"
	CodeUnauthorized       = "UNAUTHORIZED"

	// User status error codes
	CodeAccountPending  = "ACCOUNT_PENDING"
	CodeAccountRejected = "ACCOUNT_REJECTED"
	CodeAccountInactive = "ACCOUNT_INACTIVE"
	CodeUserNotFound    = "USER_NOT_FOUND"
	CodeEmailExists     = "EMAIL_EXISTS"

	// Validation error codes
	CodeValidationFailed = "VALIDATION_FAILED"
	CodeInvalidRequest   = "INVALID_REQUEST"

	// Permission error codes
	CodeForbidden        = "FORBIDDEN"
	CodeInsufficientRole = "INSUFFICIENT_ROLE"

	// Server error codes
	CodeInternalError = "INTERNAL_ERROR"
	CodeDatabaseError = "DATABASE_ERROR"
	CodeServiceError  = "SERVICE_ERROR"
)

// ============================================
// Helper Functions for Response Creation
// ============================================

// NewSuccessResponse creates a new success response
func NewSuccessResponse(message string, data interface{}) SuccessResponse {
	return SuccessResponse{
		Success: true,
		Message: message,
		Data:    data,
	}
}

// NewErrorResponse creates a new error response
func NewErrorResponse(error string, code string, details ...string) ErrorResponse {
	resp := ErrorResponse{
		Success: false,
		Error:   error,
		Code:    code,
	}
	if len(details) > 0 {
		resp.Details = details[0]
	}
	return resp
}

// NewPaginatedResponse creates a new paginated response
func NewPaginatedResponse(data interface{}, page, limit int, total int64) PaginatedResponse {
	totalPages := (total + int64(limit) - 1) / int64(limit)
	return PaginatedResponse{
		Success: true,
		Data:    data,
		Pagination: Pagination{
			Page:       page,
			Limit:      limit,
			Total:      total,
			TotalPages: totalPages,
		},
	}
}
