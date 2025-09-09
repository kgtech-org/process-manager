package models

import (
	"context"
	"errors"
	"regexp"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"golang.org/x/crypto/bcrypt"
)

// UserRole represents user roles in the system
type UserRole string

const (
	RoleAdmin   UserRole = "admin"
	RoleManager UserRole = "manager"
	RoleUser    UserRole = "user"
)

// User represents a user in the system
type User struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	Email       string             `bson:"email" json:"email" validate:"required,email"`
	Name        string             `bson:"name" json:"name" validate:"required,min=2,max=100"`
	Password    string             `bson:"password" json:"-" validate:"required,min=8"`
	Role        UserRole           `bson:"role" json:"role" validate:"required"`
	Active      bool               `bson:"active" json:"active"`
	Verified    bool               `bson:"verified" json:"verified"`
	Avatar      string             `bson:"avatar,omitempty" json:"avatar,omitempty"`
	Phone       string             `bson:"phone,omitempty" json:"phone,omitempty"`
	Department  string             `bson:"department,omitempty" json:"department,omitempty"`
	Position    string             `bson:"position,omitempty" json:"position,omitempty"`
	LastLogin   *time.Time         `bson:"last_login,omitempty" json:"last_login,omitempty"`
	CreatedAt   time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt   time.Time          `bson:"updated_at" json:"updated_at"`
}

// CreateUserRequest represents the request payload for user creation
type CreateUserRequest struct {
	Email      string   `json:"email" validate:"required,email"`
	Name       string   `json:"name" validate:"required,min=2,max=100"`
	Password   string   `json:"password" validate:"required,min=8"`
	Role       UserRole `json:"role" validate:"required"`
	Phone      string   `json:"phone,omitempty"`
	Department string   `json:"department,omitempty"`
	Position   string   `json:"position,omitempty"`
}

// LoginRequest represents the request payload for user login
type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

// UpdateProfileRequest represents the request payload for profile updates
type UpdateProfileRequest struct {
	Name       string `json:"name" validate:"omitempty,min=2,max=100"`
	Phone      string `json:"phone,omitempty"`
	Department string `json:"department,omitempty"`
	Position   string `json:"position,omitempty"`
	Avatar     string `json:"avatar,omitempty"`
}

// ChangePasswordRequest represents the request payload for password changes
type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" validate:"required"`
	NewPassword     string `json:"new_password" validate:"required,min=8"`
}

// ForgotPasswordRequest represents the request payload for password reset
type ForgotPasswordRequest struct {
	Email string `json:"email" validate:"required,email"`
}

// ResetPasswordRequest represents the request payload for password reset confirmation
type ResetPasswordRequest struct {
	Token       string `json:"token" validate:"required"`
	NewPassword string `json:"new_password" validate:"required,min=8"`
}

// PasswordResetToken represents a password reset token
type PasswordResetToken struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	UserID    primitive.ObjectID `bson:"user_id" json:"user_id"`
	Token     string             `bson:"token" json:"token"`
	ExpiresAt time.Time          `bson:"expires_at" json:"expires_at"`
	Used      bool               `bson:"used" json:"used"`
	CreatedAt time.Time          `bson:"created_at" json:"created_at"`
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

// UserResponse represents the user data sent in API responses
type UserResponse struct {
	ID         primitive.ObjectID `json:"id"`
	Email      string             `json:"email"`
	Name       string             `json:"name"`
	Role       UserRole           `json:"role"`
	Active     bool               `json:"active"`
	Verified   bool               `json:"verified"`
	Avatar     string             `json:"avatar,omitempty"`
	Phone      string             `json:"phone,omitempty"`
	Department string             `json:"department,omitempty"`
	Position   string             `json:"position,omitempty"`
	LastLogin  *time.Time         `json:"last_login,omitempty"`
	CreatedAt  time.Time          `json:"created_at"`
	UpdatedAt  time.Time          `json:"updated_at"`
}

var (
	ErrUserNotFound     = errors.New("user not found")
	ErrInvalidPassword  = errors.New("invalid password")
	ErrEmailExists      = errors.New("email already exists")
	ErrInvalidToken     = errors.New("invalid or expired token")
	ErrTokenExpired     = errors.New("token has expired")
	ErrTokenAlreadyUsed = errors.New("token has already been used")
)

// HashPassword hashes the user's password using bcrypt
func (u *User) HashPassword() error {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(u.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	u.Password = string(hashedPassword)
	return nil
}

// CheckPassword compares a password with the user's hashed password
func (u *User) CheckPassword(password string) error {
	return bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(password))
}

// ValidateEmail validates email format using regex
func (u *User) ValidateEmail() bool {
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	return emailRegex.MatchString(u.Email)
}

// ValidatePassword validates password strength
func (u *User) ValidatePassword() bool {
	// Password must be at least 8 characters long and contain at least one letter and one number
	if len(u.Password) < 8 {
		return false
	}
	
	hasLetter := regexp.MustCompile(`[a-zA-Z]`).MatchString(u.Password)
	hasNumber := regexp.MustCompile(`[0-9]`).MatchString(u.Password)
	
	return hasLetter && hasNumber
}

// IsValidRole checks if the role is valid
func IsValidRole(role UserRole) bool {
	switch role {
	case RoleAdmin, RoleManager, RoleUser:
		return true
	default:
		return false
	}
}

// ToResponse converts User to UserResponse (excludes sensitive fields)
func (u *User) ToResponse() UserResponse {
	return UserResponse{
		ID:         u.ID,
		Email:      u.Email,
		Name:       u.Name,
		Role:       u.Role,
		Active:     u.Active,
		Verified:   u.Verified,
		Avatar:     u.Avatar,
		Phone:      u.Phone,
		Department: u.Department,
		Position:   u.Position,
		LastLogin:  u.LastLogin,
		CreatedAt:  u.CreatedAt,
		UpdatedAt:  u.UpdatedAt,
	}
}

// BeforeCreate sets timestamps and validates the user before creation
func (u *User) BeforeCreate() error {
	now := time.Now()
	u.CreatedAt = now
	u.UpdatedAt = now
	u.Active = true
	u.Verified = false

	// Validate email format
	if !u.ValidateEmail() {
		return errors.New("invalid email format")
	}

	// Validate password strength
	if !u.ValidatePassword() {
		return errors.New("password must be at least 8 characters long and contain at least one letter and one number")
	}

	// Validate role
	if !IsValidRole(u.Role) {
		return errors.New("invalid user role")
	}

	// Hash password
	return u.HashPassword()
}

// BeforeUpdate sets the updated timestamp
func (u *User) BeforeUpdate() {
	u.UpdatedAt = time.Now()
}

// GetUserByEmail finds a user by email
func GetUserByEmail(ctx context.Context, email string) (*User, error) {
	// This would be implemented by the user service
	// For now, it's a placeholder interface
	return nil, ErrUserNotFound
}

// GetUserByID finds a user by ID
func GetUserByID(ctx context.Context, id primitive.ObjectID) (*User, error) {
	// This would be implemented by the user service
	// For now, it's a placeholder interface
	return nil, ErrUserNotFound
}

// CreateIndexes creates MongoDB indexes for the user collection
func CreateUserIndexes(ctx context.Context) []bson.D {
	return []bson.D{
		// Unique index on email
		{
			{Key: "email", Value: 1},
		},
		// Compound index on active status and role
		{
			{Key: "active", Value: 1},
			{Key: "role", Value: 1},
		},
		// Index on created_at for sorting
		{
			{Key: "created_at", Value: -1},
		},
		// Index for password reset tokens
		{
			{Key: "token", Value: 1},
			{Key: "expires_at", Value: 1},
		},
		// TTL index for expired tokens (automatically delete after expiration)
		{
			{Key: "expires_at", Value: 1},
		},
	}
}