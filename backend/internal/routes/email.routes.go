package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/kodesonik/process-manager/internal/handlers"
	"github.com/kodesonik/process-manager/internal/middleware"
)

// SetupEmailRoutes configures email-related routes (SMTP)
func SetupEmailRoutes(router *gin.RouterGroup, emailHandler *handlers.EmailHandler, authMiddleware *middleware.AuthMiddleware) {
	emails := router.Group("/emails")
	{
		// Protected routes - require authentication
		emails.Use(authMiddleware.RequireAuth())

		// Test email endpoint (any authenticated user can test their own email)
		emails.POST("/test", emailHandler.SendTestEmail)

		// Admin-only routes
		admin := emails.Group("")
		admin.Use(authMiddleware.RequireAdmin())
		{
			// Send email to specific user
			admin.POST("/send-to-user", emailHandler.SendEmailToUser)

			// Send email to group of users
			admin.POST("/send-to-group", emailHandler.SendEmailToGroup)

			// Broadcast email to all users (with optional filters)
			admin.POST("/broadcast", emailHandler.SendBroadcastEmail)
		}
	}
}