package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// PermissionLevel represents the level of access a user has to a document
type PermissionLevel string

const (
	PermissionLevelRead  PermissionLevel = "read"
	PermissionLevelWrite PermissionLevel = "write"
	PermissionLevelSign  PermissionLevel = "sign"
	PermissionLevelAdmin PermissionLevel = "admin"
)

// Permission represents access rights to a document
type Permission struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	DocumentID primitive.ObjectID `bson:"document_id" json:"documentId"`
	UserID     primitive.ObjectID `bson:"user_id" json:"userId"`
	Level      PermissionLevel    `bson:"level" json:"level"`
	GrantedBy  primitive.ObjectID `bson:"granted_by" json:"grantedBy"`
	GrantedAt  time.Time          `bson:"granted_at" json:"grantedAt"`
	UpdatedAt  time.Time          `bson:"updated_at" json:"updatedAt"`
}

// PermissionResponse represents the API response for a permission
type PermissionResponse struct {
	ID            string          `json:"id"`
	DocumentID    string          `json:"documentId"`
	UserID        string          `json:"userId"`
	UserName      string          `json:"userName,omitempty"`
	UserEmail     string          `json:"userEmail,omitempty"`
	Level         PermissionLevel `json:"level"`
	GrantedBy     string          `json:"grantedBy"`
	GrantedByName string          `json:"grantedByName,omitempty"`
	GrantedAt     time.Time       `json:"grantedAt"`
	UpdatedAt     time.Time       `json:"updatedAt"`
}

// CreatePermissionRequest represents the request to create a permission
type CreatePermissionRequest struct {
	UserID string          `json:"userId" binding:"required"`
	Level  PermissionLevel `json:"level" binding:"required"`
}

// UpdatePermissionRequest represents the request to update a permission
type UpdatePermissionRequest struct {
	Level PermissionLevel `json:"level" binding:"required"`
}

// ToResponse converts a Permission to PermissionResponse
func (p *Permission) ToResponse() PermissionResponse {
	return PermissionResponse{
		ID:         p.ID.Hex(),
		DocumentID: p.DocumentID.Hex(),
		UserID:     p.UserID.Hex(),
		Level:      p.Level,
		GrantedBy:  p.GrantedBy.Hex(),
		GrantedAt:  p.GrantedAt,
		UpdatedAt:  p.UpdatedAt,
	}
}

// IsValidPermissionLevel checks if the permission level is valid
func IsValidPermissionLevel(level PermissionLevel) bool {
	switch level {
	case PermissionLevelRead, PermissionLevelWrite, PermissionLevelSign, PermissionLevelAdmin:
		return true
	default:
		return false
	}
}

// CanRead checks if the permission allows reading
func (p *Permission) CanRead() bool {
	return p.Level == PermissionLevelRead ||
		p.Level == PermissionLevelWrite ||
		p.Level == PermissionLevelSign ||
		p.Level == PermissionLevelAdmin
}

// CanWrite checks if the permission allows writing
func (p *Permission) CanWrite() bool {
	return p.Level == PermissionLevelWrite ||
		p.Level == PermissionLevelSign ||
		p.Level == PermissionLevelAdmin
}

// CanSign checks if the permission allows signing
func (p *Permission) CanSign() bool {
	return p.Level == PermissionLevelSign ||
		p.Level == PermissionLevelAdmin
}

// CanAdmin checks if the permission allows admin actions
func (p *Permission) CanAdmin() bool {
	return p.Level == PermissionLevelAdmin
}

// BeforeCreate sets timestamps before creating a permission
func (p *Permission) BeforeCreate() {
	now := time.Now()
	p.GrantedAt = now
	p.UpdatedAt = now
}

// BeforeUpdate sets the updated timestamp
func (p *Permission) BeforeUpdate() {
	p.UpdatedAt = time.Now()
}
