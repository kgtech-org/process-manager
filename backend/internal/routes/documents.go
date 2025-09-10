package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/kodesonik/process-manager/internal/middleware"
)

// SetupDocumentRoutes configures document management routes
func SetupDocumentRoutes(router *gin.RouterGroup, authMiddleware *middleware.AuthMiddleware) {
	documents := router.Group("/documents")
	documents.Use(authMiddleware.RequireAuth()) // All document routes require authentication
	{
		documents.GET("/", func(c *gin.Context) {
			user, _ := middleware.GetCurrentUser(c)
			c.JSON(200, gin.H{
				"message": "Documents service ready",
				"user":    user.Email,
				"data":    []interface{}{},
			})
		})
	}
}
