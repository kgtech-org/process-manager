package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Department represents an organizational department
type Department struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	Name        string             `bson:"name" json:"name" validate:"required,min=2,max=100"`
	Code        string             `bson:"code" json:"code" validate:"required,min=2,max=20"`
	Description string             `bson:"description,omitempty" json:"description,omitempty"`
	Active      bool               `bson:"active" json:"active"`
	ParentID    *primitive.ObjectID `bson:"parent_id,omitempty" json:"parent_id,omitempty"` // For hierarchical departments
	ManagerID   *primitive.ObjectID `bson:"manager_id,omitempty" json:"manager_id,omitempty"` // Department manager user ID
	CreatedAt   time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt   time.Time          `bson:"updated_at" json:"updated_at"`
	CreatedBy   primitive.ObjectID `bson:"created_by,omitempty" json:"created_by,omitempty"`
	UpdatedBy   primitive.ObjectID `bson:"updated_by,omitempty" json:"updated_by,omitempty"`
}

// DepartmentResponse represents the API response for a department
type DepartmentResponse struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Code        string    `json:"code"`
	Description string    `json:"description,omitempty"`
	Active      bool      `json:"active"`
	ParentID    string    `json:"parent_id,omitempty"`
	ManagerID   string    `json:"manager_id,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// ToResponse converts Department to DepartmentResponse
func (d *Department) ToResponse() DepartmentResponse {
	resp := DepartmentResponse{
		ID:          d.ID.Hex(),
		Name:        d.Name,
		Code:        d.Code,
		Description: d.Description,
		Active:      d.Active,
		CreatedAt:   d.CreatedAt,
		UpdatedAt:   d.UpdatedAt,
	}
	
	if d.ParentID != nil {
		resp.ParentID = d.ParentID.Hex()
	}
	
	if d.ManagerID != nil {
		resp.ManagerID = d.ManagerID.Hex()
	}
	
	return resp
}

// CreateDepartmentRequest represents request to create a new department
type CreateDepartmentRequest struct {
	Name        string `json:"name" validate:"required,min=2,max=100"`
	Code        string `json:"code" validate:"required,min=2,max=20"`
	Description string `json:"description,omitempty"`
	ParentID    string `json:"parent_id,omitempty"`
	ManagerID   string `json:"manager_id,omitempty"`
}

// UpdateDepartmentRequest represents request to update a department
type UpdateDepartmentRequest struct {
	Name        string `json:"name,omitempty" validate:"omitempty,min=2,max=100"`
	Code        string `json:"code,omitempty" validate:"omitempty,min=2,max=20"`
	Description string `json:"description,omitempty"`
	Active      *bool  `json:"active,omitempty"`
	ParentID    string `json:"parent_id,omitempty"`
	ManagerID   string `json:"manager_id,omitempty"`
}