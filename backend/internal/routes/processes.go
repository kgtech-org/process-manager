package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/kodesonik/process-manager/internal/middleware"
)

// SetupProcessRoutes configures process management routes
func SetupProcessRoutes(router *gin.RouterGroup, authMiddleware *middleware.AuthMiddleware) {
	processes := router.Group("/processes")
	processes.Use(authMiddleware.RequireAuth()) // All process routes require authentication
	{
		processes.GET("/", func(c *gin.Context) {
			user, _ := middleware.GetCurrentUser(c)
			c.JSON(200, gin.H{
				"message": "Processes service ready",
				"user":    user.Email,
				"data":    []interface{}{},
			})
		})
	}
}
