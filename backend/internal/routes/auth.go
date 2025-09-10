package routes

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kodesonik/process-manager/internal/handlers"
	"github.com/kodesonik/process-manager/internal/middleware"
)

// SetupAuthRoutes configures authentication routes
func SetupAuthRoutes(router *gin.RouterGroup, authHandler *handlers.AuthHandler, authMiddleware *middleware.AuthMiddleware) {
	auth := router.Group("/auth")
	{
		// Public routes
		auth.POST("/register", authHandler.Register)
		auth.POST("/request-otp", authHandler.RequestOTP)
		auth.POST("/verify-otp", authHandler.VerifyOTP)
		auth.POST("/refresh", authHandler.RefreshToken)
		auth.POST("/verify-email", authHandler.VerifyEmail)

		// Protected routes
		auth.GET("/me", authMiddleware.RequireAuth(), func(c *gin.Context) {
			user, exists := middleware.GetCurrentUser(c)
			if !exists {
				c.JSON(http.StatusInternalServerError, gin.H{
					"success": false,
					"error":   "User not found in context",
				})
				return
			}

			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"user":    user.ToResponse(),
			})
		})
		auth.POST("/logout", authMiddleware.RequireAuth(), authHandler.Logout)
		auth.PUT("/profile", authMiddleware.RequireAuth(), authHandler.UpdateProfile)
		auth.POST("/revoke-all-tokens", authMiddleware.RequireAuth(), authHandler.RevokeAllTokens)
		auth.POST("/resend-verification", authMiddleware.RequireAuth(), authHandler.ResendVerification)

		// Legacy status endpoint for backward compatibility
		auth.GET("/status", authMiddleware.OptionalAuth(), func(c *gin.Context) {
			user, exists := middleware.GetCurrentUser(c)
			if exists {
				c.JSON(200, gin.H{
					"message":       "Authentication service ready",
					"authenticated": true,
					"user": gin.H{
						"id":    user.ID,
						"email": user.Email,
						"name":  user.Name,
						"role":  user.Role,
					},
				})
			} else {
				c.JSON(200, gin.H{
					"message":       "Authentication service ready",
					"authenticated": false,
				})
			}
		})
	}
}
