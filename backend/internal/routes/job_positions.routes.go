package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/kodesonik/process-manager/internal/handlers"
	"github.com/kodesonik/process-manager/internal/middleware"
)

// SetupJobPositionRoutes configures job position management routes
func SetupJobPositionRoutes(router *gin.RouterGroup, jobPositionHandler *handlers.JobPositionHandler, authMiddleware *middleware.AuthMiddleware) {
	jobPositions := router.Group("/job-positions")
	{
		// Public read access (for forms, dropdowns, etc.)
		jobPositions.GET("/", jobPositionHandler.GetJobPositions)             // List all job positions
		jobPositions.GET("/:id", jobPositionHandler.GetJobPosition)           // Get specific job position

		// Manager-level operations - require manager or admin role
		managerOps := jobPositions.Group("").Use(authMiddleware.RequireManager())
		{
			managerOps.POST("/", jobPositionHandler.CreateJobPosition)        // Create new job position
			managerOps.PUT("/:id", jobPositionHandler.UpdateJobPosition)      // Update job position
		}

		// Admin-only operations - high-risk operations
		adminOps := jobPositions.Group("").Use(authMiddleware.RequireAdmin())
		{
			adminOps.DELETE("/:id", jobPositionHandler.DeleteJobPosition)     // Delete job position (admin only)
		}
	}
}