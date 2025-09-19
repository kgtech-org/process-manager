package handlers

import (
	"context"
	"net"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kodesonik/process-manager/internal/helpers"
	"github.com/kodesonik/process-manager/internal/middleware"
	"github.com/kodesonik/process-manager/internal/models"
	"github.com/kodesonik/process-manager/internal/services"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// NotificationHandler handles push notifications with Firebase FCM
type NotificationHandler struct {
	userService         *services.UserService
	notificationService *services.NotificationService
	deviceService       *services.DeviceService
}

// NewNotificationHandler creates a new notification handler
func NewNotificationHandler(userService *services.UserService, notificationService *services.NotificationService, deviceService *services.DeviceService) *NotificationHandler {
	return &NotificationHandler{
		userService:         userService,
		notificationService: notificationService,
		deviceService:       deviceService,
	}
}

// RegisterDevice registers a device for push notifications
func (h *NotificationHandler) RegisterDevice(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	currentUser, exists := middleware.GetCurrentUser(c)
	if !exists {
		helpers.SendErrorWithCode(c, 401, "User not authenticated")
		return
	}

	var req models.DeviceRegistrationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		helpers.SendValidationError(c, "Invalid input", err)
		return
	}

	// Get client IP
	ipAddress := getClientIP(c)

	// Register device
	device, err := h.deviceService.RegisterDevice(ctx, currentUser.ID, &req, ipAddress)
	if err != nil {
		helpers.SendErrorWithCode(c, 400, "Failed to register device: "+err.Error())
		return
	}

	helpers.SendSuccess(c, "Device registered successfully", device.ToResponse())
}

// UpdateDeviceToken updates the FCM token for a device
func (h *NotificationHandler) UpdateDeviceToken(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	currentUser, exists := middleware.GetCurrentUser(c)
	if !exists {
		helpers.SendErrorWithCode(c, 401, "User not authenticated")
		return
	}

	deviceUUID := c.Param("deviceUuid")

	var req models.UpdateTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		helpers.SendValidationError(c, "Invalid input", err)
		return
	}

	// Update device token
	err := h.deviceService.UpdateDeviceToken(ctx, currentUser.ID, deviceUUID, req.FCMToken)
	if err != nil {
		helpers.SendErrorWithCode(c, 400, "Failed to update device token: "+err.Error())
		return
	}

	helpers.SendSuccess(c, "Device token updated successfully", gin.H{
		"deviceUuid": deviceUUID,
	})
}

// GetUserDevices returns all registered devices for the current user
func (h *NotificationHandler) GetUserDevices(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	currentUser, exists := middleware.GetCurrentUser(c)
	if !exists {
		helpers.SendErrorWithCode(c, 401, "User not authenticated")
		return
	}

	// Get user devices
	devices, err := h.deviceService.GetUserDevices(ctx, currentUser.ID)
	if err != nil {
		helpers.SendErrorWithCode(c, 500, "Failed to get devices: "+err.Error())
		return
	}

	// Convert to response format (without sensitive data)
	var deviceResponses []models.DeviceResponse
	for _, device := range devices {
		deviceResponses = append(deviceResponses, device.ToResponse())
	}

	helpers.SendSuccess(c, "Devices retrieved successfully", gin.H{
		"devices": deviceResponses,
		"count":   len(deviceResponses),
	})
}

// DeregisterDevice removes a device from push notifications
func (h *NotificationHandler) DeregisterDevice(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	currentUser, exists := middleware.GetCurrentUser(c)
	if !exists {
		helpers.SendErrorWithCode(c, 401, "User not authenticated")
		return
	}

	deviceUUID := c.Param("deviceUuid")

	// Deregister device
	err := h.deviceService.DeregisterDevice(ctx, currentUser.ID, deviceUUID)
	if err != nil {
		helpers.SendErrorWithCode(c, 400, "Failed to deregister device: "+err.Error())
		return
	}

	helpers.SendSuccess(c, "Device deregistered successfully", gin.H{
		"deviceUuid": deviceUUID,
	})
}

// GetUserNotifications returns user's notifications
func (h *NotificationHandler) GetUserNotifications(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	currentUser, exists := middleware.GetCurrentUser(c)
	if !exists {
		helpers.SendErrorWithCode(c, 401, "User not authenticated")
		return
	}

	// Parse pagination
	page, limit := helpers.GetPaginationParams(c)
	status := c.Query("status") // optional filter by status

	// Get user notifications
	notifications, err := h.notificationService.GetUserNotifications(ctx, currentUser.ID, page, limit, status)
	if err != nil {
		helpers.SendErrorWithCode(c, 500, "Failed to get notifications: "+err.Error())
		return
	}

	// Get total count for pagination (simplified - using current page count)
	total := int64(len(notifications))
	totalPages := (total + int64(limit) - 1) / int64(limit)

	helpers.SendSuccessWithPagination(c, "Notifications retrieved successfully",
		notifications,
		helpers.PaginationInfo{
			Page:       page,
			Limit:      limit,
			Total:      int(total),
			TotalPages: int(totalPages),
		})
}

// MarkNotificationsAsRead marks notifications as read
func (h *NotificationHandler) MarkNotificationsAsRead(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	currentUser, exists := middleware.GetCurrentUser(c)
	if !exists {
		helpers.SendErrorWithCode(c, 401, "User not authenticated")
		return
	}

	var input struct {
		NotificationIDs []string `json:"notificationIds" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		helpers.SendValidationError(c, "Invalid input", err)
		return
	}

	markedCount := 0
	for _, idStr := range input.NotificationIDs {
		notificationID, err := primitive.ObjectIDFromHex(idStr)
		if err != nil {
			continue // Skip invalid IDs
		}

		err = h.notificationService.MarkAsRead(ctx, currentUser.ID, notificationID)
		if err == nil {
			markedCount++
		}
	}

	helpers.SendSuccess(c, "Notifications marked as read", gin.H{
		"markedCount": markedCount,
		"total":       len(input.NotificationIDs),
	})
}

// GetNotificationPreferences returns user's notification preferences
func (h *NotificationHandler) GetNotificationPreferences(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	currentUser, exists := middleware.GetCurrentUser(c)
	if !exists {
		helpers.SendErrorWithCode(c, 401, "User not authenticated")
		return
	}

	// Get user preferences
	prefs, err := h.notificationService.GetUserPreferences(ctx, currentUser.ID)
	if err != nil {
		helpers.SendErrorWithCode(c, 500, "Failed to get preferences: "+err.Error())
		return
	}

	helpers.SendSuccess(c, "Notification preferences retrieved successfully", prefs)
}

// UpdateNotificationPreferences updates user's notification preferences
func (h *NotificationHandler) UpdateNotificationPreferences(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	currentUser, exists := middleware.GetCurrentUser(c)
	if !exists {
		helpers.SendErrorWithCode(c, 401, "User not authenticated")
		return
	}

	var req models.UpdatePreferencesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		helpers.SendValidationError(c, "Invalid input", err)
		return
	}

	// Update preferences
	updatedPrefs, err := h.notificationService.UpdateUserPreferences(ctx, currentUser.ID, &req)
	if err != nil {
		helpers.SendErrorWithCode(c, 500, "Failed to update preferences: "+err.Error())
		return
	}

	helpers.SendSuccess(c, "Notification preferences updated successfully", updatedPrefs)
}

// SendPushNotification sends a push notification to specific users (Admin only)
func (h *NotificationHandler) SendPushNotification(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	currentUser, exists := middleware.GetCurrentUser(c)
	if !exists {
		helpers.SendErrorWithCode(c, 401, "User not authenticated")
		return
	}

	var req models.SendNotificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		helpers.SendValidationError(c, "Invalid input", err)
		return
	}

	// Send notification
	summary, err := h.notificationService.SendNotification(ctx, &req, currentUser.ID)
	if err != nil {
		helpers.SendErrorWithCode(c, 500, "Failed to send notification: "+err.Error())
		return
	}

	helpers.SendSuccess(c, "Push notification sent successfully", summary)
}

// TestPushNotification sends a test push notification to current user
func (h *NotificationHandler) TestPushNotification(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	currentUser, exists := middleware.GetCurrentUser(c)
	if !exists {
		helpers.SendErrorWithCode(c, 401, "User not authenticated")
		return
	}

	// Send test notification to current user
	err := h.notificationService.SendToUser(
		ctx,
		currentUser.ID,
		"Test Notification",
		"This is a test push notification from Process Manager",
		models.NotificationCategorySystem,
		map[string]interface{}{
			"test": true,
			"timestamp": time.Now().Unix(),
		},
	)

	if err != nil {
		helpers.SendErrorWithCode(c, 500, "Failed to send test notification: "+err.Error())
		return
	}

	helpers.SendSuccess(c, "Test notification sent successfully", gin.H{
		"userId": currentUser.ID,
		"sent":   true,
	})
}

// GetNotificationStats returns notification statistics for the current user
func (h *NotificationHandler) GetNotificationStats(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	currentUser, exists := middleware.GetCurrentUser(c)
	if !exists {
		helpers.SendErrorWithCode(c, 401, "User not authenticated")
		return
	}

	// Get notification statistics
	stats, err := h.notificationService.GetNotificationStats(ctx, currentUser.ID)
	if err != nil {
		helpers.SendErrorWithCode(c, 500, "Failed to get notification stats: "+err.Error())
		return
	}

	helpers.SendSuccess(c, "Notification statistics retrieved successfully", stats)
}

// Helper function to get client IP address
func getClientIP(c *gin.Context) string {
	// Check X-Forwarded-For header first
	forwarded := c.GetHeader("X-Forwarded-For")
	if forwarded != "" {
		// X-Forwarded-For can contain multiple IPs, take the first one
		if idx := net.ParseIP(forwarded); idx != nil {
			return forwarded
		}
	}

	// Check X-Real-IP header
	realIP := c.GetHeader("X-Real-IP")
	if realIP != "" {
		if ip := net.ParseIP(realIP); ip != nil {
			return realIP
		}
	}

	// Fall back to RemoteAddr
	ip, _, err := net.SplitHostPort(c.Request.RemoteAddr)
	if err != nil {
		return c.Request.RemoteAddr
	}
	return ip
}