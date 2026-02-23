package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// FeedbackQuestion represents a single question in a feedback template
type FeedbackQuestion struct {
	ID       string   `bson:"id" json:"id"`
	Text     string   `bson:"text" json:"text"`
	Type     string   `bson:"type" json:"type"` // text, rating, singleChoice, multiChoice
	Required bool     `bson:"required" json:"required"`
	Options  []string `bson:"options,omitempty" json:"options,omitempty"`
	Order    int      `bson:"order" json:"order"`
}

// FeedbackTemplate represents a reusable template for gathering feedback
type FeedbackTemplate struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name        string             `bson:"name" json:"name"`
	Description string             `bson:"description" json:"description"`
	Questions   []FeedbackQuestion `bson:"questions" json:"questions"`
	IsActive    bool               `bson:"isActive" json:"isActive"`
	CreatedAt   time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt   time.Time          `bson:"updatedAt" json:"updatedAt"`
}

// FeedbackResponse represents a user's answer to a specific question
type FeedbackResponse struct {
	QuestionID   string `bson:"questionId" json:"questionId"`
	QuestionText string `bson:"questionText" json:"questionText"`
	ResponseType string `bson:"responseType" json:"responseType"` // text, rating, choice, multiChoice
	Answer       string `bson:"answer" json:"answer"`
}

// ProcessFeedback represents a submitted feedback form for a specific process
type ProcessFeedback struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	ProcessID  primitive.ObjectID `bson:"processId" json:"processId"`
	MacroID    primitive.ObjectID `bson:"macroId" json:"macroId"`
	UserID     primitive.ObjectID `bson:"userId" json:"userId"`
	TemplateID primitive.ObjectID `bson:"templateId" json:"templateId"`
	Responses  []FeedbackResponse `bson:"responses" json:"responses"`
	Status     string             `bson:"status" json:"status"`                   // submitted, reviewed, addressed
	Notes      string             `bson:"notes,omitempty" json:"notes,omitempty"` // Admin notes
	CreatedAt  time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt  time.Time          `bson:"updatedAt" json:"updatedAt"`
}

// Constants for Question Types
const (
	QuestionTypeText         = "text"
	QuestionTypeLongText     = "longText"
	QuestionTypeRating       = "rating"
	QuestionTypeSingleChoice = "singleChoice"
	QuestionTypeMultiChoice  = "multiChoice"
)

// Constants for Feedback Status
const (
	FeedbackStatusSubmitted = "submitted"
	FeedbackStatusReviewed  = "reviewed"
	FeedbackStatusAddressed = "addressed"
)

// ============================================
// API Request/Response Models
// ============================================

// FeedbackTemplateResponse represents the API response for a feedback template
type FeedbackTemplateResponse struct {
	ID          string             `json:"id"`
	Name        string             `json:"name"`
	Description string             `json:"description"`
	Questions   []FeedbackQuestion `json:"questions"`
	IsActive    bool               `json:"isActive"`
	CreatedAt   time.Time          `json:"createdAt"`
	UpdatedAt   time.Time          `json:"updatedAt"`
}

// CreateFeedbackTemplateRequest represents request to create a new template
type CreateFeedbackTemplateRequest struct {
	Name        string             `json:"name" validate:"required,min=2,max=100"`
	Description string             `json:"description" validate:"required"`
	Questions   []FeedbackQuestion `json:"questions" validate:"required,min=1"`
	IsActive    *bool              `json:"isActive"`
}

// SubmitFeedbackRequest represents request to submit feedback for a process
type SubmitFeedbackRequest struct {
	ProcessID  string             `json:"processId" validate:"required"`
	MacroID    string             `json:"macroId" validate:"required"`
	TemplateID string             `json:"templateId" validate:"required"`
	Responses  []FeedbackResponse `json:"responses" validate:"required,min=1"`
}

// ProcessFeedbackResponse represents the API response for submitted feedback
type ProcessFeedbackResponse struct {
	ID         string             `json:"id"`
	ProcessID  string             `json:"processId"`
	MacroID    string             `json:"macroId"`
	UserID     string             `json:"userId"`
	TemplateID string             `json:"templateId"`
	Responses  []FeedbackResponse `json:"responses"`
	Status     string             `json:"status"`
	Notes      string             `json:"notes,omitempty"`
	CreatedAt  time.Time          `json:"createdAt"`
	UpdatedAt  time.Time          `json:"updatedAt"`
}

// UpdateFeedbackStatusRequest represents request to update feedback status
type UpdateFeedbackStatusRequest struct {
	Status string `json:"status" validate:"required,oneof=reviewed addressed"`
	Notes  string `json:"notes,omitempty"`
}

// ToResponse converts FeedbackTemplate to FeedbackTemplateResponse
func (t *FeedbackTemplate) ToResponse() FeedbackTemplateResponse {
	return FeedbackTemplateResponse{
		ID:          t.ID.Hex(),
		Name:        t.Name,
		Description: t.Description,
		Questions:   t.Questions,
		IsActive:    t.IsActive,
		CreatedAt:   t.CreatedAt,
		UpdatedAt:   t.UpdatedAt,
	}
}

// ToResponse converts ProcessFeedback to ProcessFeedbackResponse
func (f *ProcessFeedback) ToResponse() ProcessFeedbackResponse {
	return ProcessFeedbackResponse{
		ID:         f.ID.Hex(),
		ProcessID:  f.ProcessID.Hex(),
		MacroID:    f.MacroID.Hex(),
		UserID:     f.UserID.Hex(),
		TemplateID: f.TemplateID.Hex(),
		Responses:  f.Responses,
		Status:     f.Status,
		Notes:      f.Notes,
		CreatedAt:  f.CreatedAt,
		UpdatedAt:  f.UpdatedAt,
	}
}
