package main

import (
	"context"
	"flag"
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
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func main() {
	cleanFlag := flag.Bool("clean", false, "Clean database before seeding")
	flag.Parse()

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
	seedData(*cleanFlag)

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
	domainHandler := handlers.NewDomainHandler(db)
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
		routes.SetupDomainRoutes(api, domainHandler, authMiddleware)
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

func seedData(clean bool) {
	log.Println("🌱 Starting data seeding...")
	// Initialize database
	db, err := services.InitDatabase()
	if err != nil {
		log.Printf("Failed to initialize database for seeding: %v", err)
		return
	}

	ctx := context.Background()

	if clean {
		log.Println("🧹 Cleaning database as requested...")
		collections := []string{"macros", "documents", "domains", "departments", "job_positions"}
		for _, colName := range collections {
			if err := db.Collection(colName).Drop(ctx); err != nil {
				log.Printf("⚠️  Failed to drop collection %s: %v", colName, err)
			} else {
				log.Printf("✓ Dropped collection %s", colName)
			}
		}
	}

	// Seed domains first (departments depend on them)
	if err := seedDomains(ctx, db); err != nil {
		log.Printf("Failed to seed domains: %v", err)
	}

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
	if err := seedTestUser(ctx, services.InitUserService(db), services.NewPinService(db.Database), db); err != nil {
		log.Printf("Failed to seed test user: %v", err)
	}

	log.Println("🏁 Finished data seeding")
}

func seedDomains(ctx context.Context, db *services.DatabaseService) error {
	collection := db.Collection("domains")

	// Drop existing domains only if NOT clean (because clean already dropped it, but redundancy is fine or we check count)
	// Actually seedDomains calls Drop() anyway in the current implementation.
	// But let's leave it as is, it's fine to drop again or we can remove the Drop from seedDomains?
	// The existing seedDomains implementation DROPS collection.

	// ... rest of functions

	domains := []models.Domain{
		{
			ID:          primitive.NewObjectID(),
			Name:        "Réseau",
			Code:        "NET",
			Description: "Ingénierie, infrastructure, terrain et énergie — conception et maintenance des réseaux fixe, mobile et transport",
			Active:      true,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			ID:          primitive.NewObjectID(),
			Name:        "IT",
			Code:        "IT",
			Description: "Infrastructure IT, opérations, delivery de projets/produits IT et support utilisateurs",
			Active:      true,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			ID:          primitive.NewObjectID(),
			Name:        "Opérations & Performance",
			Code:        "OPS",
			Description: "Supervision du cœur de réseau (NOC/iSOC) et optimisation des performances et qualité de service",
			Active:      true,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			ID:          primitive.NewObjectID(),
			Name:        "Gouvernance & Support",
			Code:        "GOV",
			Description: "Pilotage PMO, gouvernance des projets N&IS et support opérationnel métier",
			Active:      true,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			ID:          primitive.NewObjectID(),
			Name:        "Digital & Data",
			Code:        "DIG",
			Description: "Transformation digitale, automatisation, Big Data, data gouvernance et solutions innovantes",
			Active:      true,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			ID:          primitive.NewObjectID(),
			Name:        "Sécurité",
			Code:        "SEC",
			Description: "Cybersécurité, gestion des vulnérabilités, détection d'intrusions et résilience des SI",
			Active:      true,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			ID:          primitive.NewObjectID(),
			Name:        "Stratégie SI",
			Code:        "STR",
			Description: "Direction stratégique des systèmes d'information et alignement SI/métier",
			Active:      true,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
	}

	docs := make([]interface{}, len(domains))
	for i, d := range domains {
		docs[i] = d
	}

	_, err := collection.InsertMany(ctx, docs)
	if err != nil {
		return err
	}

	log.Printf("✅ Seeded %d domains", len(domains))
	return nil
}

func seedDepartments(ctx context.Context, db *services.DatabaseService) error {
	collection := db.Collection("departments")

	// Drop existing departments for fresh reseed
	if err := collection.Drop(ctx); err != nil {
		return fmt.Errorf("failed to drop departments collection: %w", err)
	}

	// Fetch domain IDs for linking
	domainCollection := db.Collection("domains")
	cursor, err := domainCollection.Find(ctx, primitive.M{})
	if err != nil {
		return err
	}
	var domains []models.Domain
	if err = cursor.All(ctx, &domains); err != nil {
		return err
	}
	domainMap := make(map[string]primitive.ObjectID)
	for _, d := range domains {
		domainMap[d.Code] = d.ID
	}

	// Helper to get domain ID pointer
	domainID := func(code string) *primitive.ObjectID {
		id := domainMap[code]
		return &id
	}

	departments := []models.Department{
		// --- Domain: Réseau (NET) ---
		{
			ID:          primitive.NewObjectID(),
			Name:        "Direction Network Engineering",
			Code:        "DNE",
			Description: "Conception, ingénierie et architecture des réseaux (fixe, mobile, transport, IP/MPLS)",
			Active:      true,
			DomainID:    domainID("NET"),
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			ID:          primitive.NewObjectID(),
			Name:        "Direction Infrastructure",
			Code:        "DINF",
			Description: "Gestion des infrastructures physiques réseau (sites, pylônes, shelters, énergie passive)",
			Active:      true,
			DomainID:    domainID("NET"),
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			ID:          primitive.NewObjectID(),
			Name:        "Direction Field Operations",
			Code:        "DFO",
			Description: "Opérations terrain, déploiement, maintenance préventive et corrective sur sites",
			Active:      true,
			DomainID:    domainID("NET"),
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			ID:          primitive.NewObjectID(),
			Name:        "Direction Field Network",
			Code:        "DFN",
			Description: "Gestion du réseau d'accès terrain (radio, transmission FH/FO, derniers miles)",
			Active:      true,
			DomainID:    domainID("NET"),
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			ID:          primitive.NewObjectID(),
			Name:        "Direction Énergie",
			Code:        "DEN",
			Description: "Gestion de l'alimentation électrique des sites (groupes électrogènes, solaire, batteries, raccordement)",
			Active:      true,
			DomainID:    domainID("NET"),
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		// --- Domain: IT ---
		{
			ID:          primitive.NewObjectID(),
			Name:        "Infrastructure IT",
			Code:        "IIT",
			Description: "Gestion des serveurs, virtualisation, stockage, plateformes IT et environnements cloud",
			Active:      true,
			DomainID:    domainID("IT"),
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			ID:          primitive.NewObjectID(),
			Name:        "IT Operations (iSOC)",
			Code:        "ITO",
			Description: "Exploitation et supervision des systèmes IT, monitoring applicatif et infrastructure IT",
			Active:      true,
			DomainID:    domainID("IT"),
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			ID:          primitive.NewObjectID(),
			Name:        "IT Product & Project Delivery",
			Code:        "IPPD",
			Description: "Livraison de projets et produits IT, développement applicatif et intégration de solutions",
			Active:      true,
			DomainID:    domainID("IT"),
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			ID:          primitive.NewObjectID(),
			Name:        "IT Support & Service Desk",
			Code:        "ITSD",
			Description: "Support utilisateurs N1/N2/N3, gestion des demandes et incidents IT, service desk",
			Active:      true,
			DomainID:    domainID("IT"),
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		// --- Domain: Opérations & Performance (OPS) ---
		{
			ID:          primitive.NewObjectID(),
			Name:        "Direction Core Operations (iSOC)",
			Code:        "DCO",
			Description: "Supervision et exploitation du cœur de réseau, NOC/iSOC, gestion des incidents critiques",
			Active:      true,
			DomainID:    domainID("OPS"),
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			ID:          primitive.NewObjectID(),
			Name:        "Direction Performance & Optimisation",
			Code:        "DPO",
			Description: "Mesure, analyse et optimisation des performances réseau et qualité de service (QoS)",
			Active:      true,
			DomainID:    domainID("OPS"),
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		// --- Domain: Gouvernance & Support (GOV) ---
		{
			ID:          primitive.NewObjectID(),
			Name:        "Direction PMO & Gouvernance",
			Code:        "DPMO",
			Description: "Pilotage des projets N&IS, gouvernance, gestion des risques et amélioration continue",
			Active:      true,
			DomainID:    domainID("GOV"),
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			ID:          primitive.NewObjectID(),
			Name:        "Direction Technical Business Support",
			Code:        "DTBS",
			Description: "Support opérationnel aux activités N&IS (logistique, dotations, coordination RH, support métier)",
			Active:      true,
			DomainID:    domainID("GOV"),
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		// --- Domain: Digital & Data (DIG) ---
		{
			ID:          primitive.NewObjectID(),
			Name:        "Digital & Innovation",
			Code:        "DI",
			Description: "Digitalisation des processus, automatisation, portails et solutions digitales N&IS",
			Active:      true,
			DomainID:    domainID("DIG"),
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			ID:          primitive.NewObjectID(),
			Name:        "Big Data & Data Gouvernance",
			Code:        "BDDG",
			Description: "Collecte, gouvernance, stockage et valorisation des données réseau et SI (Data Lake, DWH, BI, IA)",
			Active:      true,
			DomainID:    domainID("DIG"),
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		// --- Domain: Sécurité (SEC) ---
		{
			ID:          primitive.NewObjectID(),
			Name:        "Cybersécurité / CISO",
			Code:        "CISO",
			Description: "Sécurité des systèmes d'information, gestion des vulnérabilités, détection d'intrusions et résilience",
			Active:      true,
			DomainID:    domainID("SEC"),
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		// --- Domain: Stratégie SI (STR) ---
		{
			ID:          primitive.NewObjectID(),
			Name:        "DSI - Direction des Systèmes d'Information",
			Code:        "DSI",
			Description: "Direction stratégique des systèmes d'information, alignement SI/métier",
			Active:      true,
			DomainID:    domainID("STR"),
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
	}

	docs := make([]interface{}, len(departments))
	for i, dept := range departments {
		docs[i] = dept
	}

	_, err = collection.InsertMany(ctx, docs)
	if err != nil {
		return err
	}

	log.Printf("✅ Seeded %d departments across %d domains", len(departments), len(domains))
	return nil
}

func seedJobPositions(ctx context.Context, db *services.DatabaseService) error {
	collection := db.Collection("job_positions")

	// Drop existing job positions for fresh reseed
	if err := collection.Drop(ctx); err != nil {
		return fmt.Errorf("failed to drop job_positions collection: %w", err)
	}

	// Get department IDs for linking
	deptCollection := db.Collection("departments")
	cursor, err := deptCollection.Find(ctx, primitive.M{})
	if err != nil {
		return err
	}
	var departments []models.Department
	if err = cursor.All(ctx, &departments); err != nil {
		return err
	}
	deptMap := make(map[string]primitive.ObjectID)
	for _, dept := range departments {
		deptMap[dept.Code] = dept.ID
	}

	// Togocom N&IS job positions derived from MACROs.xlsx organizational structure
	jobPositions := []models.JobPosition{
		// --- DNE ---
		{
			ID: primitive.NewObjectID(), Title: "Architecte Réseau", Code: "DNE-ARCH",
			DepartmentID: deptMap["DNE"], Level: models.LevelSenior,
			RequiredSkills: []string{"Architecture Réseau", "TOGAF", "5G", "IP/MPLS", "SDN"},
			Active:         true, CreatedAt: time.Now(), UpdatedAt: time.Now(),
		},
		{
			ID: primitive.NewObjectID(), Title: "Ingénieur Réseau", Code: "DNE-ING",
			DepartmentID: deptMap["DNE"], Level: models.LevelSenior,
			RequiredSkills: []string{"Ingénierie Réseau", "Dimensionnement", "Radio Planning", "Transport"},
			Active:         true, CreatedAt: time.Now(), UpdatedAt: time.Now(),
		},
		// --- DINF ---
		{
			ID: primitive.NewObjectID(), Title: "Responsable Infrastructure", Code: "DINF-RESP",
			DepartmentID: deptMap["DINF"], Level: models.LevelManager,
			RequiredSkills: []string{"Gestion Infrastructure", "Sites Techniques", "Génie Civil", "Sécurité Sites"},
			Active:         true, CreatedAt: time.Now(), UpdatedAt: time.Now(),
		},
		{
			ID: primitive.NewObjectID(), Title: "Technicien Infrastructure", Code: "DINF-TECH",
			DepartmentID: deptMap["DINF"], Level: models.LevelMid,
			RequiredSkills: []string{"Maintenance Sites", "Installations Physiques", "Câblage", "Énergie"},
			Active:         true, CreatedAt: time.Now(), UpdatedAt: time.Now(),
		},
		// --- DFO ---
		{
			ID: primitive.NewObjectID(), Title: "Responsable Opérations Terrain", Code: "DFO-RESP",
			DepartmentID: deptMap["DFO"], Level: models.LevelManager,
			RequiredSkills: []string{"Coordination Terrain", "Maintenance Préventive", "Gestion Équipes", "Planification"},
			Active:         true, CreatedAt: time.Now(), UpdatedAt: time.Now(),
		},
		{
			ID: primitive.NewObjectID(), Title: "Technicien Terrain", Code: "DFO-TECH",
			DepartmentID: deptMap["DFO"], Level: models.LevelJunior,
			RequiredSkills: []string{"Maintenance Corrective", "Installation Équipements", "Mesures Terrain"},
			Active:         true, CreatedAt: time.Now(), UpdatedAt: time.Now(),
		},
		// --- DFN ---
		{
			ID: primitive.NewObjectID(), Title: "Ingénieur Réseau Terrain", Code: "DFN-ING",
			DepartmentID: deptMap["DFN"], Level: models.LevelMid,
			RequiredSkills: []string{"Radio Access", "FH/FO", "Antennes", "Optimisation RF"},
			Active:         true, CreatedAt: time.Now(), UpdatedAt: time.Now(),
		},
		// --- DEN ---
		{
			ID: primitive.NewObjectID(), Title: "Technicien Énergie", Code: "DEN-TECH",
			DepartmentID: deptMap["DEN"], Level: models.LevelMid,
			RequiredSkills: []string{"Groupes Électrogènes", "Solaire", "Batteries", "Raccordement Électrique"},
			Active:         true, CreatedAt: time.Now(), UpdatedAt: time.Now(),
		},
		// --- IIT ---
		{
			ID: primitive.NewObjectID(), Title: "Administrateur Systèmes IT", Code: "IIT-ADMIN",
			DepartmentID: deptMap["IIT"], Level: models.LevelSenior,
			RequiredSkills: []string{"Linux", "Windows Server", "VMware", "Stockage SAN/NAS", "Backup"},
			Active:         true, CreatedAt: time.Now(), UpdatedAt: time.Now(),
		},
		{
			ID: primitive.NewObjectID(), Title: "Ingénieur Virtualisation & Cloud", Code: "IIT-CLOUD",
			DepartmentID: deptMap["IIT"], Level: models.LevelMid,
			RequiredSkills: []string{"VMware", "Docker", "Kubernetes", "Cloud", "Automatisation"},
			Active:         true, CreatedAt: time.Now(), UpdatedAt: time.Now(),
		},
		// --- ITO ---
		{
			ID: primitive.NewObjectID(), Title: "Opérateur IT", Code: "ITO-OPR",
			DepartmentID: deptMap["ITO"], Level: models.LevelMid,
			RequiredSkills: []string{"Monitoring IT", "Gestion Incidents", "Scripting", "ITSM"},
			Active:         true, CreatedAt: time.Now(), UpdatedAt: time.Now(),
		},
		// --- IPPD ---
		{
			ID: primitive.NewObjectID(), Title: "Chef de Projet IT", Code: "IPPD-CDP",
			DepartmentID: deptMap["IPPD"], Level: models.LevelSenior,
			RequiredSkills: []string{"Gestion Projet IT", "BSS/OSS", "Intégration", "Agile/Scrum"},
			Active:         true, CreatedAt: time.Now(), UpdatedAt: time.Now(),
		},
		{
			ID: primitive.NewObjectID(), Title: "Développeur / Intégrateur IT", Code: "IPPD-DEV",
			DepartmentID: deptMap["IPPD"], Level: models.LevelMid,
			RequiredSkills: []string{"Développement", "API", "Intégration Systèmes", "DevOps"},
			Active:         true, CreatedAt: time.Now(), UpdatedAt: time.Now(),
		},
		// --- ITSD ---
		{
			ID: primitive.NewObjectID(), Title: "Responsable Service Desk", Code: "ITSD-RESP",
			DepartmentID: deptMap["ITSD"], Level: models.LevelManager,
			RequiredSkills: []string{"ITIL", "Gestion Service Desk", "ITSM", "Gestion Escalades"},
			Active:         true, CreatedAt: time.Now(), UpdatedAt: time.Now(),
		},
		{
			ID: primitive.NewObjectID(), Title: "Technicien Support N1/N2", Code: "ITSD-N12",
			DepartmentID: deptMap["ITSD"], Level: models.LevelJunior,
			RequiredSkills: []string{"Support Utilisateur", "Diagnostic", "Ticketing", "Bureautique"},
			Active:         true, CreatedAt: time.Now(), UpdatedAt: time.Now(),
		},
		{
			ID: primitive.NewObjectID(), Title: "Technicien Support N3", Code: "ITSD-N3",
			DepartmentID: deptMap["ITSD"], Level: models.LevelMid,
			RequiredSkills: []string{"Expertise Technique", "Résolution Problèmes", "KEDB", "RCA"},
			Active:         true, CreatedAt: time.Now(), UpdatedAt: time.Now(),
		},
		// --- DCO ---
		{
			ID: primitive.NewObjectID(), Title: "Superviseur NOC / iSOC", Code: "DCO-SUP",
			DepartmentID: deptMap["DCO"], Level: models.LevelManager,
			RequiredSkills: []string{"Supervision Réseau", "Gestion Incidents", "ITIL", "Outils NMS"},
			Active:         true, CreatedAt: time.Now(), UpdatedAt: time.Now(),
		},
		{
			ID: primitive.NewObjectID(), Title: "Technicien Core Network", Code: "DCO-TECH",
			DepartmentID: deptMap["DCO"], Level: models.LevelMid,
			RequiredSkills: []string{"Core Mobile", "IMS", "Signalisation", "VoLTE", "Packet Core"},
			Active:         true, CreatedAt: time.Now(), UpdatedAt: time.Now(),
		},
		// --- DPO ---
		{
			ID: primitive.NewObjectID(), Title: "Ingénieur Performance Réseau", Code: "DPO-ING",
			DepartmentID: deptMap["DPO"], Level: models.LevelSenior,
			RequiredSkills: []string{"KPI Réseau", "Optimisation Radio", "Capacity Planning", "Drive Test"},
			Active:         true, CreatedAt: time.Now(), UpdatedAt: time.Now(),
		},
		{
			ID: primitive.NewObjectID(), Title: "Analyste QoS", Code: "DPO-QOS",
			DepartmentID: deptMap["DPO"], Level: models.LevelMid,
			RequiredSkills: []string{"Qualité de Service", "Analyse Données", "Reporting", "SLA"},
			Active:         true, CreatedAt: time.Now(), UpdatedAt: time.Now(),
		},
		// --- DPMO ---
		{
			ID: primitive.NewObjectID(), Title: "Chef de Projet N&IS", Code: "DPMO-CDP",
			DepartmentID: deptMap["DPMO"], Level: models.LevelSenior,
			RequiredSkills: []string{"Gestion de Projet", "PMI/Prince2", "Agile", "Budget", "Planning"},
			Active:         true, CreatedAt: time.Now(), UpdatedAt: time.Now(),
		},
		{
			ID: primitive.NewObjectID(), Title: "Coordinateur PMO", Code: "DPMO-COORD",
			DepartmentID: deptMap["DPMO"], Level: models.LevelMid,
			RequiredSkills: []string{"Suivi Projets", "Reporting", "Gouvernance", "Amélioration Continue"},
			Active:         true, CreatedAt: time.Now(), UpdatedAt: time.Now(),
		},
		// --- DTBS ---
		{
			ID: primitive.NewObjectID(), Title: "Responsable Support Business", Code: "DTBS-RESP",
			DepartmentID: deptMap["DTBS"], Level: models.LevelManager,
			RequiredSkills: []string{"Support Opérationnel", "Logistique", "Coordination", "Gestion Dotations"},
			Active:         true, CreatedAt: time.Now(), UpdatedAt: time.Now(),
		},
		{
			ID: primitive.NewObjectID(), Title: "Gestionnaire Logistique Technique", Code: "DTBS-LOG",
			DepartmentID: deptMap["DTBS"], Level: models.LevelMid,
			RequiredSkills: []string{"Logistique", "Gestion Stocks", "Approvisionnement", "EPI"},
			Active:         true, CreatedAt: time.Now(), UpdatedAt: time.Now(),
		},
		// --- DI ---
		{
			ID: primitive.NewObjectID(), Title: "Responsable Digitalisation", Code: "DI-RESP",
			DepartmentID: deptMap["DI"], Level: models.LevelManager,
			RequiredSkills: []string{"Transformation Digitale", "Automatisation", "NetOps/DevOps", "Innovation"},
			Active:         true, CreatedAt: time.Now(), UpdatedAt: time.Now(),
		},
		{
			ID: primitive.NewObjectID(), Title: "Développeur Solutions Digitales", Code: "DI-DEV",
			DepartmentID: deptMap["DI"], Level: models.LevelMid,
			RequiredSkills: []string{"Développement Web/Mobile", "API", "Orchestration", "Self-Service"},
			Active:         true, CreatedAt: time.Now(), UpdatedAt: time.Now(),
		},
		// --- BDDG ---
		{
			ID: primitive.NewObjectID(), Title: "Data Engineer", Code: "BDDG-ENG",
			DepartmentID: deptMap["BDDG"], Level: models.LevelSenior,
			RequiredSkills: []string{"Big Data", "Hadoop/Spark", "ETL", "Data Lake", "Python"},
			Active:         true, CreatedAt: time.Now(), UpdatedAt: time.Now(),
		},
		{
			ID: primitive.NewObjectID(), Title: "Data Analyst", Code: "BDDG-ANA",
			DepartmentID: deptMap["BDDG"], Level: models.LevelMid,
			RequiredSkills: []string{"BI", "SQL", "Tableau/PowerBI", "Analyse Données", "Reporting"},
			Active:         true, CreatedAt: time.Now(), UpdatedAt: time.Now(),
		},
		// --- CISO ---
		{
			ID: primitive.NewObjectID(), Title: "Responsable Cybersécurité", Code: "CISO-RESP",
			DepartmentID: deptMap["CISO"], Level: models.LevelManager,
			RequiredSkills: []string{"ISO 27001", "Gestion Risques", "SIEM", "Audit Sécurité", "RGPD"},
			Active:         true, CreatedAt: time.Now(), UpdatedAt: time.Now(),
		},
		{
			ID: primitive.NewObjectID(), Title: "Analyste Sécurité SI", Code: "CISO-ANA",
			DepartmentID: deptMap["CISO"], Level: models.LevelMid,
			RequiredSkills: []string{"SOC", "Détection Intrusions", "Vulnérabilités", "Forensics"},
			Active:         true, CreatedAt: time.Now(), UpdatedAt: time.Now(),
		},
		// --- DSI ---
		{
			ID: primitive.NewObjectID(), Title: "Directeur des Systèmes d'Information", Code: "DSI-DIR",
			DepartmentID: deptMap["DSI"], Level: models.LevelExecutive,
			RequiredSkills: []string{"Stratégie SI", "Gouvernance IT", "Alignement Métier", "Leadership"},
			Active:         true, CreatedAt: time.Now(), UpdatedAt: time.Now(),
		},
	}

	docs := make([]interface{}, len(jobPositions))
	for i, pos := range jobPositions {
		docs[i] = pos
	}

	_, err = collection.InsertMany(ctx, docs)
	if err != nil {
		return err
	}

	log.Printf("✅ Seeded %d job positions", len(jobPositions))
	return nil
}

func seedTestUser(ctx context.Context, userService *services.UserService, pinService *services.PinService, db *services.DatabaseService) error {
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

	// Get "DSI" Department
	deptCollection := db.Collection("departments")
	var dsiDept models.Department
	err = deptCollection.FindOne(ctx, bson.M{"code": "DSI"}).Decode(&dsiDept)
	var deptIDHex string
	if err == nil {
		deptIDHex = dsiDept.ID.Hex()
	}

	// Get "DSI-DIR" Job Position
	jobCollection := db.Collection("job_positions")
	var dsiDirJob models.JobPosition
	err = jobCollection.FindOne(ctx, bson.M{"code": "DSI-DIR"}).Decode(&dsiDirJob)
	var jobIDHex string
	if err == nil {
		jobIDHex = dsiDirJob.ID.Hex()
	}

	// Insert user
	// CreateUserRequest matches expected input for userService.CreateUser
	req := &models.CreateUserRequest{
		Email:         user.Email,
		FirstName:     user.FirstName,
		LastName:      user.LastName,
		Role:          user.Role,
		DepartmentID:  deptIDHex,
		JobPositionID: jobIDHex,
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
