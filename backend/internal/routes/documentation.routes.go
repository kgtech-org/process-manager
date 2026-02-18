package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/kodesonik/process-manager/internal/handlers"
	"github.com/kodesonik/process-manager/internal/middleware"
)

func SetupDocumentationRoutes(r *gin.RouterGroup, handler *handlers.DocumentationHandler, authMiddleware *middleware.AuthMiddleware) {
	docs := r.Group("/documentation")
	{
		// Public route to get documentation URL
		docs.GET("/public-url", handler.GetPublicDocumentationURL)

		// Protected route to trigger update manually (Admin only)
		docs.POST("/trigger-update", authMiddleware.RequireAuth(), authMiddleware.RequireAdmin(), handler.TriggerUpdate)
	}
}
