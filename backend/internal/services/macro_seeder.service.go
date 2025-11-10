package services

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/kodesonik/process-manager/internal/models"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// MacroSeedData represents the structure of seed data for macros
type MacroSeedData struct {
	Code             string        `json:"code"`
	Name             string        `json:"name"`
	ShortDescription string        `json:"shortDescription"`
	Description      string        `json:"description"`
	IsActive         bool          `json:"isActive"`
	Processes        []ProcessSeed `json:"processes"`
}

// ProcessSeed represents the structure of seed data for processes
type ProcessSeed struct {
	Code             string `json:"code"`
	Name             string `json:"name"`
	ShortDescription string `json:"shortDescription"`
	Description      string `json:"description"`
	IsActive         bool   `json:"isActive"`
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

		result, err := s.macroCollection.InsertOne(ctx, macro)
		if err != nil {
			return fmt.Errorf("failed to insert macro %s: %w", macroData.Code, err)
		}

		macroID := result.InsertedID.(primitive.ObjectID)

		// Create processes for this macro
		for _, processData := range macroData.Processes {
			document := &models.Document{
				MacroID:     &macroID,                      // Link to macro
				ProcessCode: processData.Code,              // M1_P1, M1_P2, etc.
				Reference:   processData.Code,              // Use process code as reference
				Title:       processData.Name,
				Version:     "1.0",
				Status:      models.DocumentStatusDraft,
				CreatedBy:   systemUserID,
				Contributors: models.Contributors{
					Authors:    []models.Contributor{},
					Verifiers:  []models.Contributor{},
					Validators: []models.Contributor{},
				},
				Metadata: models.DocumentMetadata{
					Objectives:        []string{processData.Description},
					ImplicatedActors:  []string{},
					ManagementRules:   []string{},
					Terminology:       []string{},
					ChangeHistory:     []models.ChangeHistoryEntry{},
				},
				ProcessGroups: []models.ProcessGroup{},
				Annexes:       []models.Annex{},
				CreatedAt:     time.Now(),
				UpdatedAt:     time.Now(),
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
