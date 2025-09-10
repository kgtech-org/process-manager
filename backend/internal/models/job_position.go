package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// JobPosition represents a job position/role within an organization
type JobPosition struct {
	ID            primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	Title         string             `bson:"title" json:"title" validate:"required,min=2,max=100"`
	Code          string             `bson:"code" json:"code" validate:"required,min=2,max=20"`
	Description   string             `bson:"description,omitempty" json:"description,omitempty"`
	DepartmentID  primitive.ObjectID `bson:"department_id" json:"department_id" validate:"required"`
	Level         string             `bson:"level,omitempty" json:"level,omitempty"` // Junior, Mid, Senior, Lead, Manager, Director
	RequiredSkills []string           `bson:"required_skills,omitempty" json:"required_skills,omitempty"`
	Active        bool               `bson:"active" json:"active"`
	CreatedAt     time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt     time.Time          `bson:"updated_at" json:"updated_at"`
	CreatedBy     primitive.ObjectID `bson:"created_by,omitempty" json:"created_by,omitempty"`
	UpdatedBy     primitive.ObjectID `bson:"updated_by,omitempty" json:"updated_by,omitempty"`
}

// JobPositionResponse represents the API response for a job position
type JobPositionResponse struct {
	ID             string    `json:"id"`
	Title          string    `json:"title"`
	Code           string    `json:"code"`
	Description    string    `json:"description,omitempty"`
	DepartmentID   string    `json:"department_id"`
	Level          string    `json:"level,omitempty"`
	RequiredSkills []string  `json:"required_skills,omitempty"`
	Active         bool      `json:"active"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// ToResponse converts JobPosition to JobPositionResponse
func (j *JobPosition) ToResponse() JobPositionResponse {
	return JobPositionResponse{
		ID:             j.ID.Hex(),
		Title:          j.Title,
		Code:           j.Code,
		Description:    j.Description,
		DepartmentID:   j.DepartmentID.Hex(),
		Level:          j.Level,
		RequiredSkills: j.RequiredSkills,
		Active:         j.Active,
		CreatedAt:      j.CreatedAt,
		UpdatedAt:      j.UpdatedAt,
	}
}

// CreateJobPositionRequest represents request to create a new job position
type CreateJobPositionRequest struct {
	Title          string   `json:"title" validate:"required,min=2,max=100"`
	Code           string   `json:"code" validate:"required,min=2,max=20"`
	Description    string   `json:"description,omitempty"`
	DepartmentID   string   `json:"department_id" validate:"required"`
	Level          string   `json:"level,omitempty"`
	RequiredSkills []string `json:"required_skills,omitempty"`
}

// UpdateJobPositionRequest represents request to update a job position
type UpdateJobPositionRequest struct {
	Title          string   `json:"title,omitempty" validate:"omitempty,min=2,max=100"`
	Code           string   `json:"code,omitempty" validate:"omitempty,min=2,max=20"`
	Description    string   `json:"description,omitempty"`
	DepartmentID   string   `json:"department_id,omitempty"`
	Level          string   `json:"level,omitempty"`
	RequiredSkills []string `json:"required_skills,omitempty"`
	Active         *bool    `json:"active,omitempty"`
}

// JobPositionLevel constants for common position levels
const (
	LevelJunior    = "junior"
	LevelMid       = "mid"
	LevelSenior    = "senior"
	LevelLead      = "lead"
	LevelManager   = "manager"
	LevelDirector  = "director"
	LevelExecutive = "executive"
)

// ValidLevels returns a slice of valid job position levels
func ValidLevels() []string {
	return []string{
		LevelJunior,
		LevelMid,
		LevelSenior,
		LevelLead,
		LevelManager,
		LevelDirector,
		LevelExecutive,
	}
}

// IsValidLevel checks if a level is valid
func IsValidLevel(level string) bool {
	validLevels := ValidLevels()
	for _, validLevel := range validLevels {
		if level == validLevel {
			return true
		}
	}
	return false
}