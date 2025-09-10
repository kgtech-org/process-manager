package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/kodesonik/process-manager/internal/handlers"
	"github.com/kodesonik/process-manager/internal/middleware"
)

// SetupDepartmentRoutes configures department management routes
func SetupDepartmentRoutes(router *gin.RouterGroup, departmentHandler *handlers.DepartmentHandler, authMiddleware *middleware.AuthMiddleware) {
	departments := router.Group("/departments")
	{
		// Public read access (for forms, dropdowns, etc.)
		departments.GET("/", departmentHandler.GetDepartments)             // List all departments
		departments.GET("/:id", departmentHandler.GetDepartment)           // Get specific department

		// Manager-level operations - require manager or admin role
		managerOps := departments.Group("").Use(authMiddleware.RequireManager())
		{
			managerOps.POST("/", departmentHandler.CreateDepartment)       // Create new department
			managerOps.PUT("/:id", departmentHandler.UpdateDepartment)     // Update department
		}

		// Admin-only operations - high-risk operations
		adminOps := departments.Group("").Use(authMiddleware.RequireAdmin())
		{
			adminOps.DELETE("/:id", departmentHandler.DeleteDepartment)    // Delete department (admin only)
		}
	}
}