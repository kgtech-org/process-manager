package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/kodesonik/process-manager/internal/handlers"
	"github.com/kodesonik/process-manager/internal/i18n"
	"github.com/kodesonik/process-manager/internal/middleware"
	"github.com/kodesonik/process-manager/internal/models"
	"github.com/kodesonik/process-manager/internal/routes"
	"github.com/kodesonik/process-manager/internal/services"
	"go.mongodb.org/mongo-driver/bson/primitive"
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

	// Initialize i18n
	if err := i18n.Initialize(); err != nil {
		log.Printf("Failed to initialize i18n: %v", err)
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

	// Seed initial data if needed
	seedData()

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

	// Initialize MinIO service
	minioService, err := services.InitMinIOService()
	if err != nil {
		log.Fatalf("Failed to initialize MinIO: %v", err)
	}

	// Initialize services
	jwtService := services.NewJWTService()
	userService := services.InitUserService(db)
	emailService := services.NewEmailService()
	otpService := services.NewOTPService(redisService.Client)
	pinService := services.NewPinService(db.Database)
	activityLogService := services.InitActivityLogService(db)

	// Initialize Firebase service
	firebaseService, err := services.NewFirebaseService()
	if err != nil {
		log.Printf("⚠️  Warning: Failed to initialize Firebase service: %v", err)
		log.Printf("⚠️  Push notification features will be disabled")
		firebaseService = nil
	}

	// Initialize device and notification services
	deviceService := services.NewDeviceService(db, firebaseService)
	notificationService := services.NewNotificationService(db, firebaseService, deviceService, userService)

	// Initialize OpenAI service
	openaiService, err := services.NewOpenAIService()
	if err != nil {
		log.Printf("⚠️  Warning: Failed to initialize OpenAI service: %v", err)
		log.Printf("⚠️  OpenAI chatbot features will be disabled")
		openaiService = nil
	}

	// Initialize PDF service
	pdfService := services.NewPDFService(minioService, openaiService)

	// Initialize Documentation service
	documentationService := services.NewDocumentationService(db, minioService, openaiService)

	// Initialize macro service
	macroService := services.NewMacroService(db, pdfService, documentationService)

	// Initialize document service (depends on macroService)
	documentService := services.NewDocumentService(db.Database, userService, pdfService, macroService, documentationService)

	// Initialize chat service
	var chatService *services.ChatService
	if openaiService != nil {
		chatService = services.NewChatService(db.Database, openaiService)
	}

	// Ensure default admin exists
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	if err := userService.EnsureDefaultAdmin(ctx); err != nil {
		log.Printf("⚠️  Warning: Failed to ensure default admin exists: %v", err)
	}
	cancel()

	// Initialize middleware
	authMiddleware := middleware.NewAuthMiddleware(jwtService, userService)
	activityLogMiddleware := middleware.NewActivityLogMiddleware(activityLogService)
	documentMiddleware := middleware.NewDocumentMiddleware(db.Database)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(userService, jwtService, emailService, otpService, minioService, pinService)
	userHandler := handlers.NewUserHandler(userService, emailService)
	departmentHandler := handlers.NewDepartmentHandler(db)
	jobPositionHandler := handlers.NewJobPositionHandler(db)
	activityLogHandler := handlers.NewActivityLogHandler(activityLogService)
	emailHandler := handlers.NewEmailHandler(emailService, userService)
	notificationHandler := handlers.NewNotificationHandler(userService, notificationService, deviceService)
	documentHandler := handlers.NewDocumentHandler(documentService, activityLogService, minioService, notificationService)
	invitationHandler := handlers.NewInvitationHandler(db.Database, emailService, notificationService, activityLogService)
	permissionHandler := handlers.NewPermissionHandler(db.Database)
	signatureHandler := handlers.NewSignatureHandler(db.Database)
	userSignatureHandler := handlers.NewUserSignatureHandler(db.Database)
	macroHandler := handlers.NewMacroHandler(macroService)

	// Initialize chat handler (only if OpenAI service is available)
	var chatHandler *handlers.ChatHandler
	if chatService != nil {
		chatHandler = handlers.NewChatHandler(chatService)
	}

	// Initialize Gin router
	r := gin.Default()

	// CORS configuration
	corsConfig := cors.DefaultConfig()
	if envOrigins := os.Getenv("CORS_ORIGINS"); envOrigins != "" {
		corsConfig.AllowOrigins = strings.Split(envOrigins, ",")
	} else {
		corsConfig.AllowOrigins = []string{"http://localhost:3000", "https://localhost:3000", "http://localhost", "https://localhost"}
	}
	corsConfig.AllowCredentials = true
	corsConfig.AllowHeaders = []string{"Origin", "Content-Length", "Content-Type", "Authorization", "Accept-Language", "X-Language"}
	corsConfig.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	r.Use(cors.New(corsConfig))

	// i18n middleware
	r.Use(i18n.Middleware())

	// Global middleware for activity logging
	r.Use(activityLogMiddleware.LogActivity())

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

		minioHealthy := true
		if err := minioService.Health(ctx); err != nil {
			minioHealthy = false
		}

		status := "healthy"
		if !dbHealthy || !redisHealthy || !minioHealthy {
			status = "degraded"
		}

		c.JSON(200, gin.H{
			"status":    status,
			"service":   "process-manager-backend",
			"version":   "1.0.0",
			"database":  dbHealthy,
			"redis":     redisHealthy,
			"minio":     minioHealthy,
			"timestamp": time.Now().Unix(),
		})
	})

	// API routes group
	api := r.Group("/api")
	{
		// Setup organized routes
		routes.SetupAuthRoutes(api, authHandler, authMiddleware)
		routes.SetupUserRoutes(api, userHandler, authMiddleware)
		routes.SetupDepartmentRoutes(api, departmentHandler, authMiddleware)
		routes.SetupJobPositionRoutes(api, jobPositionHandler, authMiddleware)
		routes.SetupActivityLogRoutes(api, activityLogHandler, authMiddleware)
		routes.SetupEmailRoutes(api, emailHandler, authMiddleware)
		routes.SetupNotificationRoutes(api, notificationHandler, authMiddleware)
		routes.SetupDocumentRoutes(api, documentHandler, permissionHandler, signatureHandler, authMiddleware, documentMiddleware)
		routes.RegisterInvitationRoutes(api, invitationHandler, authMiddleware)
		routes.SetupUserSignatureRoutes(api, userSignatureHandler, authMiddleware)
		routes.SetupMacroRoutes(api, macroHandler, authMiddleware)

		// Setup chat routes (only if OpenAI service is available)
		if chatHandler != nil {
			routes.SetupChatRoutes(api, chatHandler, authMiddleware)
		}

		// Setup documentation routes
		documentationHandler := handlers.NewDocumentationHandler(documentationService)
		routes.SetupDocumentationRoutes(api, documentationHandler, authMiddleware)
	}

	// Get port from environment or default to 8080
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("🚀 Process Manager Backend starting on port %s", port)
	log.Printf("📊 Health check available at: http://localhost:%s/health", port)
	log.Printf("🔐 Authentication API available at: http://localhost:%s/api/auth", port)
	log.Printf("📝 Activity logs API available at: http://localhost:%s/api/activity-logs", port)
	log.Fatal(r.Run(":" + port))
}

func seedData() {
	log.Println("🌱 Starting data seeding...")
	// Initialize database
	db, err := services.InitDatabase()
	if err != nil {
		log.Printf("Failed to initialize database for seeding: %v", err)
		return
	}

	ctx := context.Background()

	// Seed departments
	if err := seedDepartments(ctx, db); err != nil {
		log.Printf("Failed to seed departments: %v", err)
	}

	// Seed job positions
	if err := seedJobPositions(ctx, db); err != nil {
		log.Printf("Failed to seed job positions: %v", err)
	}

	// Seed macros
	macroService := services.NewMacroService(db, nil, nil)
	seedFilePath := "resources/macros_seed.json"
	if err := macroService.InitializeMacros(ctx, seedFilePath); err != nil {
		log.Printf("Failed to seed macros: %v", err)
	}

	// Seed test user
	if err := seedTestUser(ctx, services.InitUserService(db), services.NewPinService(db.Database)); err != nil {
		log.Printf("Failed to seed test user: %v", err)
	}

	log.Println("🏁 Finished data seeding")
}

func seedDepartments(ctx context.Context, db *services.DatabaseService) error {
	collection := db.Collection("departments")

	// Check if departments already exist
	count, err := collection.CountDocuments(ctx, primitive.M{})
	if err != nil {
		return err
	}

	if count > 0 {
		log.Println("Departments already exist, skipping seed")
		return nil
	}

	departments := []models.Department{
		{
			ID:          primitive.NewObjectID(),
			Name:        "Information Technology",
			Code:        "IT",
			Description: "Manages technology infrastructure and development",
			Active:      true,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			ID:          primitive.NewObjectID(),
			Name:        "Human Resources",
			Code:        "HR",
			Description: "Manages human resources and employee relations",
			Active:      true,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			ID:          primitive.NewObjectID(),
			Name:        "Network Operations",
			Code:        "NOC",
			Description: "Manages network infrastructure and operations",
			Active:      true,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			ID:          primitive.NewObjectID(),
			Name:        "Customer Service",
			Code:        "CS",
			Description: "Handles customer support and relations",
			Active:      true,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			ID:          primitive.NewObjectID(),
			Name:        "Finance",
			Code:        "FIN",
			Description: "Manages financial operations and accounting",
			Active:      true,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			ID:          primitive.NewObjectID(),
			Name:        "Operations",
			Code:        "OPS",
			Description: "Manages daily operations and logistics",
			Active:      true,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
	}

	// Convert to interfaces for insertion
	docs := make([]interface{}, len(departments))
	for i, dept := range departments {
		docs[i] = dept
	}

	_, err = collection.InsertMany(ctx, docs)
	return err
}

func seedJobPositions(ctx context.Context, db *services.DatabaseService) error {
	collection := db.Collection("job_positions")

	// Check if job positions already exist
	count, err := collection.CountDocuments(ctx, primitive.M{})
	if err != nil {
		return err
	}

	if count > 0 {
		log.Println("Job positions already exist, skipping seed")
		return nil
	}

	// Get department IDs first
	deptCollection := db.Collection("departments")
	cursor, err := deptCollection.Find(ctx, primitive.M{})
	if err != nil {
		return err
	}

	var departments []models.Department
	if err = cursor.All(ctx, &departments); err != nil {
		return err
	}

	// Create a map for easy lookup
	deptMap := make(map[string]primitive.ObjectID)
	for _, dept := range departments {
		deptMap[dept.Code] = dept.ID
	}

	jobPositions := []models.JobPosition{
		// IT Department
		{
			ID:             primitive.NewObjectID(),
			Title:          "Software Developer",
			DepartmentID:   deptMap["IT"],
			Level:          models.LevelSenior,
			RequiredSkills: []string{"Go", "JavaScript", "MongoDB", "Docker"},
			Active:         true,
			CreatedAt:      time.Now(),
			UpdatedAt:      time.Now(),
		},
		{
			ID:             primitive.NewObjectID(),
			Title:          "DevOps Engineer",
			DepartmentID:   deptMap["IT"],
			Level:          models.LevelSenior,
			RequiredSkills: []string{"Docker", "Kubernetes", "AWS", "CI/CD"},
			Active:         true,
			CreatedAt:      time.Now(),
			UpdatedAt:      time.Now(),
		},
		{
			ID:             primitive.NewObjectID(),
			Title:          "System Administrator",
			DepartmentID:   deptMap["IT"],
			Level:          models.LevelMid,
			RequiredSkills: []string{"Linux", "Networking", "Security", "Monitoring"},
			Active:         true,
			CreatedAt:      time.Now(),
			UpdatedAt:      time.Now(),
		},
		// HR Department
		{
			ID:           primitive.NewObjectID(),
			Title:        "HR Manager",
			DepartmentID: deptMap["HR"],
			Level:        models.LevelSenior,
			Active:       true,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		},
		{
			ID:           primitive.NewObjectID(),
			Title:        "HR Specialist",
			DepartmentID: deptMap["HR"],
			Level:        models.LevelMid,
			Active:       true,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		},
		// Network Operations Center
		{
			ID:             primitive.NewObjectID(),
			Title:          "Network Engineer",
			DepartmentID:   deptMap["NOC"],
			Level:          models.LevelSenior,
			RequiredSkills: []string{"CISCO", "Routing", "Switching", "MPLS"},
			Active:         true,
			CreatedAt:      time.Now(),
			UpdatedAt:      time.Now(),
		},
		{
			ID:             primitive.NewObjectID(),
			Title:          "NOC Technician",
			DepartmentID:   deptMap["NOC"],
			Level:          models.LevelJunior,
			RequiredSkills: []string{"Network Monitoring", "Troubleshooting", "Documentation"},
			Active:         true,
			CreatedAt:      time.Now(),
			UpdatedAt:      time.Now(),
		},
		// Customer Service
		{
			ID:           primitive.NewObjectID(),
			Title:        "Customer Service Representative",
			DepartmentID: deptMap["CS"],
			Level:        models.LevelJunior,
			Active:       true,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		},
		{
			ID:           primitive.NewObjectID(),
			Title:        "Customer Service Manager",
			DepartmentID: deptMap["CS"],
			Level:        models.LevelSenior,
			Active:       true,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		},
		// Finance
		{
			ID:           primitive.NewObjectID(),
			Title:        "Financial Analyst",
			DepartmentID: deptMap["FIN"],
			Level:        models.LevelMid,
			Active:       true,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		},
		{
			ID:           primitive.NewObjectID(),
			Title:        "Accountant",
			DepartmentID: deptMap["FIN"],
			Level:        models.LevelMid,
			Active:       true,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		},
		// Operations
		{
			ID:           primitive.NewObjectID(),
			Title:        "Operations Manager",
			DepartmentID: deptMap["OPS"],
			Level:        models.LevelSenior,
			Active:       true,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		},
		{
			ID:           primitive.NewObjectID(),
			Title:        "Operations Coordinator",
			DepartmentID: deptMap["OPS"],
			Level:        models.LevelMid,
			Active:       true,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		},
	}

	// Convert to interfaces for insertion
	docs := make([]interface{}, len(jobPositions))
	for i, pos := range jobPositions {
		docs[i] = pos
	}

	_, err = collection.InsertMany(ctx, docs)
	return err
}

func seedTestUser(ctx context.Context, userService *services.UserService, pinService *services.PinService) error {
	email := "aroamadou1@gmail.com"

	// Check if user exists
	existingUser, err := userService.GetUserByEmail(ctx, email)
	if err == nil && existingUser != nil {
		log.Printf("Test user %s already exists", email)
		return nil
	}

	// Create test user
	user := &models.User{
		Email:     email,
		FirstName: "Amadou",
		LastName:  "Aro",
		Role:      models.RoleAdmin,
		Status:    models.StatusActive,
		Active:    true,
		Verified:  true,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	// Validate before inserting (optional, but good practice)
	if !user.ValidateEmail() {
		return fmt.Errorf("invalid email for test user")
	}

	// Insert user
	// CreateUserRequest matches expected input for userService.CreateUser
	req := &models.CreateUserRequest{
		Email:     user.Email,
		FirstName: user.FirstName,
		LastName:  user.LastName,
		Role:      user.Role,
	}

	result, err := userService.CreateUser(ctx, req)
	if err != nil {
		return fmt.Errorf("failed to create test user: %w", err)
	}

	user = result // Get the created user with ID

	// Set PIN
	if err := pinService.SetPin(ctx, user.ID, "123456"); err != nil {
		return fmt.Errorf("failed to set PIN for test user: %w", err)
	}

	log.Printf("✅ Test user seeded: %s (PIN: 123456)", email)
	return nil
}
