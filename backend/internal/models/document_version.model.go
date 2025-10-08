package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// DocumentVersion represents a version snapshot of a document
type DocumentVersion struct {
	ID         primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	DocumentID primitive.ObjectID `json:"documentId" bson:"document_id"`
	Version    string             `json:"version" bson:"version"`
	Data       Document           `json:"data" bson:"data"`
	CreatedBy  primitive.ObjectID `json:"createdBy" bson:"created_by"`
	CreatedAt  time.Time          `json:"createdAt" bson:"created_at"`
	ChangeNote string             `json:"changeNote" bson:"change_note"`
}

// DocumentVersionResponse represents the API response for a document version
type DocumentVersionResponse struct {
	ID         string           `json:"id"`
	DocumentID string           `json:"documentId"`
	Version    string           `json:"version"`
	Data       DocumentResponse `json:"data"`
	CreatedBy  string           `json:"createdBy"`
	CreatedAt  time.Time        `json:"createdAt"`
	ChangeNote string           `json:"changeNote"`
}

// ToResponse converts a DocumentVersion to DocumentVersionResponse
func (dv *DocumentVersion) ToResponse() DocumentVersionResponse {
	return DocumentVersionResponse{
		ID:         dv.ID.Hex(),
		DocumentID: dv.DocumentID.Hex(),
		Version:    dv.Version,
		Data:       dv.Data.ToResponse(),
		CreatedBy:  dv.CreatedBy.Hex(),
		CreatedAt:  dv.CreatedAt,
		ChangeNote: dv.ChangeNote,
	}
}
