package models

import (
	"errors"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// DeviceType represents the type of device
type DeviceType string

const (
	DeviceTypeWeb     DeviceType = "web"
	DeviceTypeAndroid DeviceType = "android"
	DeviceTypeIOS     DeviceType = "ios"
	DeviceTypeDesktop DeviceType = "desktop"
)

// Device represents a user's registered device for push notifications
type Device struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID       primitive.ObjectID `bson:"userId" json:"userId"`
	DeviceUUID   string             `bson:"deviceUuid" json:"deviceUuid"` // Unique device identifier
	FCMToken     string             `bson:"fcmToken" json:"-"`            // Hidden from JSON for security
	DeviceType   DeviceType         `bson:"deviceType" json:"deviceType"`
	DeviceName   string             `bson:"deviceName" json:"deviceName"`
	Browser      string             `bson:"browser,omitempty" json:"browser,omitempty"`         // For web devices
	Platform     string             `bson:"platform,omitempty" json:"platform,omitempty"`       // OS/platform info
	UserAgent    string             `bson:"userAgent,omitempty" json:"userAgent,omitempty"`     // Full user agent
	IPAddress    string             `bson:"ipAddress,omitempty" json:"ipAddress,omitempty"`     // Registration IP
	IsActive     bool               `bson:"isActive" json:"isActive"`
	LastActiveAt time.Time          `bson:"lastActiveAt" json:"lastActiveAt"`
	RegisteredAt time.Time          `bson:"registeredAt" json:"registeredAt"`
	UpdatedAt    time.Time          `bson:"updatedAt" json:"updatedAt"`
}

// DeviceResponse represents device info for API responses (without sensitive data)
type DeviceResponse struct {
	ID           primitive.ObjectID `json:"id"`
	DeviceUUID   string             `json:"deviceUuid"`
	DeviceType   DeviceType         `json:"deviceType"`
	DeviceName   string             `json:"deviceName"`
	Browser      string             `json:"browser,omitempty"`
	Platform     string             `json:"platform,omitempty"`
	IsActive     bool               `json:"isActive"`
	LastActiveAt time.Time          `json:"lastActiveAt"`
	RegisteredAt time.Time          `json:"registeredAt"`
}

// DeviceRegistrationRequest represents a device registration request
type DeviceRegistrationRequest struct {
	DeviceUUID string     `json:"deviceUuid" binding:"required"`
	FCMToken   string     `json:"fcmToken" binding:"required"`
	DeviceType DeviceType `json:"deviceType" binding:"required"`
	DeviceName string     `json:"deviceName"`
	Browser    string     `json:"browser"`
	Platform   string     `json:"platform"`
	UserAgent  string     `json:"userAgent"`
}

// UpdateTokenRequest represents a token update request
type UpdateTokenRequest struct {
	FCMToken string `json:"fcmToken" binding:"required"`
}

// DevicePreferences represents notification preferences for a specific device
type DevicePreferences struct {
	DeviceUUID   string   `bson:"deviceUuid" json:"deviceUuid"`
	PushEnabled  bool     `bson:"pushEnabled" json:"pushEnabled"`
	SoundEnabled bool     `bson:"soundEnabled" json:"soundEnabled"`
	BadgeEnabled bool     `bson:"badgeEnabled" json:"badgeEnabled"`
	Categories   []string `bson:"categories" json:"categories"` // Which notification types to receive
}

// IsValidDeviceType checks if a device type is valid
func IsValidDeviceType(deviceType DeviceType) bool {
	switch deviceType {
	case DeviceTypeWeb, DeviceTypeAndroid, DeviceTypeIOS, DeviceTypeDesktop:
		return true
	default:
		return false
	}
}

// ToResponse converts a Device to DeviceResponse (removing sensitive data)
func (d *Device) ToResponse() DeviceResponse {
	return DeviceResponse{
		ID:           d.ID,
		DeviceUUID:   d.DeviceUUID,
		DeviceType:   d.DeviceType,
		DeviceName:   d.DeviceName,
		Browser:      d.Browser,
		Platform:     d.Platform,
		IsActive:     d.IsActive,
		LastActiveAt: d.LastActiveAt,
		RegisteredAt: d.RegisteredAt,
	}
}

// DeviceError types
var (
	ErrDeviceNotFound      = errors.New("device not found")
	ErrDeviceExists        = errors.New("device already exists")
	ErrInvalidDeviceType   = errors.New("invalid device type")
	ErrInvalidFCMToken     = errors.New("invalid FCM token")
	ErrDeviceNotActive     = errors.New("device is not active")
	ErrMaxDevicesExceeded  = errors.New("maximum devices exceeded")
)