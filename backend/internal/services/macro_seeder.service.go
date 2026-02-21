package services

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/kodesonik/process-manager/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// MacroSeedData represents the structure of seed data for macros
type MacroSeedData struct {
	Code             string        `json:"code"`
	Name             string        `json:"name"`
	ShortDescription string        `json:"shortDescription"`
	Description      string        `json:"description"`
	IsActive         bool          `json:"isActive"`
	DomainCode       string        `json:"domainCode,omitempty"` // Domain code to resolve at seed time
	Processes        []ProcessSeed `json:"processes"`
}

// ProcessSeed represents the structure of seed data for processes
type ProcessSeed struct {
	Code             string     `json:"code"`
	Name             string     `json:"name"`
	ShortDescription string     `json:"shortDescription"`
	Description      string     `json:"description"`
	IsActive         bool       `json:"isActive"`
	Tasks            []TaskSeed `json:"tasks,omitempty"`
}

// TaskSeed represents seed data for a single task within a process
type TaskSeed struct {
	Code             string   `json:"code"`
	Description      string   `json:"description"`
	IsActive         bool     `json:"isActive"`
	Order            int      `json:"order"`
	IntervenantCodes []string `json:"intervenantCodes,omitempty"` // Job position codes to resolve at seed time
}

// InitializeMacros seeds the database with macros from the seed JSON file if no macros exist
func (s *MacroService) InitializeMacros(ctx context.Context, seedFilePath string) error {
	// Check if macros already exist
	count, err := s.macroCollection.CountDocuments(ctx, map[string]interface{}{})
	if err != nil {
		return fmt.Errorf("failed to count existing macros: %w", err)
	}

	if count > 0 {
		fmt.Printf("✓ Macros already initialized (%d macros found)\n", count)
		return nil
	}

	fmt.Println("📦 Initializing macros from seed file...")

	// Read seed file
	data, err := os.ReadFile(seedFilePath)
	if err != nil {
		return fmt.Errorf("failed to read seed file: %w", err)
	}

	// Parse seed data
	var seedData []MacroSeedData
	if err := json.Unmarshal(data, &seedData); err != nil {
		return fmt.Errorf("failed to parse seed data: %w", err)
	}

	// Create a system user ID for seeding (using a fixed ObjectID for consistency)
	systemUserID, _ := primitive.ObjectIDFromHex("000000000000000000000000")

	// Build domain code → ID map for resolving DomainCode references
	domainMap, err := s.buildDomainMap(ctx)
	if err != nil {
		fmt.Printf("⚠️  Warning: could not load domains for mapping: %v\n", err)
		domainMap = make(map[string]primitive.ObjectID)
	}

	// Build job position code → ID map for resolving IntervenantCodes references
	jobPositionMap, err := s.buildJobPositionMap(ctx)
	if err != nil {
		fmt.Printf("⚠️  Warning: could not load job positions for mapping: %v\n", err)
		jobPositionMap = make(map[string]primitive.ObjectID)
	}

	// Insert macros and processes
	totalProcesses := 0
	for _, macroData := range seedData {
		// Create macro
		macro := &models.Macro{
			Code:             macroData.Code,
			Name:             macroData.Name,
			ShortDescription: macroData.ShortDescription,
			Description:      macroData.Description,
			CreatedBy:        systemUserID,
			CreatedAt:        time.Now(),
			UpdatedAt:        time.Now(),
		}

		// Resolve domain ID from code
		if macroData.DomainCode != "" {
			if domainID, ok := domainMap[macroData.DomainCode]; ok {
				macro.DomainID = &domainID
			} else {
				fmt.Printf("⚠️  Warning: domain code '%s' not found for macro %s\n", macroData.DomainCode, macroData.Code)
			}
		}

		result, err := s.macroCollection.InsertOne(ctx, macro)
		if err != nil {
			return fmt.Errorf("failed to insert macro %s: %w", macroData.Code, err)
		}

		macroID := result.InsertedID.(primitive.ObjectID)

		// Create processes for this macro
		for _, processData := range macroData.Processes {
			// Resolve tasks with intervenants
			var tasks []models.Task
			for _, taskData := range processData.Tasks {
				task := models.Task{
					Code:        taskData.Code,
					Description: taskData.Description,
					IsActive:    taskData.IsActive,
					Order:       taskData.Order,
				}

				// Resolve intervenant codes to ObjectIDs
				for _, jpCode := range taskData.IntervenantCodes {
					if jpID, ok := jobPositionMap[jpCode]; ok {
						task.Intervenants = append(task.Intervenants, jpID)
					} else {
						fmt.Printf("⚠️  Warning: job position code '%s' not found for task %s\n", jpCode, taskData.Code)
					}
				}

				tasks = append(tasks, task)
			}

			document := &models.Document{
				MacroID:          &macroID,         // Link to macro
				ProcessCode:      processData.Code, // M1_P1, M1_P2, etc.
				Reference:        processData.Code, // Use process code as reference
				Title:            processData.Name,
				ShortDescription: processData.ShortDescription, // Brief description
				Description:      processData.Description,      // Detailed description
				IsActive:         processData.IsActive,         // Active status
				Version:          "1.0",
				Status:           models.DocumentStatusDraft,
				CreatedBy:        systemUserID,
				Tasks:            tasks,
				Contributors: models.Contributors{
					Authors:    []models.Contributor{},
					Verifiers:  []models.Contributor{},
					Validators: []models.Contributor{},
				},
				Metadata: models.DocumentMetadata{
					Objectives:       []string{},
					ImplicatedActors: []string{},
					ManagementRules:  []string{},
					Terminology:      []string{},
					ChangeHistory:    []models.ChangeHistoryEntry{},
				},
				Annexes:   []models.Annex{},
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			}

			_, err := s.docCollection.InsertOne(ctx, document)
			if err != nil {
				fmt.Printf("⚠️  Warning: failed to insert process %s: %v\n", processData.Code, err)
				continue
			}
			totalProcesses++
		}

		fmt.Printf("  ✓ Seeded macro %s: %s (%d processes)\n", macroData.Code, macroData.Name, len(macroData.Processes))
	}

	fmt.Printf("✅ Successfully seeded %d macros with %d processes\n", len(seedData), totalProcesses)
	return nil
}

// buildDomainMap fetches all domains and returns a code → ObjectID map
func (s *MacroService) buildDomainMap(ctx context.Context) (map[string]primitive.ObjectID, error) {
	domainCollection := s.db.Collection("domains")
	cursor, err := domainCollection.Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	domainMap := make(map[string]primitive.ObjectID)
	var domains []models.Domain
	if err := cursor.All(ctx, &domains); err != nil {
		return nil, err
	}
	for _, d := range domains {
		domainMap[d.Code] = d.ID
	}
	return domainMap, nil
}

// buildJobPositionMap fetches all job positions and returns a code → ObjectID map
func (s *MacroService) buildJobPositionMap(ctx context.Context) (map[string]primitive.ObjectID, error) {
	jpCollection := s.db.Collection("job_positions")
	cursor, err := jpCollection.Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	jpMap := make(map[string]primitive.ObjectID)
	var positions []models.JobPosition
	if err := cursor.All(ctx, &positions); err != nil {
		return nil, err
	}
	for _, jp := range positions {
		jpMap[jp.Code] = jp.ID
	}
	return jpMap, nil
}
