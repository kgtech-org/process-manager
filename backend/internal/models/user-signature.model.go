package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// UserSignatureType represents the type of user signature
type UserSignatureType string

const (
	UserSignatureTypeImage UserSignatureType = "image"
	UserSignatureTypeDrawn UserSignatureType = "drawn"
	UserSignatureTypeTyped UserSignatureType = "typed"
)

// UserSignature represents a user's saved signature (one per user)
type UserSignature struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	UserID     primitive.ObjectID `bson:"user_id" json:"userId"`
	Type       UserSignatureType  `bson:"type" json:"type"`                       // image, drawn, typed
	Data       string             `bson:"data" json:"data"`                       // Base64 image or text
	Font       string             `bson:"font,omitempty" json:"font,omitempty"`   // Font family for typed signatures
	UsageCount int                `bson:"usage_count" json:"usageCount"`
	CreatedAt  time.Time          `bson:"created_at" json:"createdAt"`
	UpdatedAt  time.Time          `bson:"updated_at" json:"updatedAt"`
}

// UserSignatureResponse represents the API response for a user signature
type UserSignatureResponse struct {
	ID         string            `json:"id"`
	UserID     string            `json:"userId"`
	Type       UserSignatureType `json:"type"`
	Data       string            `json:"data"`
	Font       string            `json:"font,omitempty"`
	UsageCount int               `json:"usageCount"`
	CreatedAt  time.Time         `json:"createdAt"`
	UpdatedAt  time.Time         `json:"updatedAt"`
}

// CreateUserSignatureRequest represents the request to create a signature
type CreateUserSignatureRequest struct {
	Type UserSignatureType `json:"type" binding:"required"`
	Data string            `json:"data" binding:"required"`
	Font string            `json:"font"`
}

// UpdateUserSignatureRequest represents the request to update a signature
type UpdateUserSignatureRequest struct {
	Type UserSignatureType `json:"type"`
	Data string            `json:"data"`
	Font string            `json:"font"`
}

// BeforeCreate sets timestamps before creating a signature
func (s *UserSignature) BeforeCreate() {
	now := time.Now()
	s.CreatedAt = now
	s.UpdatedAt = now
	s.UsageCount = 0
}

// BeforeUpdate sets the updated timestamp
func (s *UserSignature) BeforeUpdate() {
	s.UpdatedAt = time.Now()
}

// ToResponse converts a UserSignature to UserSignatureResponse
func (s *UserSignature) ToResponse() UserSignatureResponse {
	return UserSignatureResponse{
		ID:         s.ID.Hex(),
		UserID:     s.UserID.Hex(),
		Type:       s.Type,
		Data:       s.Data,
		Font:       s.Font,
		UsageCount: s.UsageCount,
		CreatedAt:  s.CreatedAt,
		UpdatedAt:  s.UpdatedAt,
	}
}

// IsValidUserSignatureType checks if a user signature type is valid
func IsValidUserSignatureType(t UserSignatureType) bool {
	switch t {
	case UserSignatureTypeImage, UserSignatureTypeDrawn, UserSignatureTypeTyped:
		return true
	default:
		return false
	}
}
