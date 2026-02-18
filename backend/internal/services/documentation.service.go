package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/kodesonik/process-manager/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// PublicDocumentation represents the structure of the public documentation
type PublicDocumentation struct {
	GeneratedAt time.Time     `json:"generatedAt"`
	Macros      []PublicMacro `json:"macros"`
}

// PublicMacro represents a macro with its active processes
type PublicMacro struct {
	ID               string          `json:"id"`
	Code             string          `json:"code"`
	Name             string          `json:"name"`
	ShortDescription string          `json:"shortDescription"`
	Description      string          `json:"description"`
	Processes        []PublicProcess `json:"processes"`
}

// PublicProcess represents a process with its active tasks and annexes
type PublicProcess struct {
	ID               string         `json:"id"`
	ProcessCode      string         `json:"processCode"`
	Title            string         `json:"title"`
	ShortDescription string         `json:"shortDescription"`
	Description      string         `json:"description"`
	Stakeholders     []string       `json:"stakeholders"`
	Tasks            []models.Task  `json:"tasks"`
	Annexes          []models.Annex `json:"annexes"`
	PdfUrl           string         `json:"pdfUrl,omitempty"`
	Order            int            `json:"order"`
}

// DocumentationService handles documentation generation and publishing
type DocumentationService struct {
	db            *DatabaseService
	minioService  *MinIOService
	openAIService *OpenAIService
}

// NewDocumentationService creates a new documentation service instance
func NewDocumentationService(db *DatabaseService, minioService *MinIOService, openAIService *OpenAIService) *DocumentationService {
	return &DocumentationService{
		db:            db,
		minioService:  minioService,
		openAIService: openAIService,
	}
}

// TriggerUpdate triggers the documentation regeneration and publication process asynchronously
func (s *DocumentationService) TriggerUpdate() {
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
		defer cancel()

		log.Println("🔄 Triggering documentation update...")
		if err := s.GenerateAndPublish(ctx); err != nil {
			log.Printf("❌ Failed to update documentation: %v", err)
		} else {
			log.Println("✅ Documentation updated successfully")
		}
	}()
}

// GenerateAndPublish aggregates data, generates the document, and uploads it
func (s *DocumentationService) GenerateAndPublish(ctx context.Context) error {
	// 1. Aggregate Data
	data, err := s.AggregateData(ctx)
	if err != nil {
		return fmt.Errorf("aggregation failed: %w", err)
	}

	// 2. Marshal to JSON
	jsonData, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return fmt.Errorf("json marshaling failed: %w", err)
	}

	// 3. Upload to MinIO (Public Bucket)
	jsonReader := bytes.NewReader(jsonData)
	fileURL, err := s.minioService.UploadFile(ctx, "public/documentation.json", jsonReader, int64(len(jsonData)), "application/json")
	if err != nil {
		return fmt.Errorf("minio upload failed: %w", err)
	}
	log.Printf("📄 Public documentation available at: %s", fileURL)

	// 4. Upload to OpenAI (Update Assistant)
	// We'll reset the reader or create a new one
	jsonReader = bytes.NewReader(jsonData)
	err = s.openAIService.UploadDocumentFromReader(ctx, jsonReader, "documentation.json", "global_documentation")
	if err != nil {
		log.Printf("⚠️ OpenAI upload failed (non-critical): %v", err)
		// We don't return error here to avoid failing the whole process if OpenAI is down
	}

	return nil
}

// AggregateData fetches all active macros, processes, and tasks
func (s *DocumentationService) AggregateData(ctx context.Context) (*PublicDocumentation, error) {
	// Fetch Active Macros
	macroCollection := s.db.Collection("macros")
	docCollection := s.db.Collection("documents")

	// Find active macros sorted by creation date (or code active macros generally don't have an order field properly defined yet besides code)
	// Assuming Code (M1, M2) is a good sort order
	opts := options.Find().SetSort(bson.D{{Key: "code", Value: 1}})
	cursor, err := macroCollection.Find(ctx, bson.M{"is_active": true}, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch macros: %w", err)
	}
	defer cursor.Close(ctx)

	var macros []models.Macro
	if err := cursor.All(ctx, &macros); err != nil {
		return nil, fmt.Errorf("failed to decode macros: %w", err)
	}

	publicMacros := make([]PublicMacro, 0, len(macros))

	for _, macro := range macros {
		// Fetch Active Processes for this Macro
		// Sort by 'order' then 'process_code'
		procOpts := options.Find().SetSort(bson.D{{Key: "order", Value: 1}, {Key: "process_code", Value: 1}})
		procCursor, err := docCollection.Find(ctx, bson.M{"macro_id": macro.ID, "is_active": true}, procOpts)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch processes for macro %s: %w", macro.Code, err)
		}

		var processes []models.Document
		if err := procCursor.All(ctx, &processes); err != nil {
			procCursor.Close(ctx)
			return nil, fmt.Errorf("failed to decode processes: %w", err)
		}
		procCursor.Close(ctx)

		publicProcesses := make([]PublicProcess, 0, len(processes))
		for _, proc := range processes {
			// Filter Active Tasks
			activeTasks := make([]models.Task, 0)
			for _, task := range proc.Tasks {
				if task.IsActive {
					activeTasks = append(activeTasks, task)
				}
			}

			// Add to public processes
			publicProcesses = append(publicProcesses, PublicProcess{
				ID:               proc.ID.Hex(),
				ProcessCode:      proc.ProcessCode,
				Title:            proc.Title,
				ShortDescription: proc.ShortDescription,
				Description:      proc.Description,
				Stakeholders:     proc.Stakeholders,
				Tasks:            activeTasks,
				Annexes:          proc.Annexes,
				PdfUrl:           proc.PdfUrl, // Include the individual PDF URL if available
				Order:            proc.Order,
			})
		}

		// Add to public macros
		publicMacros = append(publicMacros, PublicMacro{
			ID:               macro.ID.Hex(),
			Code:             macro.Code,
			Name:             macro.Name,
			ShortDescription: macro.ShortDescription,
			Description:      macro.Description,
			Processes:        publicProcesses,
		})
	}

	return &PublicDocumentation{
		GeneratedAt: time.Now(),
		Macros:      publicMacros,
	}, nil
}

// GetPublicDocumentationURL returns the URL of the generated documentation
func (s *DocumentationService) GetPublicDocumentationURL() string {
	return fmt.Sprintf("%s/%s/public/documentation.json", s.minioService.publicURL, s.minioService.bucketName)
}
