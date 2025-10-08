package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/kodesonik/process-manager/internal/handlers"
	"github.com/kodesonik/process-manager/internal/middleware"
)

// SetupDocumentRoutes configures document routes
func SetupDocumentRoutes(router *gin.RouterGroup, documentHandler *handlers.DocumentHandler, authMiddleware *middleware.AuthMiddleware) {
	documents := router.Group("/documents")
	documents.Use(authMiddleware.RequireAuth())
	{
		// List and create documents
		documents.GET("", documentHandler.ListDocuments)
		documents.POST("", documentHandler.CreateDocument)

		// Document operations
		documents.GET("/:id", documentHandler.GetDocument)
		documents.PUT("/:id", documentHandler.UpdateDocument)
		documents.DELETE("/:id", authMiddleware.RequireManager(), documentHandler.DeleteDocument)

		// Document actions
		documents.POST("/:id/duplicate", documentHandler.DuplicateDocument)
		documents.GET("/:id/versions", documentHandler.GetDocumentVersions)
	}
}
