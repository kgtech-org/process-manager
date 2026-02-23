package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/kodesonik/process-manager/internal/handlers"
	"github.com/kodesonik/process-manager/internal/middleware"
)

// SetupFeedbackRoutes initializes feedback related routes
func SetupFeedbackRoutes(r *gin.RouterGroup, handler *handlers.FeedbackHandler, auth *middleware.AuthMiddleware) {
	// Protected basic feedback routes (Authenticated Users)
	feedback := r.Group("/feedback")
	feedback.Use(auth.RequireAuth())
	{
		feedback.POST("", handler.SubmitFeedback)
		feedback.GET("/:id", handler.GetFeedbackByID)
	}

	// Template routes (Managers + Admins)
	templates := r.Group("/feedback/templates")
	templates.Use(auth.RequireAuth(), auth.RequireManager())
	{
		templates.POST("", handler.CreateTemplate)
		templates.PUT("/:id", handler.UpdateTemplate)
		templates.DELETE("/:id", handler.DeleteTemplate)
	}
	// Publicly authenticated can view templates to fill forms
	templatesAuth := r.Group("/feedback/templates")
	templatesAuth.Use(auth.RequireAuth())
	{
		templatesAuth.GET("", handler.GetTemplates)
		templatesAuth.GET("/:id", handler.GetTemplateByID)
	}

	// Admin feedback management (View all feedback and update status)
	adminFeedback := r.Group("/feedback")
	adminFeedback.Use(auth.RequireAuth(), auth.RequireManager())
	{
		adminFeedback.GET("", handler.GetAllFeedback)
		adminFeedback.PATCH("/:id/status", handler.UpdateFeedbackStatus)
	}

	// Process specific feedback route (must attach to processes router conceptually, mapped here)
	processFeedback := r.Group("/processes")
	processFeedback.Use(auth.RequireAuth())
	{
		// Should require manager or admin to see all feedback for a process
		processFeedback.GET("/:id/feedback", auth.RequireManager(), handler.GetFeedbackForProcess)
	}
}
