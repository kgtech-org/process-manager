package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/kodesonik/process-manager/internal/handlers"
	"github.com/kodesonik/process-manager/internal/middleware"
)

// SetupMacroRoutes configures macro management routes
func SetupMacroRoutes(router *gin.RouterGroup, macroHandler *handlers.MacroHandler, authMiddleware *middleware.AuthMiddleware) {
	macros := router.Group("/macros")
	{
		// Public read access (authenticated users can view macros)
		macros.Use(authMiddleware.RequireAuth())
		macros.GET("/", macroHandler.GetMacros)                   // List all macros with pagination
		macros.GET("/:id", macroHandler.GetMacro)                 // Get specific macro
		macros.GET("/:id/processes", macroHandler.GetMacroProcesses) // Get processes in macro

		// Manager-level operations - require manager or admin role
		managerOps := macros.Group("").Use(authMiddleware.RequireManager())
		{
			managerOps.POST("/", macroHandler.CreateMacro)        // Create new macro
			managerOps.PUT("/:id", macroHandler.UpdateMacro)      // Update macro
		}

		// Admin-only operations - high-risk operations
		adminOps := macros.Group("").Use(authMiddleware.RequireAdmin())
		{
			adminOps.DELETE("/:id", macroHandler.DeleteMacro)     // Delete macro (admin only)
		}
	}
}
