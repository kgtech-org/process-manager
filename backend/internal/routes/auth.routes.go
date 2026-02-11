package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/kodesonik/process-manager/internal/handlers"
	"github.com/kodesonik/process-manager/internal/middleware"
)

// SetupAuthRoutes configures authentication routes
func SetupAuthRoutes(router *gin.RouterGroup, authHandler *handlers.AuthHandler, authMiddleware *middleware.AuthMiddleware) {
	auth := router.Group("/auth")
	{
		// Public routes
		// 3-Step Registration Process
		auth.POST("/register/step1", authHandler.RegisterStep1) // Send email, get OTP
		auth.POST("/register/step2", authHandler.RegisterStep2) // Verify OTP, get registration token
		auth.POST("/register/step3", authHandler.RegisterStep3) // Complete registration with profile info

		// Authentication
		auth.POST("/request-otp", authHandler.RequestOTP)
		auth.POST("/verify-otp", authHandler.VerifyOTP)
		auth.POST("/refresh", authHandler.RefreshToken)

		// Protected routes
		auth.GET("/me", authMiddleware.RequireAuth(), authHandler.GetMe)
		auth.POST("/logout", authMiddleware.RequireAuth(), authHandler.Logout)
		auth.PUT("/profile", authMiddleware.RequireAuth(), authHandler.UpdateProfile)
		auth.POST("/revoke-all-tokens", authMiddleware.RequireAuth(), authHandler.RevokeAllTokens)

		// Avatar management
		auth.POST("/avatar", authMiddleware.RequireAuth(), authHandler.UploadAvatar)
		auth.DELETE("/avatar", authMiddleware.RequireAuth(), authHandler.DeleteAvatar)

		// PIN Authentication
		auth.POST("/login-pin", authHandler.LoginWithPin) // Public login with PIN

		auth.POST("/pin", authMiddleware.RequireAuth(), authHandler.SetPin)
		auth.GET("/pin/status", authMiddleware.RequireAuth(), authHandler.CheckPinStatus)
		auth.POST("/pin/verify", authMiddleware.RequireAuth(), authHandler.VerifyPin)

		// Status endpoint for authentication verification
		auth.GET("/status", authMiddleware.OptionalAuth(), func(c *gin.Context) {
			user, exists := middleware.GetCurrentUser(c)
			if exists {
				c.JSON(200, gin.H{
					"message":       "Authentication service ready",
					"authenticated": true,
					"user": gin.H{
						"id":    user.ID,
						"email": user.Email,
						"name":  user.FirstName + " " + user.LastName,
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
