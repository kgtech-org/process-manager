package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/kodesonik/process-manager/internal/handlers"
	"github.com/kodesonik/process-manager/internal/middleware"
)

// SetupActivityLogRoutes configures all activity log routes
func SetupActivityLogRoutes(api *gin.RouterGroup, activityLogHandler *handlers.ActivityLogHandler, authMiddleware *middleware.AuthMiddleware) {
	// Activity logs routes group
	activityLogs := api.Group("/activity-logs")
	{
		// Public routes (none - all activity logs require authentication)

		// Authenticated user routes
		activityLogs.Use(authMiddleware.RequireAuth())
		{
			// Get user's own activity logs
			activityLogs.GET("/me", activityLogHandler.GetMyActivityLogs)

			// Get user's own activity summary
			activityLogs.GET("/me/summary", activityLogHandler.GetMyActivitySummary)
		}

		// Manager and Admin routes
		managerRoutes := activityLogs.Group("")
		managerRoutes.Use(authMiddleware.RequireManager())
		{
			// Get specific user's activity summary (managers can view their department users)
			managerRoutes.GET("/users/:userId/summary", activityLogHandler.GetUserActivitySummary)
		}

		// Admin only routes
		adminRoutes := activityLogs.Group("")
		adminRoutes.Use(authMiddleware.RequireAdmin())
		{
			// Get all activity logs with filters and pagination
			adminRoutes.GET("", activityLogHandler.GetActivityLogs)

			// Get specific activity log by ID
			adminRoutes.GET("/:id", activityLogHandler.GetActivityLogByID)

			// Get activity log statistics
			adminRoutes.GET("/stats", activityLogHandler.GetActivityLogStats)

			// Manually create activity log (for admin purposes)
			adminRoutes.POST("", activityLogHandler.CreateActivityLog)

			// Cleanup old activity logs
			adminRoutes.DELETE("/cleanup", activityLogHandler.DeleteOldActivityLogs)
		}
	}
}