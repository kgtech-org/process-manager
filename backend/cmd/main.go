package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/kodesonik/process-manager/internal/handlers"
	"github.com/kodesonik/process-manager/internal/middleware"
	"github.com/kodesonik/process-manager/internal/services"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Set Gin mode
	if os.Getenv("GIN_MODE") == "" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Initialize database
	db, err := services.InitDatabase()
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := db.Close(ctx); err != nil {
			log.Printf("Error closing database: %v", err)
		}
	}()

	// Initialize services
	jwtService := services.NewJWTService()
	userService := services.NewUserService(db)
	emailService := services.NewEmailService()

	// Initialize middleware
	authMiddleware := middleware.NewAuthMiddleware(jwtService, userService)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(userService, jwtService, emailService)

	// Initialize Gin router
	r := gin.Default()

	// CORS configuration
	corsConfig := cors.DefaultConfig()
	corsConfig.AllowOrigins = []string{"http://localhost:3000", "https://localhost:3000"}
	corsConfig.AllowCredentials = true
	corsConfig.AllowHeaders = []string{"Origin", "Content-Length", "Content-Type", "Authorization"}
	corsConfig.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	r.Use(cors.New(corsConfig))

	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		// Check database health
		ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
		defer cancel()
		
		dbHealthy := true
		if err := db.Health(ctx); err != nil {
			dbHealthy = false
		}

		status := "healthy"
		if !dbHealthy {
			status = "degraded"
		}

		c.JSON(200, gin.H{
			"status":     status,
			"service":    "process-manager-backend",
			"version":    "1.0.0",
			"database":   dbHealthy,
			"timestamp":  time.Now().Unix(),
		})
	})

	// API routes group
	api := r.Group("/api")
	{
		// Auth routes
		auth := api.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.POST("/logout", authMiddleware.RequireAuth(), authHandler.Logout)
			auth.POST("/refresh", authHandler.RefreshToken)
			auth.POST("/forgot", authHandler.ForgotPassword)
			auth.POST("/reset", authHandler.ResetPassword)
			auth.POST("/verify-email", authHandler.VerifyEmail)
			auth.POST("/resend-verification", authMiddleware.RequireAuth(), authHandler.ResendVerification)
			
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
			auth.PUT("/profile", authMiddleware.RequireAuth(), authHandler.UpdateProfile)
			auth.PUT("/change-password", authMiddleware.RequireAuth(), authHandler.ChangePassword)
			auth.POST("/revoke-all-tokens", authMiddleware.RequireAuth(), authHandler.RevokeAllTokens)

			// Legacy status endpoint for backward compatibility
			auth.GET("/status", authMiddleware.OptionalAuth(), func(c *gin.Context) {
				user, exists := middleware.GetCurrentUser(c)
				if exists {
					c.JSON(200, gin.H{
						"message":       "Authentication service ready",
						"authenticated": true,
						"user":          gin.H{
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

		// Admin routes
		admin := api.Group("/admin")
		admin.Use(authMiddleware.RequireAdmin())
		{
			admin.GET("/users", func(c *gin.Context) {
				c.JSON(200, gin.H{
					"message": "Admin users endpoint - not implemented yet",
				})
			})
		}

		// Documents routes (placeholder - protected)
		documents := api.Group("/documents")
		documents.Use(authMiddleware.RequireAuth())
		{
			documents.GET("/", func(c *gin.Context) {
				user, _ := middleware.GetCurrentUser(c)
				c.JSON(200, gin.H{
					"message": "Documents service ready",
					"user":    user.Email,
					"data":    []interface{}{},
				})
			})
		}

		// Processes routes (placeholder - protected)
		processes := api.Group("/processes")
		processes.Use(authMiddleware.RequireAuth())
		{
			processes.GET("/", func(c *gin.Context) {
				user, _ := middleware.GetCurrentUser(c)
				c.JSON(200, gin.H{
					"message": "Processes service ready",
					"user":    user.Email,
					"data":    []interface{}{},
				})
			})
		}
	}

	// Get port from environment or default to 8080
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("🚀 Process Manager Backend starting on port %s", port)
	log.Printf("📊 Health check available at: http://localhost:%s/health", port)
	log.Printf("🔐 Authentication API available at: http://localhost:%s/api/auth", port)
	log.Fatal(r.Run(":" + port))
}