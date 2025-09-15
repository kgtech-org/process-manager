package models

import (
	"context"
	"regexp"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ============================================
// User Domain Models
// ============================================

// UserRole represents user roles in the system
type UserRole string

const (
	RoleAdmin   UserRole = "admin"
	RoleManager UserRole = "manager"
	RoleUser    UserRole = "user"
)

// UserStatus represents user account status
type UserStatus string

const (
	StatusPending  UserStatus = "pending"  // Awaiting admin validation
	StatusActive   UserStatus = "active"   // Account validated and active
	StatusInactive UserStatus = "inactive" // Account deactivated
	StatusRejected UserStatus = "rejected" // Registration rejected
)

// User represents a user in the system
type User struct {
	ID              primitive.ObjectID  `bson:"_id,omitempty" json:"id,omitempty"`
	Email           string              `bson:"email" json:"email" validate:"required,email"`
	Name            string              `bson:"name" json:"name" validate:"required,min=2,max=100"`
	Role            UserRole            `bson:"role" json:"role" validate:"required"`
	Status          UserStatus          `bson:"status" json:"status"`
	Active          bool                `bson:"active" json:"active"`
	Verified        bool                `bson:"verified" json:"verified"`
	Avatar          string              `bson:"avatar,omitempty" json:"avatar,omitempty"`
	Phone           string              `bson:"phone,omitempty" json:"phone,omitempty"`
	DepartmentID    *primitive.ObjectID `bson:"department_id,omitempty" json:"departmentId,omitempty"`
	JobPositionID   *primitive.ObjectID `bson:"job_position_id,omitempty" json:"jobPositionId,omitempty"`
	LastLogin       *time.Time          `bson:"last_login,omitempty" json:"lastLogin,omitempty"`
	ValidatedBy     *primitive.ObjectID `bson:"validated_by,omitempty" json:"validatedBy,omitempty"`
	ValidatedAt     *time.Time          `bson:"validated_at,omitempty" json:"validatedAt,omitempty"`
	RejectedBy      *primitive.ObjectID `bson:"rejected_by,omitempty" json:"rejectedBy,omitempty"`
	RejectedAt      *time.Time          `bson:"rejected_at,omitempty" json:"rejectedAt,omitempty"`
	RejectionReason string              `bson:"rejection_reason,omitempty" json:"rejectionReason,omitempty"`
	CreatedAt       time.Time           `bson:"created_at" json:"createdAt"`
	UpdatedAt       time.Time           `bson:"updated_at" json:"updatedAt"`
}

// ============================================
// User Request Models
// ============================================

// RegisterUserRequest represents the request payload for user registration
type RegisterUserRequest struct {
	Email         string `json:"email" validate:"required,email"`
	Name          string `json:"name" validate:"required,min=2,max=100"`
	Phone         string `json:"phone,omitempty"`
	DepartmentID  string `json:"departmentId,omitempty"`
	JobPositionID string `json:"jobPositionId,omitempty"`
}

// CreateUserRequest represents the request payload for admin user creation
type CreateUserRequest struct {
	Email         string   `json:"email" validate:"required,email"`
	Name          string   `json:"name" validate:"required,min=2,max=100"`
	Role          UserRole `json:"role" validate:"required"`
	Phone         string   `json:"phone,omitempty"`
	DepartmentID  string   `json:"departmentId,omitempty"`
	JobPositionID string   `json:"jobPositionId,omitempty"`
}

// UpdateProfileRequest represents the request payload for profile updates
type UpdateProfileRequest struct {
	Name          string `json:"name" validate:"omitempty,min=2,max=100"`
	Phone         string `json:"phone,omitempty"`
	DepartmentID  string `json:"departmentId,omitempty"`
	JobPositionID string `json:"jobPositionId,omitempty"`
	Avatar        string `json:"avatar,omitempty"`
}

// ValidateUserRequest represents the request payload for admin user validation
type ValidateUserRequest struct {
	Action string   `json:"action" validate:"required,oneof=approve reject"`
	Role   UserRole `json:"role,omitempty" validate:"omitempty"`
	Reason string   `json:"reason,omitempty"`
}

// UpdateUserRoleRequest represents a user role update request
type UpdateUserRoleRequest struct {
	Role UserRole `json:"role" validate:"required,oneof=admin manager user"`
}

// ============================================
// User Response Models
// ============================================

// UserResponse represents the user data sent in API responses
type UserResponse struct {
	ID              primitive.ObjectID  `json:"id"`
	Email           string              `json:"email"`
	Name            string              `json:"name"`
	Role            UserRole            `json:"role"`
	Status          UserStatus          `json:"status"`
	Active          bool                `json:"active"`
	Verified        bool                `json:"verified"`
	Avatar          string              `json:"avatar,omitempty"`
	Phone           string              `json:"phone,omitempty"`
	DepartmentID    *primitive.ObjectID `json:"departmentId,omitempty"`
	JobPositionID   *primitive.ObjectID `json:"jobPositionId,omitempty"`
	Department      *DepartmentResponse `json:"department,omitempty"`
	JobPosition     *JobPositionResponse `json:"jobPosition,omitempty"`
	LastLogin       *time.Time          `json:"lastLogin,omitempty"`
	ValidatedBy     *primitive.ObjectID `json:"validatedBy,omitempty"`
	ValidatedAt     *time.Time          `json:"validatedAt,omitempty"`
	RejectedBy      *primitive.ObjectID `json:"rejectedBy,omitempty"`
	RejectedAt      *time.Time          `json:"rejectedAt,omitempty"`
	RejectionReason string              `json:"rejectionReason,omitempty"`
	CreatedAt       time.Time           `json:"createdAt"`
	UpdatedAt       time.Time           `json:"updatedAt"`
}

// ============================================
// User Filter Options
// ============================================

// UserFilterOptions represents options for filtering users
type UserFilterOptions struct {
	Status     UserStatus `json:"status,omitempty"`
	Role       UserRole   `json:"role,omitempty"`
	DepartmentID string   `json:"departmentId,omitempty"`
	Verified   *bool      `json:"verified,omitempty"`
	Active     *bool      `json:"active,omitempty"`
	Search     string     `json:"search,omitempty"`
	Page       int        `json:"page"`
	Limit      int        `json:"limit"`
	SortBy     string     `json:"sortBy"`
	SortOrder  string     `json:"sortOrder"`
}

// ============================================
// User Domain Methods
// ============================================

// ValidateEmail validates email format using regex
func (u *User) ValidateEmail() bool {
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	return emailRegex.MatchString(u.Email)
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

// IsValidStatus checks if the status is valid
func IsValidStatus(status UserStatus) bool {
	switch status {
	case StatusPending, StatusActive, StatusInactive, StatusRejected:
		return true
	default:
		return false
	}
}

// CanLogin checks if the user can log in
func (u *User) CanLogin() bool {
	return u.Status == StatusActive && u.Active
}

// IsPending checks if the user is awaiting validation
func (u *User) IsPending() bool {
	return u.Status == StatusPending
}

// IsValidated checks if the user has been validated by an admin
func (u *User) IsValidated() bool {
	return u.Status == StatusActive && u.ValidatedAt != nil
}

// IsRejected checks if the user registration was rejected
func (u *User) IsRejected() bool {
	return u.Status == StatusRejected
}

// ToResponse converts User to UserResponse (excludes sensitive fields)
func (u *User) ToResponse() UserResponse {
	return UserResponse{
		ID:              u.ID,
		Email:           u.Email,
		Name:            u.Name,
		Role:            u.Role,
		Status:          u.Status,
		Active:          u.Active,
		Verified:        u.Verified,
		Avatar:          u.Avatar,
		Phone:           u.Phone,
		DepartmentID:    u.DepartmentID,
		JobPositionID:   u.JobPositionID,
		LastLogin:       u.LastLogin,
		ValidatedBy:     u.ValidatedBy,
		ValidatedAt:     u.ValidatedAt,
		RejectedBy:      u.RejectedBy,
		RejectedAt:      u.RejectedAt,
		RejectionReason: u.RejectionReason,
		CreatedAt:       u.CreatedAt,
		UpdatedAt:       u.UpdatedAt,
	}
}

// BeforeCreate sets timestamps and validates the user before creation
func (u *User) BeforeCreate() error {
	now := time.Now()
	u.CreatedAt = now
	u.UpdatedAt = now
	u.Active = false // Users start inactive until validated
	u.Verified = false
	u.Status = StatusPending // Users start in pending status

	// Validate email format
	if !u.ValidateEmail() {
		return ErrInvalidEmail
	}

	// Validate role
	if !IsValidRole(u.Role) {
		return ErrInvalidRole
	}

	return nil
}

// BeforeUpdate sets the updated timestamp
func (u *User) BeforeUpdate() {
	u.UpdatedAt = time.Now()
}

// ============================================
// Database Helper Functions (moved to service)
// ============================================


// CreateUserIndexes creates MongoDB indexes for the user collection
func CreateUserIndexes(ctx context.Context) []bson.D {
	return []bson.D{
		// Unique index on email
		{
			{Key: "email", Value: 1},
		},
		// Compound index on status and role
		{
			{Key: "status", Value: 1},
			{Key: "role", Value: 1},
		},
		// Index on active status
		{
			{Key: "active", Value: 1},
		},
		// Index on created_at for sorting
		{
			{Key: "created_at", Value: -1},
		},
	}
}
