package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/kodesonik/process-manager/internal/handlers"
	"github.com/kodesonik/process-manager/internal/middleware"
)

// SetupDomainRoutes configures domain management routes
func SetupDomainRoutes(router *gin.RouterGroup, domainHandler *handlers.DomainHandler, authMiddleware *middleware.AuthMiddleware) {
	domains := router.Group("/domains")
	{
		// Public read access (for forms, dropdowns, etc.)
		domains.GET("/", domainHandler.GetDomains)   // List all domains
		domains.GET("/:id", domainHandler.GetDomain) // Get specific domain

		// Manager-level operations
		managerOps := domains.Group("").Use(authMiddleware.RequireManager())
		{
			managerOps.POST("/", domainHandler.CreateDomain)   // Create new domain
			managerOps.PUT("/:id", domainHandler.UpdateDomain) // Update domain
		}

		// Admin-only operations
		adminOps := domains.Group("").Use(authMiddleware.RequireAdmin())
		{
			adminOps.DELETE("/:id", domainHandler.DeleteDomain) // Delete domain (admin only)
		}
	}
}
