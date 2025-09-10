package main

import (
	"context"
	"log"
	"os"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/kodesonik/process-manager/internal/handlers"
	"github.com/kodesonik/process-manager/internal/middleware"
	"github.com/kodesonik/process-manager/internal/routes"
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

	// Initialize Redis
	redisService, err := services.NewRedisService()
	if err != nil {
		log.Fatalf("Failed to initialize Redis: %v", err)
	}
	defer func() {
		if err := redisService.Close(); err != nil {
			log.Printf("Error closing Redis: %v", err)
		}
	}()

	// Initialize services
	jwtService := services.NewJWTService()
	userService := services.NewUserService(db)
	emailService := services.NewEmailService()
	otpService := services.NewOTPService(redisService.Client)

	// Ensure default admin exists
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	if err := userService.EnsureDefaultAdmin(ctx); err != nil {
		log.Printf("⚠️  Warning: Failed to ensure default admin exists: %v", err)
	}
	cancel()

	// Initialize middleware
	authMiddleware := middleware.NewAuthMiddleware(jwtService, userService)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(userService, jwtService, emailService, otpService)
	userHandler := handlers.NewUserHandler(userService, emailService)

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
		// Check database and Redis health
		ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
		defer cancel()

		dbHealthy := true
		if err := db.Health(ctx); err != nil {
			dbHealthy = false
		}

		redisHealthy := true
		if err := redisService.Health(ctx); err != nil {
			redisHealthy = false
		}

		status := "healthy"
		if !dbHealthy || !redisHealthy {
			status = "degraded"
		}

		c.JSON(200, gin.H{
			"status":    status,
			"service":   "process-manager-backend",
			"version":   "1.0.0",
			"database":  dbHealthy,
			"redis":     redisHealthy,
			"timestamp": time.Now().Unix(),
		})
	})

	// API routes group
	api := r.Group("/api")
	{
		// Setup organized routes
		routes.SetupAuthRoutes(api, authHandler, authMiddleware)
		routes.SetupUserRoutes(api, userHandler, authMiddleware)
		routes.SetupDocumentRoutes(api, authMiddleware)
		routes.SetupProcessRoutes(api, authMiddleware)
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
