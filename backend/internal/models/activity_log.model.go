package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ============================================
// Activity Log Domain Models
// ============================================

// ActivityAction represents the type of action performed
type ActivityAction string

const (
	// User Management Actions
	ActionUserLogin          ActivityAction = "user_login"
	ActionUserLogout         ActivityAction = "user_logout"
	ActionUserRegistered     ActivityAction = "user_registered"
	ActionUserApproved       ActivityAction = "user_approved"
	ActionUserRejected       ActivityAction = "user_rejected"
	ActionUserActivated      ActivityAction = "user_activated"
	ActionUserDeactivated    ActivityAction = "user_deactivated"
	ActionUserUpdated        ActivityAction = "user_updated"
	ActionUserRoleChanged    ActivityAction = "user_role_changed"
	ActionUserDeleted        ActivityAction = "user_deleted"
	ActionUserAvatarUploaded ActivityAction = "user_avatar_uploaded"
	ActionUserAvatarDeleted  ActivityAction = "user_avatar_deleted"

	// Department Management Actions
	ActionDepartmentCreated ActivityAction = "department_created"
	ActionDepartmentUpdated ActivityAction = "department_updated"
	ActionDepartmentDeleted ActivityAction = "department_deleted"

	// Job Position Management Actions
	ActionJobPositionCreated ActivityAction = "job_position_created"
	ActionJobPositionUpdated ActivityAction = "job_position_updated"
	ActionJobPositionDeleted ActivityAction = "job_position_deleted"

	// Authentication Actions
	ActionTokenRefreshed     ActivityAction = "token_refreshed"
	ActionPasswordReset      ActivityAction = "password_reset"
	ActionEmailVerified      ActivityAction = "email_verified"
	ActionOTPRequested       ActivityAction = "otp_requested"
	ActionOTPVerified        ActivityAction = "otp_verified"
	ActionLoginFailed        ActivityAction = "login_failed"

	// Document Management Actions (for future use)
	ActionDocumentCreated   ActivityAction = "document_created"
	ActionDocumentUpdated   ActivityAction = "document_updated"
	ActionDocumentDeleted   ActivityAction = "document_deleted"
	ActionDocumentSigned    ActivityAction = "document_signed"
	ActionDocumentExported  ActivityAction = "document_exported"

	// Process Management Actions (for future use)
	ActionProcessCreated   ActivityAction = "process_created"
	ActionProcessUpdated   ActivityAction = "process_updated"
	ActionProcessDeleted   ActivityAction = "process_deleted"
	ActionProcessSubmitted ActivityAction = "process_submitted"
	ActionProcessApproved  ActivityAction = "process_approved"
	ActionProcessRejected  ActivityAction = "process_rejected"

	// System Actions
	ActionSystemMaintenance ActivityAction = "system_maintenance"
	ActionSystemBackup     ActivityAction = "system_backup"
	ActionConfigUpdated    ActivityAction = "config_updated"
)

// ActivityLevel represents the severity level of the activity
type ActivityLevel string

const (
	LevelInfo     ActivityLevel = "info"     // General information
	LevelWarning  ActivityLevel = "warning"  // Warning events
	LevelError    ActivityLevel = "error"    // Error events
	LevelCritical ActivityLevel = "critical" // Critical security events
	LevelAudit    ActivityLevel = "audit"    // Audit trail events
)

// ActivityCategory groups related actions
type ActivityCategory string

const (
	CategoryAuth       ActivityCategory = "authentication"
	CategoryUser       ActivityCategory = "user_management"
	CategoryDepartment ActivityCategory = "department_management"
	CategoryJobPos     ActivityCategory = "job_position_management"
	CategoryDocument   ActivityCategory = "document_management"
	CategoryProcess    ActivityCategory = "process_management"
	CategorySystem     ActivityCategory = "system"
	CategorySecurity   ActivityCategory = "security"
)

// ActivityLog represents an activity log entry
type ActivityLog struct {
	ID            primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	UserID        *primitive.ObjectID `bson:"user_id,omitempty" json:"userId,omitempty"`         // The user who performed the action
	ActorName     string             `bson:"actor_name" json:"actorName"`                       // Name of the user who performed the action
	ActorEmail    string             `bson:"actor_email" json:"actorEmail"`                     // Email of the user who performed the action
	ActorAvatar   string             `bson:"actor_avatar,omitempty" json:"actorAvatar,omitempty"` // Avatar URL of the user who performed the action
	TargetUserID  *primitive.ObjectID `bson:"target_user_id,omitempty" json:"targetUserId,omitempty"` // The user who was affected by the action
	TargetName    string             `bson:"target_name,omitempty" json:"targetName,omitempty"` // Name of the target user/resource
	Action        ActivityAction     `bson:"action" json:"action"`                              // What action was performed
	Category      ActivityCategory   `bson:"category" json:"category"`                          // Category of the action
	Level         ActivityLevel      `bson:"level" json:"level"`                                // Severity level
	Description   string             `bson:"description" json:"description"`                    // Human-readable description
	ResourceType  string             `bson:"resource_type,omitempty" json:"resourceType,omitempty"` // Type of resource affected
	ResourceID    *primitive.ObjectID `bson:"resource_id,omitempty" json:"resourceId,omitempty"`     // ID of the resource affected
	Details       map[string]interface{} `bson:"details,omitempty" json:"details,omitempty"`           // Additional structured data
	IPAddress     string             `bson:"ip_address,omitempty" json:"ipAddress,omitempty"`   // IP address of the actor
	UserAgent     string             `bson:"user_agent,omitempty" json:"userAgent,omitempty"`   // User agent of the actor
	Success       bool               `bson:"success" json:"success"`                            // Whether the action was successful
	ErrorMessage  string             `bson:"error_message,omitempty" json:"errorMessage,omitempty"` // Error message if action failed
	Duration      *int64             `bson:"duration,omitempty" json:"duration,omitempty"`      // Duration in milliseconds
	Timestamp     time.Time          `bson:"timestamp" json:"timestamp"`                        // When the action occurred
	CreatedAt     time.Time          `bson:"created_at" json:"createdAt"`                       // When the log was created
}

// ============================================
// Activity Log Request/Response Models
// ============================================

// ActivityLogRequest represents a request to create an activity log
type ActivityLogRequest struct {
	UserID       *primitive.ObjectID    `json:"userId,omitempty"`
	TargetUserID *primitive.ObjectID    `json:"targetUserId,omitempty"`
	TargetName   string                 `json:"targetName,omitempty"`
	Action       ActivityAction         `json:"action" validate:"required"`
	Description  string                 `json:"description" validate:"required"`
	ResourceType string                 `json:"resourceType,omitempty"`
	ResourceID   *primitive.ObjectID    `json:"resourceId,omitempty"`
	Details      map[string]interface{} `json:"details,omitempty"`
	Success      bool                   `json:"success"`
	ErrorMessage string                 `json:"errorMessage,omitempty"`
	Duration     *int64                 `json:"duration,omitempty"`
}

// ActivityLogResponse represents an activity log in API responses
type ActivityLogResponse struct {
	ID           string                 `json:"id"`
	UserID       *string                `json:"userId,omitempty"`
	ActorName    string                 `json:"actorName"`
	ActorEmail   string                 `json:"actorEmail"`
	TargetUserID *string                `json:"targetUserId,omitempty"`
	TargetName   string                 `json:"targetName,omitempty"`
	Action       ActivityAction         `json:"action"`
	Category     ActivityCategory       `json:"category"`
	Level        ActivityLevel          `json:"level"`
	Description  string                 `json:"description"`
	ResourceType string                 `json:"resourceType,omitempty"`
	ResourceID   *string                `json:"resourceId,omitempty"`
	Details      map[string]interface{} `json:"details,omitempty"`
	IPAddress    string                 `json:"ipAddress,omitempty"`
	UserAgent    string                 `json:"userAgent,omitempty"`
	Success      bool                   `json:"success"`
	ErrorMessage string                 `json:"errorMessage,omitempty"`
	Duration     *int64                 `json:"duration,omitempty"`
	Timestamp    time.Time              `json:"timestamp"`
	CreatedAt    time.Time              `json:"createdAt"`
}

// ActivityLogFilters represents filters for querying activity logs
type ActivityLogFilters struct {
	UserID       *primitive.ObjectID `json:"userId,omitempty"`
	TargetUserID *primitive.ObjectID `json:"targetUserId,omitempty"`
	Action       ActivityAction      `json:"action,omitempty"`
	Category     ActivityCategory    `json:"category,omitempty"`
	Level        ActivityLevel       `json:"level,omitempty"`
	ResourceType string              `json:"resourceType,omitempty"`
	ResourceID   *primitive.ObjectID `json:"resourceId,omitempty"`
	Success      *bool               `json:"success,omitempty"`
	IPAddress    string              `json:"ipAddress,omitempty"`
	DateFrom     *time.Time          `json:"dateFrom,omitempty"`
	DateTo       *time.Time          `json:"dateTo,omitempty"`
	Page         int                 `json:"page"`
	Limit        int                 `json:"limit"`
}

// ToResponse converts ActivityLog to ActivityLogResponse
func (al *ActivityLog) ToResponse() ActivityLogResponse {
	response := ActivityLogResponse{
		ID:           al.ID.Hex(),
		ActorName:    al.ActorName,
		ActorEmail:   al.ActorEmail,
		TargetName:   al.TargetName,
		Action:       al.Action,
		Category:     al.Category,
		Level:        al.Level,
		Description:  al.Description,
		ResourceType: al.ResourceType,
		Details:      al.Details,
		IPAddress:    al.IPAddress,
		UserAgent:    al.UserAgent,
		Success:      al.Success,
		ErrorMessage: al.ErrorMessage,
		Duration:     al.Duration,
		Timestamp:    al.Timestamp,
		CreatedAt:    al.CreatedAt,
	}

	if al.UserID != nil {
		userIDStr := al.UserID.Hex()
		response.UserID = &userIDStr
	}

	if al.TargetUserID != nil {
		targetUserIDStr := al.TargetUserID.Hex()
		response.TargetUserID = &targetUserIDStr
	}

	if al.ResourceID != nil {
		resourceIDStr := al.ResourceID.Hex()
		response.ResourceID = &resourceIDStr
	}

	return response
}

// GetCategoryFromAction returns the appropriate category for an action
func GetCategoryFromAction(action ActivityAction) ActivityCategory {
	switch action {
	case ActionUserLogin, ActionUserLogout, ActionTokenRefreshed, ActionPasswordReset,
		ActionEmailVerified, ActionOTPRequested, ActionOTPVerified, ActionLoginFailed:
		return CategoryAuth

	case ActionUserRegistered, ActionUserApproved, ActionUserRejected, ActionUserActivated,
		ActionUserDeactivated, ActionUserUpdated, ActionUserRoleChanged, ActionUserDeleted,
		ActionUserAvatarUploaded, ActionUserAvatarDeleted:
		return CategoryUser

	case ActionDepartmentCreated, ActionDepartmentUpdated, ActionDepartmentDeleted:
		return CategoryDepartment

	case ActionJobPositionCreated, ActionJobPositionUpdated, ActionJobPositionDeleted:
		return CategoryJobPos

	case ActionDocumentCreated, ActionDocumentUpdated, ActionDocumentDeleted,
		ActionDocumentSigned, ActionDocumentExported:
		return CategoryDocument

	case ActionProcessCreated, ActionProcessUpdated, ActionProcessDeleted,
		ActionProcessSubmitted, ActionProcessApproved, ActionProcessRejected:
		return CategoryProcess

	case ActionSystemMaintenance, ActionSystemBackup, ActionConfigUpdated:
		return CategorySystem

	default:
		return CategorySystem
	}
}

// GetLevelFromAction returns the appropriate level for an action
func GetLevelFromAction(action ActivityAction) ActivityLevel {
	switch action {
	case ActionLoginFailed, ActionUserRejected, ActionUserDeleted:
		return LevelWarning

	case ActionUserLogin, ActionUserLogout, ActionUserRegistered, ActionUserApproved,
		ActionUserActivated, ActionUserDeactivated, ActionUserUpdated, ActionUserRoleChanged,
		ActionUserAvatarUploaded, ActionUserAvatarDeleted, ActionDepartmentCreated,
		ActionDepartmentUpdated, ActionDepartmentDeleted, ActionJobPositionCreated,
		ActionJobPositionUpdated, ActionJobPositionDeleted, ActionTokenRefreshed,
		ActionEmailVerified, ActionOTPRequested, ActionOTPVerified:
		return LevelAudit

	case ActionDocumentCreated, ActionDocumentUpdated, ActionDocumentDeleted,
		ActionDocumentSigned, ActionDocumentExported, ActionProcessCreated,
		ActionProcessUpdated, ActionProcessDeleted, ActionProcessSubmitted,
		ActionProcessApproved, ActionProcessRejected:
		return LevelInfo

	case ActionSystemMaintenance, ActionSystemBackup, ActionConfigUpdated:
		return LevelCritical

	default:
		return LevelInfo
	}
}