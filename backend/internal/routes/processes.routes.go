package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/kodesonik/process-manager/internal/middleware"
)

// SetupProcessRoutes configures process management routes
func SetupProcessRoutes(router *gin.RouterGroup, authMiddleware *middleware.AuthMiddleware) {
	processes := router.Group("/processes")
	{
		// Read access for authenticated users
		processes.GET("/", authMiddleware.RequireAuth(), func(c *gin.Context) {
			user, _ := middleware.GetCurrentUser(c)
			c.JSON(200, gin.H{
				"message": "Processes service ready",
				"user":    user.Email,
				"data":    []interface{}{},
			})
		})

		// Future: Manager-level operations will go here
		// managerOps := processes.Group("").Use(authMiddleware.RequireManager())
		// {
		//     managerOps.POST("/", processHandler.CreateProcess)
		//     managerOps.PUT("/:id", processHandler.UpdateProcess)
		// }

		// Future: Admin-only operations will go here  
		// adminOps := processes.Group("").Use(authMiddleware.RequireAdmin())
		// {
		//     adminOps.DELETE("/:id", processHandler.DeleteProcess)
		//     adminOps.PUT("/:id/approve", processHandler.ApproveProcess)
		// }
	}
}
