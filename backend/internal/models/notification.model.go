package models

import (
	"errors"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// NotificationType represents the type of notification
type NotificationType string

const (
	NotificationTypeEmail  NotificationType = "email"
	NotificationTypePush   NotificationType = "push"
	NotificationTypeInApp  NotificationType = "in_app"
	NotificationTypeSystem NotificationType = "system"
)

// NotificationStatus represents the status of a notification
type NotificationStatus string

const (
	NotificationStatusPending   NotificationStatus = "pending"
	NotificationStatusSent      NotificationStatus = "sent"
	NotificationStatusDelivered NotificationStatus = "delivered"
	NotificationStatusFailed    NotificationStatus = "failed"
	NotificationStatusRead      NotificationStatus = "read"
)

// NotificationCategory represents categories of notifications
type NotificationCategory string

const (
	NotificationCategoryLogin     NotificationCategory = "login"
	NotificationCategoryActivity  NotificationCategory = "activity"
	NotificationCategorySystem    NotificationCategory = "system"
	NotificationCategoryReminder  NotificationCategory = "reminder"
	NotificationCategoryApproval  NotificationCategory = "approval"
	NotificationCategoryMeeting   NotificationCategory = "meeting"
	NotificationCategoryUpdate    NotificationCategory = "update"
	NotificationCategoryAlert     NotificationCategory = "alert"
)

// NotificationPriority represents the priority of a notification
type NotificationPriority string

const (
	NotificationPriorityLow    NotificationPriority = "low"
	NotificationPriorityNormal NotificationPriority = "normal"
	NotificationPriorityHigh   NotificationPriority = "high"
	NotificationPriorityUrgent NotificationPriority = "urgent"
)

// Notification represents a notification in the system
type Notification struct {
	ID           primitive.ObjectID   `bson:"_id,omitempty" json:"id"`
	UserID       primitive.ObjectID   `bson:"userId" json:"userId"`
	DeviceIDs    []primitive.ObjectID `bson:"deviceIds,omitempty" json:"deviceIds,omitempty"` // Target specific devices
	Type         NotificationType     `bson:"type" json:"type"`
	Category     NotificationCategory `bson:"category" json:"category"`
	Priority     NotificationPriority `bson:"priority" json:"priority"`
	Title        string               `bson:"title" json:"title"`
	Body         string               `bson:"body" json:"body"`
	Data         map[string]interface{} `bson:"data,omitempty" json:"data,omitempty"`           // Custom payload data
	ImageURL     string               `bson:"imageUrl,omitempty" json:"imageUrl,omitempty"`   // Optional image
	ActionURL    string               `bson:"actionUrl,omitempty" json:"actionUrl,omitempty"` // Click action URL
	Status       NotificationStatus   `bson:"status" json:"status"`

	// Delivery tracking
	SentAt      *time.Time `bson:"sentAt,omitempty" json:"sentAt,omitempty"`
	DeliveredAt *time.Time `bson:"deliveredAt,omitempty" json:"deliveredAt,omitempty"`
	ReadAt      *time.Time `bson:"readAt,omitempty" json:"readAt,omitempty"`

	// FCM specific fields
	FCMMessageID string `bson:"fcmMessageId,omitempty" json:"fcmMessageId,omitempty"`
	FCMResponse  string `bson:"fcmResponse,omitempty" json:"fcmResponse,omitempty"`

	// Error tracking
	Error       string `bson:"error,omitempty" json:"error,omitempty"`
	RetryCount  int    `bson:"retryCount" json:"retryCount"`

	// Metadata
	CreatedBy primitive.ObjectID `bson:"createdBy,omitempty" json:"createdBy,omitempty"` // Who sent it (for admin notifications)
	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time          `bson:"updatedAt" json:"updatedAt"`
	ExpiresAt *time.Time         `bson:"expiresAt,omitempty" json:"expiresAt,omitempty"` // Optional expiration
}

// NotificationPreferences represents user's notification preferences
type NotificationPreferences struct {
	ID               primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID           primitive.ObjectID `bson:"userId" json:"userId"`
	EmailEnabled     bool               `bson:"emailEnabled" json:"emailEnabled"`
	PushEnabled      bool               `bson:"pushEnabled" json:"pushEnabled"`
	InAppEnabled     bool               `bson:"inAppEnabled" json:"inAppEnabled"`
	SoundEnabled     bool               `bson:"soundEnabled" json:"soundEnabled"`
	BadgeEnabled     bool               `bson:"badgeEnabled" json:"badgeEnabled"`

	// Category preferences
	Categories map[NotificationCategory]bool `bson:"categories" json:"categories"`

	// Device-specific preferences
	DevicePreferences map[string]DevicePreferences `bson:"devicePreferences,omitempty" json:"devicePreferences,omitempty"`

	// Quiet hours
	QuietHoursEnabled bool   `bson:"quietHoursEnabled" json:"quietHoursEnabled"`
	QuietHoursStart   string `bson:"quietHoursStart,omitempty" json:"quietHoursStart,omitempty"` // HH:MM format
	QuietHoursEnd     string `bson:"quietHoursEnd,omitempty" json:"quietHoursEnd,omitempty"`     // HH:MM format
	Timezone          string `bson:"timezone,omitempty" json:"timezone,omitempty"`

	CreatedAt time.Time `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time `bson:"updatedAt" json:"updatedAt"`
}

// SendNotificationRequest represents a request to send a notification
type SendNotificationRequest struct {
	UserIDs     []string                 `json:"userIds,omitempty"`     // Specific users
	DeviceIDs   []string                 `json:"deviceIds,omitempty"`   // Specific devices
	Roles       []string                 `json:"roles,omitempty"`       // Broadcast to roles
	Status      string                   `json:"status,omitempty"`      // Broadcast to status
	Title       string                   `json:"title" binding:"required"`
	Body        string                   `json:"body" binding:"required"`
	Category    NotificationCategory     `json:"category"`
	Priority    NotificationPriority     `json:"priority"`
	Data        map[string]interface{}   `json:"data,omitempty"`
	ImageURL    string                   `json:"imageUrl,omitempty"`
	ActionURL   string                   `json:"actionUrl,omitempty"`
	ClickAction string                   `json:"clickAction,omitempty"` // Alias for actionUrl
	Sound       string                   `json:"sound,omitempty"`
	Badge       *int                     `json:"badge,omitempty"`
	ExpiresIn   *int                     `json:"expiresIn,omitempty"`   // Expiration in seconds
}

// UpdatePreferencesRequest represents a request to update notification preferences
type UpdatePreferencesRequest struct {
	EmailEnabled      *bool                            `json:"emailEnabled,omitempty"`
	PushEnabled       *bool                            `json:"pushEnabled,omitempty"`
	InAppEnabled      *bool                            `json:"inAppEnabled,omitempty"`
	SoundEnabled      *bool                            `json:"soundEnabled,omitempty"`
	BadgeEnabled      *bool                            `json:"badgeEnabled,omitempty"`
	Categories        map[NotificationCategory]bool    `json:"categories,omitempty"`
	DevicePreferences map[string]DevicePreferences     `json:"devicePreferences,omitempty"`
	QuietHoursEnabled *bool                            `json:"quietHoursEnabled,omitempty"`
	QuietHoursStart   *string                          `json:"quietHoursStart,omitempty"`
	QuietHoursEnd     *string                          `json:"quietHoursEnd,omitempty"`
	Timezone          *string                          `json:"timezone,omitempty"`
}

// NotificationSummary represents notification statistics
type NotificationSummary struct {
	Total      int64 `json:"total"`
	Unread     int64 `json:"unread"`
	Today      int64 `json:"today"`
	ThisWeek   int64 `json:"thisWeek"`
	Failed     int64 `json:"failed"`
}

// Helper methods

// IsValidNotificationType checks if a notification type is valid
func IsValidNotificationType(notificationType NotificationType) bool {
	switch notificationType {
	case NotificationTypeEmail, NotificationTypePush, NotificationTypeInApp, NotificationTypeSystem:
		return true
	default:
		return false
	}
}

// IsValidNotificationCategory checks if a notification category is valid
func IsValidNotificationCategory(category NotificationCategory) bool {
	switch category {
	case NotificationCategoryLogin, NotificationCategoryActivity, NotificationCategorySystem,
		 NotificationCategoryReminder, NotificationCategoryApproval, NotificationCategoryMeeting,
		 NotificationCategoryUpdate, NotificationCategoryAlert:
		return true
	default:
		return false
	}
}

// IsValidNotificationPriority checks if a notification priority is valid
func IsValidNotificationPriority(priority NotificationPriority) bool {
	switch priority {
	case NotificationPriorityLow, NotificationPriorityNormal, NotificationPriorityHigh, NotificationPriorityUrgent:
		return true
	default:
		return false
	}
}

// MarkAsRead marks the notification as read
func (n *Notification) MarkAsRead() {
	if n.Status != NotificationStatusRead {
		n.Status = NotificationStatusRead
		now := time.Now()
		n.ReadAt = &now
		n.UpdatedAt = now
	}
}

// MarkAsSent marks the notification as sent
func (n *Notification) MarkAsSent(fcmMessageID string) {
	n.Status = NotificationStatusSent
	n.FCMMessageID = fcmMessageID
	now := time.Now()
	n.SentAt = &now
	n.UpdatedAt = now
}

// MarkAsDelivered marks the notification as delivered
func (n *Notification) MarkAsDelivered() {
	n.Status = NotificationStatusDelivered
	now := time.Now()
	n.DeliveredAt = &now
	n.UpdatedAt = now
}

// MarkAsFailed marks the notification as failed
func (n *Notification) MarkAsFailed(errorMsg string) {
	n.Status = NotificationStatusFailed
	n.Error = errorMsg
	n.RetryCount++
	n.UpdatedAt = time.Now()
}

// GetDefaultPreferences returns default notification preferences
func GetDefaultNotificationPreferences(userID primitive.ObjectID) *NotificationPreferences {
	return &NotificationPreferences{
		UserID:        userID,
		EmailEnabled:  true,
		PushEnabled:   true,
		InAppEnabled:  true,
		SoundEnabled:  true,
		BadgeEnabled:  true,
		Categories: map[NotificationCategory]bool{
			NotificationCategoryLogin:    true,
			NotificationCategoryActivity: true,
			NotificationCategorySystem:   true,
			NotificationCategoryReminder: true,
			NotificationCategoryApproval: true,
			NotificationCategoryMeeting:  true,
			NotificationCategoryUpdate:   true,
			NotificationCategoryAlert:    true,
		},
		QuietHoursEnabled: false,
		CreatedAt:         time.Now(),
		UpdatedAt:         time.Now(),
	}
}

// Notification error types
var (
	ErrNotificationNotFound    = errors.New("notification not found")
	ErrInvalidNotificationType = errors.New("invalid notification type")
	ErrInvalidCategory         = errors.New("invalid notification category")
	ErrInvalidPriority         = errors.New("invalid notification priority")
	ErrNotificationExpired     = errors.New("notification has expired")
	ErrPreferencesNotFound     = errors.New("notification preferences not found")
)