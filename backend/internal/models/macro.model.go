package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Macro represents a macro-process that groups multiple micro-processes (processes) by domain
// Example: M1 - Stratégie & Évolution des Infrastructures et Services
type Macro struct {
	ID               primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Code             string             `json:"code" bson:"code"`                          // M1, M2, M3, etc.
	Name             string             `json:"name" bson:"name"`                          // Full name of the macro
	ShortDescription string             `json:"shortDescription" bson:"short_description"` // Brief description (1-2 sentences)
	Description      string             `json:"description" bson:"description"`            // Detailed description
	IsActive         bool               `json:"isActive" bson:"is_active"`                 // Active status
	CreatedBy        primitive.ObjectID `json:"createdBy" bson:"created_by"`               // User who created the macro
	CreatedAt        time.Time          `json:"createdAt" bson:"created_at"`
	UpdatedAt        time.Time          `json:"updatedAt" bson:"updated_at"`
}

// MacroResponse represents the API response for a macro
type MacroResponse struct {
	ID               string    `json:"id"`
	Code             string    `json:"code"`
	Name             string    `json:"name"`
	ShortDescription string    `json:"shortDescription"`
	Description      string    `json:"description"`
	IsActive         bool      `json:"isActive"`
	CreatedBy        string    `json:"createdBy"`
	ProcessCount     int       `json:"processCount,omitempty"` // Number of processes in this macro
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
}

// ToResponse converts a Macro to MacroResponse
func (m *Macro) ToResponse() MacroResponse {
	return MacroResponse{
		ID:               m.ID.Hex(),
		Code:             m.Code,
		Name:             m.Name,
		ShortDescription: m.ShortDescription,
		Description:      m.Description,
		IsActive:         m.IsActive,
		CreatedBy:        m.CreatedBy.Hex(),
		CreatedAt:        m.CreatedAt,
		UpdatedAt:        m.UpdatedAt,
	}
}

// CreateMacroRequest represents the request to create a macro
type CreateMacroRequest struct {
	Code             string `json:"code" binding:"required"`             // M1, M2, M3, etc.
	Name             string `json:"name" binding:"required"`             // Full name
	ShortDescription string `json:"shortDescription" binding:"required"` // Brief description
	Description      string `json:"description" binding:"required"`      // Detailed description
}

// UpdateMacroRequest represents the request to update a macro
type UpdateMacroRequest struct {
	Name             *string `json:"name"`
	ShortDescription *string `json:"shortDescription"`
	Description      *string `json:"description"`
	IsActive         *bool   `json:"isActive"`
}

// MacroFilter represents filtering options for macros
type MacroFilter struct {
	Search   *string `json:"search"` // Search in name, code, or description
	Page     int     `json:"page"`
	Limit    int     `json:"limit"`
	IsActive *bool   `json:"isActive"` // Filter by active status
}

// MacroWithProcesses represents a macro with its associated processes
type MacroWithProcesses struct {
	Macro        MacroResponse      `json:"macro"`
	ProcessCount int                `json:"processCount"`
	Processes    []DocumentResponse `json:"processes,omitempty"`
}
