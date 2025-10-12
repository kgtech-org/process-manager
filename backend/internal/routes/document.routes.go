package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/kodesonik/process-manager/internal/handlers"
	"github.com/kodesonik/process-manager/internal/middleware"
)

// SetupDocumentRoutes configures document routes
func SetupDocumentRoutes(
	router *gin.RouterGroup,
	documentHandler *handlers.DocumentHandler,
	permissionHandler *handlers.PermissionHandler,
	signatureHandler *handlers.SignatureHandler,
	authMiddleware *middleware.AuthMiddleware,
	documentMiddleware *middleware.DocumentMiddleware,
) {
	documents := router.Group("/documents")
	documents.Use(authMiddleware.RequireAuth())
	{
		// List and create documents (no document-specific permission check needed)
		documents.GET("", documentHandler.ListDocuments)
		documents.POST("", documentHandler.CreateDocument)

		// Document operations (require document access)
		documents.GET("/:id", documentMiddleware.RequireDocumentAccess(), documentHandler.GetDocument)
		documents.PUT("/:id", documentMiddleware.RequireDocumentAccess(), documentHandler.UpdateDocument)
		documents.DELETE("/:id", authMiddleware.RequireManager(), documentMiddleware.RequireDocumentAccess(), documentHandler.DeleteDocument)

		// Document actions (require document access)
		documents.POST("/:id/duplicate", documentMiddleware.RequireDocumentAccess(), documentHandler.DuplicateDocument)
		documents.POST("/:id/publish", documentMiddleware.RequireDocumentAccess(), documentHandler.PublishDocument)
		documents.GET("/:id/versions", documentMiddleware.RequireDocumentAccess(), documentHandler.GetDocumentVersions)

		// Permissions (require document access)
		documents.GET("/:id/permissions", documentMiddleware.RequireDocumentAccess(), permissionHandler.GetDocumentPermissions)
		documents.POST("/:id/permissions", documentMiddleware.RequireDocumentAccess(), permissionHandler.AddDocumentPermission)
		documents.PUT("/:id/permissions/:userId", documentMiddleware.RequireDocumentAccess(), permissionHandler.UpdateDocumentPermission)
		documents.DELETE("/:id/permissions/:userId", documentMiddleware.RequireDocumentAccess(), permissionHandler.DeleteDocumentPermission)

		// Signatures (require document access)
		documents.GET("/:id/signatures", documentMiddleware.RequireDocumentAccess(), signatureHandler.GetDocumentSignatures)
		documents.POST("/:id/signatures", documentMiddleware.RequireDocumentAccess(), signatureHandler.AddDocumentSignature)
	}
}
