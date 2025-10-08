package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// SignatureType represents the type of signature
type SignatureType string

const (
	SignatureTypeAuthor    SignatureType = "author"
	SignatureTypeVerifier  SignatureType = "verifier"
	SignatureTypeValidator SignatureType = "validator"
)

// Signature represents a digital signature on a document
type Signature struct {
	ID            primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	DocumentID    primitive.ObjectID `bson:"document_id" json:"documentId"`
	UserID        primitive.ObjectID `bson:"user_id" json:"userId"`
	Type          SignatureType      `bson:"type" json:"type"`
	SignatureData string             `bson:"signature_data" json:"signatureData"` // Base64 encoded signature image or hash
	Comments      string             `bson:"comments,omitempty" json:"comments,omitempty"`
	IPAddress     string             `bson:"ip_address" json:"ipAddress"`
	UserAgent     string             `bson:"user_agent" json:"userAgent"`
	SignedAt      time.Time          `bson:"signed_at" json:"signedAt"`
	CreatedAt     time.Time          `bson:"created_at" json:"createdAt"`
}

// SignatureResponse represents the API response for a signature
type SignatureResponse struct {
	ID            string        `json:"id"`
	DocumentID    string        `json:"documentId"`
	UserID        string        `json:"userId"`
	UserName      string        `json:"userName,omitempty"`
	UserEmail     string        `json:"userEmail,omitempty"`
	Type          SignatureType `json:"type"`
	SignatureData string        `json:"signatureData"`
	Comments      string        `json:"comments,omitempty"`
	IPAddress     string        `json:"ipAddress"`
	UserAgent     string        `json:"userAgent"`
	SignedAt      time.Time     `json:"signedAt"`
	CreatedAt     time.Time     `json:"createdAt"`
}

// CreateSignatureRequest represents the request to create a signature
type CreateSignatureRequest struct {
	Type          SignatureType `json:"type" binding:"required"`
	SignatureData string        `json:"signatureData" binding:"required"`
	Comments      string        `json:"comments"`
}

// ToResponse converts a Signature to SignatureResponse
func (s *Signature) ToResponse() SignatureResponse {
	return SignatureResponse{
		ID:            s.ID.Hex(),
		DocumentID:    s.DocumentID.Hex(),
		UserID:        s.UserID.Hex(),
		Type:          s.Type,
		SignatureData: s.SignatureData,
		Comments:      s.Comments,
		IPAddress:     s.IPAddress,
		UserAgent:     s.UserAgent,
		SignedAt:      s.SignedAt,
		CreatedAt:     s.CreatedAt,
	}
}

// IsValidSignatureType checks if the signature type is valid
func IsValidSignatureType(sigType SignatureType) bool {
	switch sigType {
	case SignatureTypeAuthor, SignatureTypeVerifier, SignatureTypeValidator:
		return true
	default:
		return false
	}
}

// BeforeCreate sets timestamps before creating a signature
func (s *Signature) BeforeCreate() {
	now := time.Now()
	s.SignedAt = now
	s.CreatedAt = now
}
