package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/kodesonik/process-manager/internal/middleware"
)

// SetupDocumentRoutes configures document management routes
func SetupDocumentRoutes(router *gin.RouterGroup, authMiddleware *middleware.AuthMiddleware) {
	documents := router.Group("/documents")
	{
		// Read access for authenticated users
		documents.GET("/", authMiddleware.RequireAuth(), func(c *gin.Context) {
			user, _ := middleware.GetCurrentUser(c)
			c.JSON(200, gin.H{
				"message": "Documents service ready",
				"user":    user.Email,
				"data":    []interface{}{},
			})
		})

		// Future: Manager-level operations will go here
		// managerOps := documents.Group("").Use(authMiddleware.RequireManager())
		// {
		//     managerOps.POST("/", documentHandler.CreateDocument)
		//     managerOps.PUT("/:id", documentHandler.UpdateDocument)
		// }

		// Future: Admin-only operations will go here
		// adminOps := documents.Group("").Use(authMiddleware.RequireAdmin())
		// {
		//     adminOps.DELETE("/:id", documentHandler.DeleteDocument)
		//     adminOps.PUT("/:id/publish", documentHandler.PublishDocument)
		// }
	}
}
