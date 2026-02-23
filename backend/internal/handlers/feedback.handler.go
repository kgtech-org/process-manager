package handlers

import (
	"context"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kodesonik/process-manager/internal/helpers"
	"github.com/kodesonik/process-manager/internal/middleware"
	"github.com/kodesonik/process-manager/internal/models"
	"github.com/kodesonik/process-manager/internal/services"
)

// FeedbackHandler handles feedback-related HTTP requests
type FeedbackHandler struct {
	service *services.FeedbackService
}

// NewFeedbackHandler creates a new feedback handler instance
func NewFeedbackHandler(service *services.FeedbackService) *FeedbackHandler {
	return &FeedbackHandler{
		service: service,
	}
}

// ----------------------------------------------------
// Templates
// ----------------------------------------------------

// CreateTemplate creates a new feedback template
// POST /api/feedback/templates
func (h *FeedbackHandler) CreateTemplate(c *gin.Context) {
	var req models.CreateFeedbackTemplateRequest
	if err := helpers.BindAndValidate(c, &req); err != nil {
		helpers.SendValidationErrors(c, err)
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	template, err := h.service.CreateTemplate(ctx, req)
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	helpers.SendCreated(c, "Feedback template created successfully", template.ToResponse())
}

// GetTemplates retrieves all feedback templates
// GET /api/feedback/templates
func (h *FeedbackHandler) GetTemplates(c *gin.Context) {
	activeOnly := c.Query("active") == "true"

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	templates, err := h.service.GetTemplates(ctx, activeOnly)
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	responses := make([]models.FeedbackTemplateResponse, len(templates))
	for i, t := range templates {
		responses[i] = t.ToResponse()
	}

	helpers.SendSuccess(c, "Feedback templates retrieved successfully", responses)
}

// GetTemplateByID retrieves a specific feedback template
// GET /api/feedback/templates/:id
func (h *FeedbackHandler) GetTemplateByID(c *gin.Context) {
	id := c.Param("id")

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	template, err := h.service.GetTemplateByID(ctx, id)
	if err != nil {
		helpers.SendError(c, models.ErrUserNotFound) // Reuse generic "not found" abstraction
		return
	}

	helpers.SendSuccess(c, "Feedback template retrieved successfully", template.ToResponse())
}

// UpdateTemplate updates a template
// PUT /api/feedback/templates/:id
func (h *FeedbackHandler) UpdateTemplate(c *gin.Context) {
	id := c.Param("id")
	var req models.CreateFeedbackTemplateRequest
	if err := helpers.BindAndValidate(c, &req); err != nil {
		helpers.SendValidationErrors(c, err)
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	template, err := h.service.UpdateTemplate(ctx, id, req)
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	helpers.SendSuccess(c, "Feedback template updated successfully", template.ToResponse())
}

// DeleteTemplate deletes a template
// DELETE /api/feedback/templates/:id
func (h *FeedbackHandler) DeleteTemplate(c *gin.Context) {
	id := c.Param("id")

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	err := h.service.DeleteTemplate(ctx, id)
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	helpers.SendSuccess(c, "Feedback template deleted successfully", gin.H{"deleted_id": id})
}

// ----------------------------------------------------
// Feedback Submissions
// ----------------------------------------------------

// SubmitFeedback submits user feedback for a process
// POST /api/feedback
func (h *FeedbackHandler) SubmitFeedback(c *gin.Context) {
	var req models.SubmitFeedbackRequest
	if err := helpers.BindAndValidate(c, &req); err != nil {
		helpers.SendValidationErrors(c, err)
		return
	}

	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		helpers.SendError(c, models.ErrInvalidToken)
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	feedback, err := h.service.SubmitFeedback(ctx, userID, req)
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	helpers.SendCreated(c, "Feedback submitted successfully", feedback.ToResponse())
}

// GetAllFeedback retrieves all feedback (admin)
// GET /api/feedback
func (h *FeedbackHandler) GetAllFeedback(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	feedbacks, err := h.service.GetAllFeedback(ctx)
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	responses := make([]models.ProcessFeedbackResponse, len(feedbacks))
	for i, f := range feedbacks {
		responses[i] = f.ToResponse()
	}

	helpers.SendSuccess(c, "Feedback retrieved successfully", responses)
}

// GetFeedbackForProcess retrieves all feedback for a specific process
// GET /api/processes/:id/feedback
func (h *FeedbackHandler) GetFeedbackForProcess(c *gin.Context) {
	processID := c.Param("id")

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	feedbacks, err := h.service.GetFeedbackForProcess(ctx, processID)
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	responses := make([]models.ProcessFeedbackResponse, len(feedbacks))
	for i, f := range feedbacks {
		responses[i] = f.ToResponse()
	}

	helpers.SendSuccess(c, "Process feedback retrieved successfully", responses)
}

// GetFeedbackByID retrieves specific feedback
// GET /api/feedback/:id
func (h *FeedbackHandler) GetFeedbackByID(c *gin.Context) {
	id := c.Param("id")

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	feedback, err := h.service.GetFeedbackByID(ctx, id)
	if err != nil {
		helpers.SendError(c, models.ErrUserNotFound) // Generic not found
		return
	}

	helpers.SendSuccess(c, "Feedback details retrieved successfully", feedback.ToResponse())
}

// UpdateFeedbackStatus updates the status of a feedback submission
// PATCH /api/feedback/:id/status
func (h *FeedbackHandler) UpdateFeedbackStatus(c *gin.Context) {
	id := c.Param("id")
	var req models.UpdateFeedbackStatusRequest
	if err := helpers.BindAndValidate(c, &req); err != nil {
		helpers.SendValidationErrors(c, err)
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	feedback, err := h.service.UpdateFeedbackStatus(ctx, id, req)
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	helpers.SendSuccess(c, "Feedback status updated successfully", feedback.ToResponse())
}
