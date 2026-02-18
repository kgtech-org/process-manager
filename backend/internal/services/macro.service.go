package services

import (
	"context"
	"fmt"
	"regexp"
	"time"

	"github.com/kodesonik/process-manager/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// MacroService handles macro-related database operations
type MacroService struct {
	db                   *DatabaseService
	macroCollection      *mongo.Collection
	docCollection        *mongo.Collection
	pdfService           *PDFService
	documentationService *DocumentationService
}

// NewMacroService creates a new macro service instance
func NewMacroService(db *DatabaseService, pdfService *PDFService, documentationService *DocumentationService) *MacroService {
	return &MacroService{
		db:                   db,
		macroCollection:      db.Collection("macros"),
		docCollection:        db.Collection("documents"),
		pdfService:           pdfService,
		documentationService: documentationService,
	}
}

// ============================================
// Macro CRUD Operations
// ============================================

// CreateMacro creates a new macro in the database
func (s *MacroService) CreateMacro(ctx context.Context, req *models.CreateMacroRequest, createdByID primitive.ObjectID) (*models.Macro, error) {
	// Validate macro code format (M1, M2, M3, etc.)
	if !s.ValidateMacroCode(req.Code) {
		return nil, fmt.Errorf("invalid macro code format: must be M1, M2, M3, etc.")
	}

	// Check if macro with same code already exists
	existing, err := s.GetMacroByCode(ctx, req.Code)
	if err == nil && existing != nil {
		return nil, fmt.Errorf("macro with code %s already exists", req.Code)
	}

	// Create new macro
	macro := &models.Macro{
		Code:             req.Code,
		Name:             req.Name,
		ShortDescription: req.ShortDescription,
		Description:      req.Description,
		IsActive:         true,
		CreatedBy:        createdByID,
		CreatedAt:        time.Now(),
		UpdatedAt:        time.Now(),
	}

	// Insert macro into database
	result, err := s.macroCollection.InsertOne(ctx, macro)
	if err != nil {
		if mongo.IsDuplicateKeyError(err) {
			return nil, fmt.Errorf("macro with code %s already exists", req.Code)
		}
		return nil, fmt.Errorf("failed to create macro: %w", err)
	}

	macro.ID = result.InsertedID.(primitive.ObjectID)

	// Trigger documentation update
	if s.documentationService != nil {
		s.documentationService.TriggerUpdate()
	}

	return macro, nil
}

// GetMacroByID retrieves a macro by its ID
func (s *MacroService) GetMacroByID(ctx context.Context, id primitive.ObjectID) (*models.Macro, error) {
	var macro models.Macro
	err := s.macroCollection.FindOne(ctx, bson.M{"_id": id}).Decode(&macro)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, fmt.Errorf("macro not found")
		}
		return nil, fmt.Errorf("failed to get macro: %w", err)
	}
	return &macro, nil
}

// GetMacroByCode retrieves a macro by its code (M1, M2, etc.)
func (s *MacroService) GetMacroByCode(ctx context.Context, code string) (*models.Macro, error) {
	var macro models.Macro
	err := s.macroCollection.FindOne(ctx, bson.M{"code": code}).Decode(&macro)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get macro by code: %w", err)
	}
	return &macro, nil
}

// GetAllMacros retrieves all macros with optional filtering and pagination
func (s *MacroService) GetAllMacros(ctx context.Context, filter *models.MacroFilter) ([]models.MacroResponse, int64, error) {
	// Build query filter
	query := bson.M{}

	// Search filter
	if filter.Search != nil && *filter.Search != "" {
		searchRegex := primitive.Regex{Pattern: *filter.Search, Options: "i"}
		query["$or"] = []bson.M{
			{"code": searchRegex},
			{"name": searchRegex},
			{"description": searchRegex},
		}
	}

	// Active status filter
	if filter.IsActive != nil {
		query["is_active"] = *filter.IsActive
	}

	// Count total documents
	total, err := s.macroCollection.CountDocuments(ctx, query)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count macros: %w", err)
	}

	// Setup pagination
	opts := options.Find()
	if filter.Limit > 0 {
		opts.SetLimit(int64(filter.Limit))
		if filter.Page > 0 {
			opts.SetSkip(int64((filter.Page - 1) * filter.Limit))
		}
	}
	// Determine sort
	sortField := "name" // Default sort by name (alphabetical)
	if filter.SortBy != "" {
		switch filter.SortBy {
		case "createdAt":
			sortField = "created_at"
		case "updatedAt":
			sortField = "updated_at"
		case "code":
			sortField = "code"
		case "name":
			sortField = "name"
		}
	}

	sortOrder := 1 // Default ASC
	if filter.SortOrder == "desc" {
		sortOrder = -1
	}

	opts.SetSort(bson.D{{Key: sortField, Value: sortOrder}})

	// Find macros
	cursor, err := s.macroCollection.Find(ctx, query, opts)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to find macros: %w", err)
	}
	defer cursor.Close(ctx)

	// Decode results
	var macros []models.Macro
	if err := cursor.All(ctx, &macros); err != nil {
		return nil, 0, fmt.Errorf("failed to decode macros: %w", err)
	}

	// Convert to response format and add process counts
	responses := make([]models.MacroResponse, len(macros))
	for i, macro := range macros {
		responses[i] = macro.ToResponse()

		// Get process count for this macro
		processCount, err := s.GetProcessCountByMacroID(ctx, macro.ID)
		if err == nil {
			responses[i].ProcessCount = int(processCount)
		}
	}

	return responses, total, nil
}

// UpdateMacro updates an existing macro
func (s *MacroService) UpdateMacro(ctx context.Context, id primitive.ObjectID, req *models.UpdateMacroRequest) (*models.Macro, error) {
	// Build update document
	update := bson.M{
		"$set": bson.M{
			"updated_at": time.Now(),
		},
	}

	setFields := update["$set"].(bson.M)

	if req.Name != nil {
		setFields["name"] = *req.Name
	}
	if req.ShortDescription != nil {
		setFields["short_description"] = *req.ShortDescription
	}
	if req.Description != nil {
		setFields["description"] = *req.Description
	}
	if req.IsActive != nil {
		setFields["is_active"] = *req.IsActive
	}

	// Update macro
	result := s.macroCollection.FindOneAndUpdate(
		ctx,
		bson.M{"_id": id},
		update,
		options.FindOneAndUpdate().SetReturnDocument(options.After),
	)

	var macro models.Macro
	if err := result.Decode(&macro); err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, fmt.Errorf("macro not found")
		}
		return nil, fmt.Errorf("failed to update macro: %w", err)
	}

	// Trigger documentation update
	if s.documentationService != nil {
		s.documentationService.TriggerUpdate()
	}

	return &macro, nil
}

// DeleteMacro deletes a macro by ID
func (s *MacroService) DeleteMacro(ctx context.Context, id primitive.ObjectID) error {
	// Check if macro has associated processes
	processCount, err := s.GetProcessCountByMacroID(ctx, id)
	if err != nil {
		return fmt.Errorf("failed to check associated processes: %w", err)
	}
	if processCount > 0 {
		return fmt.Errorf("cannot delete macro with %d associated processes", processCount)
	}

	// Delete macro
	result, err := s.macroCollection.DeleteOne(ctx, bson.M{"_id": id})
	if err != nil {
		return fmt.Errorf("failed to delete macro: %w", err)
	}

	if result.DeletedCount == 0 {
		return fmt.Errorf("macro not found")
	}

	// Trigger documentation update
	if s.documentationService != nil {
		s.documentationService.TriggerUpdate()
	}

	return nil
}

// GetProcessesByMacroID retrieves all processes (documents) belonging to a macro
func (s *MacroService) GetProcessesByMacroID(ctx context.Context, macroID primitive.ObjectID, limit int, page int, isActive *bool) ([]models.DocumentResponse, int64, error) {
	// Build query
	query := bson.M{"macro_id": macroID}

	// Active status filter
	if isActive != nil {
		query["is_active"] = *isActive
	}

	// Count total documents
	total, err := s.docCollection.CountDocuments(ctx, query)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count processes: %w", err)
	}

	// Setup pagination
	opts := options.Find()
	if limit > 0 {
		opts.SetLimit(int64(limit))
		if page > 0 {
			opts.SetSkip(int64((page - 1) * limit))
		}
	}
	opts.SetSort(bson.D{
		{Key: "order", Value: 1},        // Primary sort by custom order
		{Key: "process_code", Value: 1}, // Secondary sort by code
	})

	// Find documents
	cursor, err := s.docCollection.Find(ctx, query, opts)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to find processes: %w", err)
	}
	defer cursor.Close(ctx)

	// Decode results
	var documents []models.Document
	if err := cursor.All(ctx, &documents); err != nil {
		return nil, 0, fmt.Errorf("failed to decode processes: %w", err)
	}

	// Convert to response format
	responses := make([]models.DocumentResponse, len(documents))
	for i, doc := range documents {
		responses[i] = doc.ToResponse()
	}

	return responses, total, nil
}

// GetProcessCountByMacroID returns the count of processes for a given macro
func (s *MacroService) GetProcessCountByMacroID(ctx context.Context, macroID primitive.ObjectID) (int64, error) {
	count, err := s.docCollection.CountDocuments(ctx, bson.M{"macro_id": macroID})
	if err != nil {
		return 0, fmt.Errorf("failed to count processes: %w", err)
	}
	return count, nil
}

// ExportPDF generates and exports the macro as PDF
func (s *MacroService) ExportPDF(ctx context.Context, id primitive.ObjectID) (string, error) {
	// Get existing macro
	macro, err := s.GetMacroByID(ctx, id)
	if err != nil {
		return "", err
	}

	// Get all processes for this macro (no pagination, only active ones)
	active := true
	_, _, err = s.GetProcessesByMacroID(ctx, id, 0, 0, &active)
	if err != nil {
		return "", fmt.Errorf("failed to get processes: %w", err)
	}

	// Convert DocumentResponse back to Document for PDF service
	// This is a bit inefficient but necessary since PDF service expects []models.Document
	// Ideally we should refactor PDF service to accept a more generic interface or use DocumentResponse
	// For now, let's fetch the raw documents again
	// Build query
	query := bson.M{
		"macro_id":  id,
		"is_active": true,
	}
	opts := options.Find().SetSort(bson.D{
		{Key: "order", Value: 1},
		{Key: "process_code", Value: 1},
	})

	cursor, err := s.docCollection.Find(ctx, query, opts)
	if err != nil {
		return "", fmt.Errorf("failed to find processes: %w", err)
	}
	defer cursor.Close(ctx)

	var rawProcesses []models.Document
	if err := cursor.All(ctx, &rawProcesses); err != nil {
		return "", fmt.Errorf("failed to decode processes: %w", err)
	}

	// Generate PDF if service is available
	if s.pdfService == nil {
		return "", fmt.Errorf("PDF service not available")
	}

	fmt.Printf("📄 [EXPORT] Generating new PDF for macro: %s (%s)\n", macro.Name, macro.Code)
	pdfURL, err := s.pdfService.GenerateMacroPDF(ctx, macro, rawProcesses)
	if err != nil {
		return "", fmt.Errorf("failed to generate PDF: %w", err)
	}

	fmt.Printf("✅ [EXPORT] PDF generated successfully: %s\n", pdfURL)
	return pdfURL, nil
}

// ReorderProcesses updates the order of processes in a macro
func (s *MacroService) ReorderProcesses(ctx context.Context, macroID primitive.ObjectID, processIDs []string) error {
	// Verify macro exists
	_, err := s.GetMacroByID(ctx, macroID)
	if err != nil {
		return err
	}

	// Create write models for bulk update
	var writes []mongo.WriteModel
	for i, processID := range processIDs {
		objID, err := primitive.ObjectIDFromHex(processID)
		if err != nil {
			return fmt.Errorf("invalid process ID %s: %w", processID, err)
		}

		// Update order field (i + 1 so it's 1-based)
		update := mongo.NewUpdateOneModel().
			SetFilter(bson.M{"_id": objID, "macro_id": macroID}).
			SetUpdate(bson.M{"$set": bson.M{"order": i + 1}})

		writes = append(writes, update)
	}

	if len(writes) == 0 {
		return nil
	}

	// Execute bulk write
	_, err = s.docCollection.BulkWrite(ctx, writes)
	if err != nil {
		return fmt.Errorf("failed to reorder processes: %w", err)
	}

	// Trigger documentation update
	if s.documentationService != nil {
		s.documentationService.TriggerUpdate()
	}

	return nil
}

// ============================================
// Validation Helpers
// ============================================

// ValidateMacroCode validates the macro code format (M1, M2, M3, etc.)
func (s *MacroService) ValidateMacroCode(code string) bool {
	// Pattern: M followed by 1 or more digits
	matched, _ := regexp.MatchString(`^M\d+$`, code)
	return matched
}

// ValidateProcessCode validates the process code format (M1_P1, M2_P3, etc.)
func (s *MacroService) ValidateProcessCode(code string) bool {
	// Pattern: M{number}_P{number}
	matched, _ := regexp.MatchString(`^M\d+_P\d+$`, code)
	return matched
}

// ValidateTaskCode validates the task code format (M1_P1_T1, M2_P3_T5, etc.)
func (s *MacroService) ValidateTaskCode(code string) bool {
	// Pattern: M{number}_P{number}_T{number}
	matched, _ := regexp.MatchString(`^M\d+_P\d+_T\d+$`, code)
	return matched
}

// GetNextProcessNumber returns the next process number for a given macro
func (s *MacroService) GetNextProcessNumber(ctx context.Context, macroID primitive.ObjectID) (int, error) {
	// Find the highest process number for this macro
	opts := options.FindOne().SetSort(bson.D{{Key: "process_code", Value: -1}})
	var doc models.Document
	err := s.docCollection.FindOne(ctx, bson.M{"macro_id": macroID}, opts).Decode(&doc)

	if err != nil {
		if err == mongo.ErrNoDocuments {
			// No processes yet, start with 1
			return 1, nil
		}
		return 0, fmt.Errorf("failed to get next process number: %w", err)
	}

	// Extract number from process code (M1_P5 -> 5)
	re := regexp.MustCompile(`_P(\d+)$`)
	matches := re.FindStringSubmatch(doc.ProcessCode)
	if len(matches) < 2 {
		return 1, nil
	}

	var lastNumber int
	fmt.Sscanf(matches[1], "%d", &lastNumber)
	return lastNumber + 1, nil
}
