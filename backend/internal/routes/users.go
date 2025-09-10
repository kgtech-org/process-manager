package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/kodesonik/process-manager/internal/handlers"
	"github.com/kodesonik/process-manager/internal/middleware"
)

// SetupUserRoutes configures user management routes (admin-only)
func SetupUserRoutes(router *gin.RouterGroup, userHandler *handlers.UserHandler, authMiddleware *middleware.AuthMiddleware) {
	users := router.Group("/users")
	users.Use(authMiddleware.RequireAdmin()) // All user management routes require admin role
	{
		users.GET("/", userHandler.GetAllUsers)                  // Get all users with pagination and filters
		users.POST("/", userHandler.CreateUser)                  // Create new user (admin only)
		users.GET("/:id", userHandler.GetUserByID)               // Get user by ID
		users.PUT("/:id", userHandler.UpdateUser)                // Update user (admin only)
		users.DELETE("/:id", userHandler.DeleteUser)             // Soft delete user (admin only)
		users.PUT("/:id/activate", userHandler.ActivateUser)     // Activate user
		users.PUT("/:id/deactivate", userHandler.DeactivateUser) // Deactivate user
		users.PUT("/:id/role", userHandler.UpdateUserRole)       // Update user role
		users.PUT("/:id/validate", userHandler.ValidateUser)     // Validate pending user registration
	}
}
