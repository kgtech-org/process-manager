package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/kodesonik/process-manager/internal/handlers"
	"github.com/kodesonik/process-manager/internal/middleware"
)

// SetupNotificationRoutes configures push notification routes (Firebase FCM)
func SetupNotificationRoutes(router *gin.RouterGroup, notificationHandler *handlers.NotificationHandler, authMiddleware *middleware.AuthMiddleware) {
	notifications := router.Group("/notifications")
	{
		// Protected routes - require authentication
		notifications.Use(authMiddleware.RequireAuth())

		// User notification management
		notifications.GET("", notificationHandler.GetUserNotifications)              // Get user's notifications
		notifications.POST("/mark-read", notificationHandler.MarkNotificationsAsRead) // Mark notifications as read
		notifications.GET("/stats", notificationHandler.GetNotificationStats)        // Get notification statistics

		// User notification preferences
		notifications.GET("/preferences", notificationHandler.GetNotificationPreferences)       // Get preferences
		notifications.PUT("/preferences", notificationHandler.UpdateNotificationPreferences)   // Update preferences

		// Device management for push notifications
		devices := notifications.Group("/devices")
		{
			devices.POST("/register", notificationHandler.RegisterDevice)                         // Register device for FCM
			devices.GET("", notificationHandler.GetUserDevices)                                   // Get user's devices
			devices.PUT("/:deviceUuid/token", notificationHandler.UpdateDeviceToken)              // Update FCM token
			devices.DELETE("/:deviceUuid", notificationHandler.DeregisterDevice)                 // Deregister device
		}

		// Test endpoint
		notifications.POST("/test", notificationHandler.TestPushNotification) // Test push notification

		// Admin-only routes
		admin := notifications.Group("/admin")
		admin.Use(authMiddleware.RequireAdmin())
		{
			// Send push notifications
			admin.POST("/send", notificationHandler.SendPushNotification) // Send push notification
		}
	}
}