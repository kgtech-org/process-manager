package services

import (
	"context"
	"time"

	"github.com/kodesonik/process-manager/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// FeedbackService handles operations for feedback templates and submissions
type FeedbackService struct {
	db           *DatabaseService
	templatesCol *mongo.Collection
	feedbackCol  *mongo.Collection
}

// NewFeedbackService creates a new instance of FeedbackService
func NewFeedbackService(db *DatabaseService) *FeedbackService {
	return &FeedbackService{
		db:           db,
		templatesCol: db.Collection("feedback_templates"),
		feedbackCol:  db.Collection("process_feedback"),
	}
}

// ----------------------------------------------------
// Template Management
// ----------------------------------------------------

// CreateTemplate creates a new feedback template
func (s *FeedbackService) CreateTemplate(ctx context.Context, req models.CreateFeedbackTemplateRequest) (*models.FeedbackTemplate, error) {
	template := models.FeedbackTemplate{
		ID:          primitive.NewObjectID(),
		Name:        req.Name,
		Description: req.Description,
		Questions:   req.Questions,
		IsActive:    true, // Default to true
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if req.IsActive != nil {
		template.IsActive = *req.IsActive
	}

	_, err := s.templatesCol.InsertOne(ctx, template)
	if err != nil {
		return nil, err
	}

	return &template, nil
}

// GetTemplates retrieves all feedback templates
func (s *FeedbackService) GetTemplates(ctx context.Context, activeOnly bool) ([]models.FeedbackTemplate, error) {
	filter := bson.M{}
	if activeOnly {
		filter["isActive"] = true
	}

	opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}})
	cursor, err := s.templatesCol.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var templates []models.FeedbackTemplate
	if err = cursor.All(ctx, &templates); err != nil {
		return nil, err
	}

	return templates, nil
}

// GetTemplateByID retrieves a specific feedback template
func (s *FeedbackService) GetTemplateByID(ctx context.Context, id string) (*models.FeedbackTemplate, error) {
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}

	var template models.FeedbackTemplate
	err = s.templatesCol.FindOne(ctx, bson.M{"_id": objID}).Decode(&template)
	if err != nil {
		return nil, err
	}

	return &template, nil
}

// UpdateTemplate updates an existing feedback template
func (s *FeedbackService) UpdateTemplate(ctx context.Context, id string, req models.CreateFeedbackTemplateRequest) (*models.FeedbackTemplate, error) {
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}

	update := bson.M{
		"$set": bson.M{
			"name":        req.Name,
			"description": req.Description,
			"questions":   req.Questions,
			"updatedAt":   time.Now(),
		},
	}

	if req.IsActive != nil {
		update["$set"].(bson.M)["isActive"] = *req.IsActive
	}

	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var template models.FeedbackTemplate
	err = s.templatesCol.FindOneAndUpdate(ctx, bson.M{"_id": objID}, update, opts).Decode(&template)
	if err != nil {
		return nil, err
	}

	return &template, nil
}

// DeleteTemplate deletes a feedback template
func (s *FeedbackService) DeleteTemplate(ctx context.Context, id string) error {
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}

	_, err = s.templatesCol.DeleteOne(ctx, bson.M{"_id": objID})
	return err
}

// ----------------------------------------------------
// Feedback Submissions
// ----------------------------------------------------

// SubmitFeedback records a user's feedback for a process
func (s *FeedbackService) SubmitFeedback(ctx context.Context, userID primitive.ObjectID, req models.SubmitFeedbackRequest) (*models.ProcessFeedback, error) {
	processID, err := primitive.ObjectIDFromHex(req.ProcessID)
	if err != nil {
		return nil, err
	}
	macroID, err := primitive.ObjectIDFromHex(req.MacroID)
	if err != nil {
		return nil, err
	}
	templateID, err := primitive.ObjectIDFromHex(req.TemplateID)
	if err != nil {
		return nil, err
	}

	feedback := models.ProcessFeedback{
		ID:         primitive.NewObjectID(),
		ProcessID:  processID,
		MacroID:    macroID,
		UserID:     userID,
		TemplateID: templateID,
		Responses:  req.Responses,
		Status:     models.FeedbackStatusSubmitted,
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	_, err = s.feedbackCol.InsertOne(ctx, feedback)
	if err != nil {
		return nil, err
	}

	return &feedback, nil
}

// GetAllFeedback retrieves all submitted feedback (Admin view)
func (s *FeedbackService) GetAllFeedback(ctx context.Context) ([]models.ProcessFeedback, error) {
	opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}})
	cursor, err := s.feedbackCol.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var feedbacks []models.ProcessFeedback
	if err = cursor.All(ctx, &feedbacks); err != nil {
		return nil, err
	}

	return feedbacks, nil
}

// GetFeedbackForProcess retrieves all feedback for a specific process
func (s *FeedbackService) GetFeedbackForProcess(ctx context.Context, processIDStr string) ([]models.ProcessFeedback, error) {
	processID, err := primitive.ObjectIDFromHex(processIDStr)
	if err != nil {
		return nil, err
	}

	opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}})
	cursor, err := s.feedbackCol.Find(ctx, bson.M{"processId": processID}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var feedbacks []models.ProcessFeedback
	if err = cursor.All(ctx, &feedbacks); err != nil {
		return nil, err
	}

	return feedbacks, nil
}

// GetFeedbackByID retrieves a specific feedback submission
func (s *FeedbackService) GetFeedbackByID(ctx context.Context, id string) (*models.ProcessFeedback, error) {
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}

	var feedback models.ProcessFeedback
	err = s.feedbackCol.FindOne(ctx, bson.M{"_id": objID}).Decode(&feedback)
	if err != nil {
		return nil, err
	}

	return &feedback, nil
}

// UpdateFeedbackStatus updates the status/notes of a feedback submission
func (s *FeedbackService) UpdateFeedbackStatus(ctx context.Context, id string, req models.UpdateFeedbackStatusRequest) (*models.ProcessFeedback, error) {
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}

	update := bson.M{
		"$set": bson.M{
			"status":    req.Status,
			"updatedAt": time.Now(),
		},
	}

	if req.Notes != "" {
		update["$set"].(bson.M)["notes"] = req.Notes
	}

	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var feedback models.ProcessFeedback
	err = s.feedbackCol.FindOneAndUpdate(ctx, bson.M{"_id": objID}, update, opts).Decode(&feedback)
	if err != nil {
		return nil, err
	}

	return &feedback, nil
}
