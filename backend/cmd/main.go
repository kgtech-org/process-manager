package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
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

	// Initialize Gin router
	r := gin.Default()

	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "healthy",
			"service": "process-manager-backend",
			"version": "1.0.0",
		})
	})

	// API routes group
	api := r.Group("/api")
	{
		// Auth routes (placeholder)
		auth := api.Group("/auth")
		{
			auth.GET("/status", func(c *gin.Context) {
				c.JSON(200, gin.H{
					"message": "Authentication service ready",
				})
			})
		}

		// Documents routes (placeholder)
		documents := api.Group("/documents")
		{
			documents.GET("/", func(c *gin.Context) {
				c.JSON(200, gin.H{
					"message": "Documents service ready",
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
	log.Fatal(r.Run(":" + port))
}