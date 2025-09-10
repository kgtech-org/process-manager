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
		// TODO: Implement process handlers
		processes.GET("/", func(c *gin.Context) {
			user, _ := middleware.GetCurrentUser(c)
			c.JSON(200, gin.H{
				"message": "Processes service ready",
				"user":    user.Email,
				"data":    []interface{}{},
			})
		})

		// Placeholder routes for future implementation
		// processes.POST("/", processHandler.CreateProcess)
		// processes.GET("/:id", processHandler.GetProcess)
		// processes.PUT("/:id", processHandler.UpdateProcess)
		// processes.DELETE("/:id", processHandler.DeleteProcess)
		// processes.GET("/:id/execute", processHandler.ExecuteProcess)
		// processes.POST("/:id/bilans", processHandler.UploadMonthlyBilan)
		// processes.GET("/:id/bilans", processHandler.GetProcessBilans)
		// processes.GET("/:id/analytics", processHandler.GetProcessAnalytics)
	}
}
