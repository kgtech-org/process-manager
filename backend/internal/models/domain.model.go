package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Domain represents a high-level functional area grouping departments
type Domain struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	Name        string             `bson:"name" json:"name" validate:"required,min=2,max=100"`
	Code        string             `bson:"code" json:"code" validate:"required,min=2,max=20"`
	Description string             `bson:"description,omitempty" json:"description,omitempty"`
	Active      bool               `bson:"active" json:"active"`
	CreatedAt   time.Time          `bson:"created_at" json:"createdAt"`
	UpdatedAt   time.Time          `bson:"updated_at" json:"updatedAt"`
	CreatedBy   primitive.ObjectID `bson:"created_by,omitempty" json:"createdBy,omitempty"`
	UpdatedBy   primitive.ObjectID `bson:"updated_by,omitempty" json:"updatedBy,omitempty"`
}

// DomainResponse represents the API response for a domain
type DomainResponse struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Code        string    `json:"code"`
	Description string    `json:"description,omitempty"`
	Active      bool      `json:"active"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// ToResponse converts Domain to DomainResponse
func (d *Domain) ToResponse() DomainResponse {
	return DomainResponse{
		ID:          d.ID.Hex(),
		Name:        d.Name,
		Code:        d.Code,
		Description: d.Description,
		Active:      d.Active,
		CreatedAt:   d.CreatedAt,
		UpdatedAt:   d.UpdatedAt,
	}
}

// CreateDomainRequest represents request to create a new domain
type CreateDomainRequest struct {
	Name        string `json:"name" validate:"required,min=2,max=100"`
	Code        string `json:"code" validate:"required,min=2,max=20"`
	Description string `json:"description,omitempty"`
}

// UpdateDomainRequest represents request to update a domain
type UpdateDomainRequest struct {
	Name        string `json:"name,omitempty" validate:"omitempty,min=2,max=100"`
	Code        string `json:"code,omitempty" validate:"omitempty,min=2,max=20"`
	Description string `json:"description,omitempty"`
	Active      *bool  `json:"active,omitempty"`
}
