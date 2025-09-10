package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
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
	DepartmentID  string `json:"department_id" validate:"required"`
	JobPositionID string `json:"job_position_id" validate:"required"`
}

// VerifyOTPRequest represents the request payload for OTP verification
type VerifyOTPRequest struct {
	OTP string `json:"otp" validate:"required,len=6"`
}

// RefreshTokenRequest represents the request payload for token refresh
type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

// VerifyEmailRequest represents the request payload for email verification
type VerifyEmailRequest struct {
	Token string `json:"token" validate:"required"`
}

// LogoutRequest represents the request payload for logout
type LogoutRequest struct {
	RefreshToken string `json:"refresh_token,omitempty"`
}

// ============================================
// Authentication Response Models
// ============================================

// LoginResponse represents the successful login response
type LoginResponse struct {
	User         UserResponse `json:"user"`
	AccessToken  string       `json:"access_token"`
	RefreshToken string       `json:"refresh_token"`
	ExpiresAt    time.Time    `json:"expires_at"`
	TokenType    string       `json:"token_type"`
}

// OTPResponse represents the OTP request response
type OTPResponse struct {
	TemporaryToken   string `json:"temporary_token"`
	ExpiresInMinutes int    `json:"expires_in_minutes"`
	OTP              string `json:"otp,omitempty"` // Only in development mode
}

// RegistrationStep1Response represents the response for step 1 of registration
type RegistrationStep1Response struct {
	TemporaryToken   string `json:"temporary_token"`
	ExpiresInMinutes int    `json:"expires_in_minutes"`
	OTP              string `json:"otp,omitempty"` // Only in development mode
	NextStep         int    `json:"next_step"`
}

// RegistrationStep2Response represents the response for step 2 of registration
type RegistrationStep2Response struct {
	RegistrationToken string `json:"registration_token"`
	ExpiresInMinutes  int    `json:"expires_in_minutes"`
	NextStep          int    `json:"next_step"`
}

// RegistrationStep3Response represents the response for step 3 of registration (completion)
type RegistrationStep3Response struct {
	UserID   string `json:"user_id"`
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
	ExpiresAt time.Time `json:"expires_at"`
	Attempts  int       `json:"attempts"`
	CreatedAt time.Time `json:"created_at"`
}

// EmailVerificationToken represents an email verification token
type EmailVerificationToken struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	UserID    primitive.ObjectID `bson:"user_id" json:"user_id"`
	Token     string             `bson:"token" json:"token"`
	ExpiresAt time.Time          `bson:"expires_at" json:"expires_at"`
	Used      bool               `bson:"used" json:"used"`
	CreatedAt time.Time          `bson:"created_at" json:"created_at"`
}

// RefreshToken represents a JWT refresh token
type RefreshToken struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	UserID    primitive.ObjectID `bson:"user_id" json:"user_id"`
	Token     string             `bson:"token" json:"token"`
	ExpiresAt time.Time          `bson:"expires_at" json:"expires_at"`
	Revoked   bool               `bson:"revoked" json:"revoked"`
	CreatedAt time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time          `bson:"updated_at" json:"updated_at"`
}

// TokenPair represents an access and refresh token pair
type TokenPair struct {
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	ExpiresAt    time.Time `json:"expires_at"`
}

// JWTClaims represents the custom JWT claims
type JWTClaims struct {
	UserID string   `json:"user_id"`
	Email  string   `json:"email"`
	Name   string   `json:"name"`
	Role   UserRole `json:"role"`
}
