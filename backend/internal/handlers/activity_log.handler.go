package handlers

import (
	"context"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kodesonik/process-manager/internal/helpers"
	"github.com/kodesonik/process-manager/internal/models"
	"github.com/kodesonik/process-manager/internal/services"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ActivityLogHandler handles activity log HTTP requests
type ActivityLogHandler struct {
	activityLogService *services.ActivityLogService
}

// NewActivityLogHandler creates a new activity log handler instance
func NewActivityLogHandler(activityLogService *services.ActivityLogService) *ActivityLogHandler {
	return &ActivityLogHandler{
		activityLogService: activityLogService,
	}
}

// GetActivityLogs returns activity logs with filters and pagination
// GET /api/activity-logs
func (h *ActivityLogHandler) GetActivityLogs(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	// Parse filters from query parameters
	filters := models.ActivityLogFilters{
		Page:  1,
		Limit: 20,
	}

	// Parse pagination
	if pageStr := c.Query("page"); pageStr != "" {
		if page, err := strconv.Atoi(pageStr); err == nil && page > 0 {
			filters.Page = page
		}
	}

	if limitStr := c.Query("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil && limit > 0 && limit <= 100 {
			filters.Limit = limit
		}
	}

	// Parse filters
	if userIDStr := c.Query("userId"); userIDStr != "" {
		if userID, err := primitive.ObjectIDFromHex(userIDStr); err == nil {
			filters.UserID = &userID
		}
	}

	if targetUserIDStr := c.Query("targetUserId"); targetUserIDStr != "" {
		if targetUserID, err := primitive.ObjectIDFromHex(targetUserIDStr); err == nil {
			filters.TargetUserID = &targetUserID
		}
	}

	if action := c.Query("action"); action != "" {
		filters.Action = models.ActivityAction(action)
	}

	if category := c.Query("category"); category != "" {
		filters.Category = models.ActivityCategory(category)
	}

	if level := c.Query("level"); level != "" {
		filters.Level = models.ActivityLevel(level)
	}

	if resourceType := c.Query("resourceType"); resourceType != "" {
		filters.ResourceType = resourceType
	}

	if resourceIDStr := c.Query("resourceId"); resourceIDStr != "" {
		if resourceID, err := primitive.ObjectIDFromHex(resourceIDStr); err == nil {
			filters.ResourceID = &resourceID
		}
	}

	if successStr := c.Query("success"); successStr != "" {
		if success, err := strconv.ParseBool(successStr); err == nil {
			filters.Success = &success
		}
	}

	if ipAddress := c.Query("ipAddress"); ipAddress != "" {
		filters.IPAddress = ipAddress
	}

	// Parse date filters
	if dateFromStr := c.Query("dateFrom"); dateFromStr != "" {
		if dateFrom, err := time.Parse(time.RFC3339, dateFromStr); err == nil {
			filters.DateFrom = &dateFrom
		}
	}

	if dateToStr := c.Query("dateTo"); dateToStr != "" {
		if dateTo, err := time.Parse(time.RFC3339, dateToStr); err == nil {
			filters.DateTo = &dateTo
		}
	}

	// Get activity logs
	activityLogs, total, err := h.activityLogService.GetActivityLogs(ctx, filters)
	if err != nil {
		helpers.SendErrorWithCode(c, 500, "Failed to retrieve activity logs", err.Error())
		return
	}

	// Convert to response format
	responses := h.activityLogService.ToResponseList(activityLogs)

	// Calculate pagination info
	totalPages := (int(total) + filters.Limit - 1) / filters.Limit

	helpers.SendSuccessWithPagination(c, "Activity logs retrieved successfully", responses, helpers.PaginationInfo{
		Page:       filters.Page,
		Limit:      filters.Limit,
		Total:      int(total),
		TotalPages: totalPages,
	})
}

// GetActivityLogByID returns a specific activity log by ID
// GET /api/activity-logs/:id
func (h *ActivityLogHandler) GetActivityLogByID(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	// Parse activity log ID
	idStr := c.Param("id")
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		helpers.SendErrorWithCode(c, 400, "Invalid activity log ID", "ID must be a valid ObjectID")
		return
	}

	// Get activity log
	activityLog, err := h.activityLogService.GetActivityLogByID(ctx, id)
	if err != nil {
		helpers.SendErrorWithCode(c, 404, "Activity log not found", err.Error())
		return
	}

	// Convert to response format
	response := activityLog.ToResponse()

	helpers.SendSuccess(c, "Activity log retrieved successfully", response)
}

// GetUserActivitySummary returns activity summary for a specific user
// GET /api/activity-logs/users/:userId/summary
func (h *ActivityLogHandler) GetUserActivitySummary(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 15*time.Second)
	defer cancel()

	// Parse user ID
	userIDStr := c.Param("userId")
	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		helpers.SendErrorWithCode(c, 400, "Invalid user ID", "ID must be a valid ObjectID")
		return
	}

	// Parse days parameter (default: 30 days)
	days := 30
	if daysStr := c.Query("days"); daysStr != "" {
		if parsedDays, err := strconv.Atoi(daysStr); err == nil && parsedDays > 0 && parsedDays <= 365 {
			days = parsedDays
		}
	}

	// Get user activity summary
	summary, err := h.activityLogService.GetUserActivitySummary(ctx, userID, days)
	if err != nil {
		helpers.SendErrorWithCode(c, 500, "Failed to retrieve user activity summary", err.Error())
		return
	}

	helpers.SendSuccess(c, "User activity summary retrieved successfully", summary)
}

// GetMyActivityLogs returns activity logs for the authenticated user
// GET /api/activity-logs/me
func (h *ActivityLogHandler) GetMyActivityLogs(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	// Get authenticated user
	user, exists := c.Get("user")
	if !exists {
		helpers.SendErrorWithCode(c, 401, "Unauthorized", "User not authenticated")
		return
	}

	userModel, ok := user.(*models.User)
	if !ok {
		helpers.SendErrorWithCode(c, 500, "Internal server error", "Invalid user context")
		return
	}

	// Parse filters from query parameters
	filters := models.ActivityLogFilters{
		UserID: &userModel.ID,
		Page:   1,
		Limit:  20,
	}

	// Parse pagination
	if pageStr := c.Query("page"); pageStr != "" {
		if page, err := strconv.Atoi(pageStr); err == nil && page > 0 {
			filters.Page = page
		}
	}

	if limitStr := c.Query("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil && limit > 0 && limit <= 100 {
			filters.Limit = limit
		}
	}

	// Parse additional filters
	if action := c.Query("action"); action != "" {
		filters.Action = models.ActivityAction(action)
	}

	if category := c.Query("category"); category != "" {
		filters.Category = models.ActivityCategory(category)
	}

	if level := c.Query("level"); level != "" {
		filters.Level = models.ActivityLevel(level)
	}

	// Parse date filters
	if dateFromStr := c.Query("dateFrom"); dateFromStr != "" {
		if dateFrom, err := time.Parse(time.RFC3339, dateFromStr); err == nil {
			filters.DateFrom = &dateFrom
		}
	}

	if dateToStr := c.Query("dateTo"); dateToStr != "" {
		if dateTo, err := time.Parse(time.RFC3339, dateToStr); err == nil {
			filters.DateTo = &dateTo
		}
	}

	// Get activity logs
	activityLogs, total, err := h.activityLogService.GetActivityLogs(ctx, filters)
	if err != nil {
		helpers.SendErrorWithCode(c, 500, "Failed to retrieve activity logs", err.Error())
		return
	}

	// Convert to response format
	responses := h.activityLogService.ToResponseList(activityLogs)

	// Calculate pagination info
	totalPages := (int(total) + filters.Limit - 1) / filters.Limit

	helpers.SendSuccessWithPagination(c, "Your activity logs retrieved successfully", responses, helpers.PaginationInfo{
		Page:       filters.Page,
		Limit:      filters.Limit,
		Total:      int(total),
		TotalPages: totalPages,
	})
}

// GetMyActivitySummary returns activity summary for the authenticated user
// GET /api/activity-logs/me/summary
func (h *ActivityLogHandler) GetMyActivitySummary(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 15*time.Second)
	defer cancel()

	// Get authenticated user
	user, exists := c.Get("user")
	if !exists {
		helpers.SendErrorWithCode(c, 401, "Unauthorized", "User not authenticated")
		return
	}

	userModel, ok := user.(*models.User)
	if !ok {
		helpers.SendErrorWithCode(c, 500, "Internal server error", "Invalid user context")
		return
	}

	// Parse days parameter (default: 30 days)
	days := 30
	if daysStr := c.Query("days"); daysStr != "" {
		if parsedDays, err := strconv.Atoi(daysStr); err == nil && parsedDays > 0 && parsedDays <= 365 {
			days = parsedDays
		}
	}

	// Get user activity summary
	summary, err := h.activityLogService.GetUserActivitySummary(ctx, userModel.ID, days)
	if err != nil {
		helpers.SendErrorWithCode(c, 500, "Failed to retrieve activity summary", err.Error())
		return
	}

	helpers.SendSuccess(c, "Your activity summary retrieved successfully", summary)
}

// GetActivityLogStats returns general activity log statistics (admin only)
// GET /api/activity-logs/stats
func (h *ActivityLogHandler) GetActivityLogStats(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 15*time.Second)
	defer cancel()

	// Get activity log statistics
	stats, err := h.activityLogService.GetActivityLogStats(ctx)
	if err != nil {
		helpers.SendErrorWithCode(c, 500, "Failed to retrieve activity log statistics", err.Error())
		return
	}

	helpers.SendSuccess(c, "Activity log statistics retrieved successfully", stats)
}

// CreateActivityLog manually creates an activity log (admin only)
// POST /api/activity-logs
func (h *ActivityLogHandler) CreateActivityLog(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	// Parse request body
	var req models.ActivityLogRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		helpers.SendValidationError(c, "Invalid request data", err)
		return
	}

	// Validate required fields
	if req.Action == "" {
		helpers.SendErrorWithCode(c, 400, "Validation failed", "Action is required")
		return
	}

	if req.Description == "" {
		helpers.SendErrorWithCode(c, 400, "Validation failed", "Description is required")
		return
	}

	// Log the activity
	if err := h.activityLogService.LogActivity(ctx, req, c); err != nil {
		helpers.SendErrorWithCode(c, 500, "Failed to create activity log", err.Error())
		return
	}

	helpers.SendSuccess(c, "Activity log created successfully", nil)
}

// DeleteOldActivityLogs removes old activity logs (admin only)
// DELETE /api/activity-logs/cleanup
func (h *ActivityLogHandler) DeleteOldActivityLogs(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 60*time.Second)
	defer cancel()

	// Parse olderThanDays parameter (default: 365 days)
	olderThanDays := 365
	if daysStr := c.Query("olderThanDays"); daysStr != "" {
		if parsedDays, err := strconv.Atoi(daysStr); err == nil && parsedDays > 0 {
			olderThanDays = parsedDays
		}
	}

	// Delete old activity logs
	deletedCount, err := h.activityLogService.DeleteOldActivityLogs(ctx, olderThanDays)
	if err != nil {
		helpers.SendErrorWithCode(c, 500, "Failed to delete old activity logs", err.Error())
		return
	}

	// Log this cleanup action
	cleanupReq := models.ActivityLogRequest{
		Action:      models.ActionSystemMaintenance,
		Description: "Cleaned up old activity logs",
		Success:     true,
		Details: map[string]interface{}{
			"deletedCount":   deletedCount,
			"olderThanDays": olderThanDays,
		},
	}
	_ = h.activityLogService.LogActivity(ctx, cleanupReq, c)

	helpers.SendSuccess(c, "Old activity logs deleted successfully", map[string]interface{}{
		"deletedCount":   deletedCount,
		"olderThanDays": olderThanDays,
	})
}