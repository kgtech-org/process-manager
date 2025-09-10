package models

import (
	"time"
)

// ============================================
// Authentication Request/Response Models
// ============================================

// LoginRequest represents the request payload for user login (OTP request)
type LoginRequest struct {
	Email string `json:"email" validate:"required,email"`
}

// ============================================
// Registration Request Models (3-Step Process)
// ============================================

// Step1RegistrationRequest represents step 1 of registration (email verification)
type Step1RegistrationRequest struct {
	Email string `json:"email" validate:"required,email"`
}

// Step2RegistrationRequest represents step 2 of registration (OTP verification)
type Step2RegistrationRequest struct {
	OTP string `json:"otp" validate:"required,len=6"`
}

// Step3RegistrationRequest represents step 3 of registration (complete profile)
type Step3RegistrationRequest struct {
	Name          string `json:"name" validate:"required,min=2,max=100"`
	Phone         string `json:"phone,omitempty"`
	DepartmentID  string `json:"departmentId" validate:"required"`
	JobPositionID string `json:"jobPositionId" validate:"required"`
}

// VerifyOTPRequest represents the request payload for OTP verification
type VerifyOTPRequest struct {
	OTP string `json:"otp" validate:"required,len=6"`
}

// RefreshTokenRequest represents the request payload for token refresh
type RefreshTokenRequest struct {
	RefreshToken string `json:"refreshToken" validate:"required"`
}

// VerifyEmailRequest represents the request payload for email verification
type VerifyEmailRequest struct {
	Token string `json:"token" validate:"required"`
}

// LogoutRequest represents the request payload for logout
type LogoutRequest struct {
	RefreshToken string `json:"refreshToken,omitempty"`
}

// ============================================
// Authentication Response Models
// ============================================

// LoginResponse represents the successful login response
type LoginResponse struct {
	User         UserResponse `json:"user"`
	AccessToken  string       `json:"accessToken"`
	RefreshToken string       `json:"refreshToken"`
	ExpiresAt    time.Time    `json:"expiresAt"`
	TokenType    string       `json:"tokenType"`
}

// OTPResponse represents the OTP request response
type OTPResponse struct {
	TemporaryToken   string `json:"temporaryToken"`
	ExpiresInMinutes int    `json:"expiresInMinutes"`
	OTP              string `json:"otp,omitempty"` // Only in development mode
}

// RegistrationStep1Response represents the response for step 1 of registration
type RegistrationStep1Response struct {
	TemporaryToken   string `json:"temporaryToken"`
	ExpiresInMinutes int    `json:"expiresInMinutes"`
	OTP              string `json:"otp,omitempty"` // Only in development mode
	NextStep         int    `json:"nextStep"`
}

// RegistrationStep2Response represents the response for step 2 of registration
type RegistrationStep2Response struct {
	RegistrationToken string `json:"registrationToken"`
	ExpiresInMinutes  int    `json:"expiresInMinutes"`
	NextStep          int    `json:"nextStep"`
}

// RegistrationStep3Response represents the response for step 3 of registration (completion)
type RegistrationStep3Response struct {
	UserID   string `json:"userId"`
	Email    string `json:"email"`
	Name     string `json:"name"`
	Status   string `json:"status"`
	Message  string `json:"message"`
}

// ============================================
// Token Models
// ============================================

// OTPToken represents an OTP token stored in Redis
type OTPToken struct {
	Email     string    `json:"email"`
	OTP       string    `json:"otp"`
	ExpiresAt time.Time `json:"expiresAt"`
	Attempts  int       `json:"attempts"`
	CreatedAt time.Time `json:"createdAt"`
}


// TokenPair represents an access and refresh token pair
type TokenPair struct {
	AccessToken  string    `json:"accessToken"`
	RefreshToken string    `json:"refreshToken"`
	ExpiresAt    time.Time `json:"expiresAt"`
}

// JWTClaims represents the custom JWT claims
type JWTClaims struct {
	UserID string   `json:"userId"`
	Email  string   `json:"email"`
	Name   string   `json:"name"`
	Role   UserRole `json:"role"`
}
