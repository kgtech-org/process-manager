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

		// Protected routes - require authentication
		protected := departments.Group("").Use(authMiddleware.RequireAuth())
		{
			protected.POST("/", departmentHandler.CreateDepartment)        // Create new department
			protected.PUT("/:id", departmentHandler.UpdateDepartment)      // Update department
			protected.DELETE("/:id", departmentHandler.DeleteDepartment)   // Delete department
		}
	}
}