package services

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log"
	"os"
	"time"

	openai "github.com/sashabaranov/go-openai"
)

// OpenAIService handles OpenAI Assistant API operations
type OpenAIService struct {
	client      *openai.Client
	assistantID string
}

// NewOpenAIService creates a new OpenAI service
func NewOpenAIService() (*OpenAIService, error) {
	apiKey := os.Getenv("OPENAI_API_KEY")
	if apiKey == "" {
		return nil, errors.New("OPENAI_API_KEY environment variable is not set")
	}

	client := openai.NewClient(apiKey)

	service := &OpenAIService{
		client: client,
	}

	// Initialize or get existing assistant
	if err := service.ensureAssistant(context.Background()); err != nil {
		return nil, fmt.Errorf("failed to initialize assistant: %w", err)
	}

	return service, nil
}

// ensureAssistant creates or retrieves the Process Manager assistant
func (s *OpenAIService) ensureAssistant(ctx context.Context) error {
	// Try to get assistant ID from environment
	assistantID := os.Getenv("OPENAI_ASSISTANT_ID")

	if assistantID != "" {
		// Verify the assistant exists
		_, err := s.client.RetrieveAssistant(ctx, assistantID)
		if err == nil {
			s.assistantID = assistantID
			log.Printf("✅ Using existing OpenAI Assistant: %s", assistantID)
			return nil
		}
		log.Printf("⚠️  Assistant %s not found, creating new one", assistantID)
	}

	// Helper function to create string pointer
	strPtr := func(s string) *string { return &s }

	// Create a new assistant
	assistant, err := s.client.CreateAssistant(ctx, openai.AssistantRequest{
		Name:  strPtr("Process Manager Assistant"),
		Instructions: strPtr(`Tu es un assistant expert en gestion de processus pour Togocom, une entreprise de télécommunications.

Ton rôle est d'aider les utilisateurs à comprendre et à appliquer les procédures documentées dans le système de gestion des processus.

Compétences principales:
- Expliquer les étapes des processus en détail
- Fournir des astuces et bonnes pratiques
- Répondre aux questions sur les procédures
- Guider les utilisateurs sur l'exécution des processus
- Clarifier les rôles et responsabilités
- Aider à comprendre les délais et outputs attendus

Instructions:
1. Réponds toujours en français, de manière professionnelle mais accessible
2. Utilise les documents fournis comme référence principale
3. Si tu ne trouves pas l'information dans les documents, indique-le clairement
4. Fournis des exemples concrets quand c'est pertinent
5. Structure tes réponses de manière claire avec des listes ou étapes numérotées
6. Sois concis mais complet dans tes explications

Contexte: Les documents que tu consultes sont des procédures de Togocom couvrant la gestion des incidents, la surveillance réseau, la restauration de service, et autres processus opérationnels.`),
		Model: "gpt-4-turbo-preview",
		Tools: []openai.AssistantTool{
			{Type: openai.AssistantToolTypeFileSearch},
		},
	})

	if err != nil {
		return fmt.Errorf("failed to create assistant: %w", err)
	}

	s.assistantID = assistant.ID
	log.Printf("✅ Created new OpenAI Assistant: %s", assistant.ID)
	log.Printf("⚠️  Save this ID in your environment: OPENAI_ASSISTANT_ID=%s", assistant.ID)

	return nil
}

// UploadDocument uploads a PDF document to OpenAI and attaches it to the assistant's vector store
func (s *OpenAIService) UploadDocument(ctx context.Context, filePath string, documentID string) error {
	// Open the file
	file, err := os.Open(filePath)
	if err != nil {
		return fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	// Upload file to OpenAI
	uploadedFile, err := s.client.CreateFile(ctx, openai.FileRequest{
		FileName: fmt.Sprintf("process_%s.pdf", documentID),
		FilePath: filePath,
		Purpose:  string(openai.PurposeAssistants),
	})

	if err != nil {
		return fmt.Errorf("failed to upload file to OpenAI: %w", err)
	}

	log.Printf("✅ Uploaded document to OpenAI: %s (File ID: %s)", documentID, uploadedFile.ID)

	// Get the assistant to access its vector store
	assistant, err := s.client.RetrieveAssistant(ctx, s.assistantID)
	if err != nil {
		return fmt.Errorf("failed to retrieve assistant: %w", err)
	}

	var vectorStoreID string

	// Check if assistant has a vector store
	if assistant.ToolResources != nil &&
	   assistant.ToolResources.FileSearch != nil &&
	   len(assistant.ToolResources.FileSearch.VectorStoreIDs) > 0 {
		vectorStoreID = assistant.ToolResources.FileSearch.VectorStoreIDs[0]
	} else {
		// Create a new vector store
		vectorStore, err := s.client.CreateVectorStore(ctx, openai.VectorStoreRequest{
			Name: "Process Documents",
		})
		if err != nil {
			return fmt.Errorf("failed to create vector store: %w", err)
		}
		vectorStoreID = vectorStore.ID

		// Update assistant with the new vector store
		_, err = s.client.ModifyAssistant(ctx, s.assistantID, openai.AssistantRequest{
			ToolResources: &openai.AssistantToolResource{
				FileSearch: &openai.AssistantToolFileSearch{
					VectorStoreIDs: []string{vectorStoreID},
				},
			},
		})
		if err != nil {
			return fmt.Errorf("failed to update assistant with vector store: %w", err)
		}

		log.Printf("✅ Created new vector store: %s", vectorStoreID)
	}

	// Add file to vector store
	_, err = s.client.CreateVectorStoreFile(ctx, vectorStoreID, openai.VectorStoreFileRequest{
		FileID: uploadedFile.ID,
	})

	if err != nil {
		return fmt.Errorf("failed to add file to vector store: %w", err)
	}

	log.Printf("✅ Added document %s to vector store %s", documentID, vectorStoreID)

	return nil
}

// UploadDocumentFromReader uploads a document from an io.Reader
func (s *OpenAIService) UploadDocumentFromReader(ctx context.Context, reader io.Reader, filename string, documentID string) error {
	// Create temporary file
	tempFile, err := os.CreateTemp("", "process_*.pdf")
	if err != nil {
		return fmt.Errorf("failed to create temp file: %w", err)
	}
	defer os.Remove(tempFile.Name())
	defer tempFile.Close()

	// Copy content to temp file
	if _, err := io.Copy(tempFile, reader); err != nil {
		return fmt.Errorf("failed to write to temp file: %w", err)
	}

	// Reset file pointer
	if _, err := tempFile.Seek(0, 0); err != nil {
		return fmt.Errorf("failed to seek temp file: %w", err)
	}

	// Upload using file path
	return s.UploadDocument(ctx, tempFile.Name(), documentID)
}

// SendMessage sends a message to the assistant and returns the response
func (s *OpenAIService) SendMessage(ctx context.Context, message string, threadID string) (string, string, error) {
	var thread openai.Thread
	var err error

	// Create or use existing thread
	if threadID == "" {
		thread, err = s.client.CreateThread(ctx, openai.ThreadRequest{})
		if err != nil {
			return "", "", fmt.Errorf("failed to create thread: %w", err)
		}
		threadID = thread.ID
	} else {
		thread, err = s.client.RetrieveThread(ctx, threadID)
		if err != nil {
			return "", "", fmt.Errorf("failed to retrieve thread: %w", err)
		}
	}

	// Add message to thread
	_, err = s.client.CreateMessage(ctx, threadID, openai.MessageRequest{
		Role:    openai.ChatMessageRoleUser,
		Content: message,
	})
	if err != nil {
		return "", "", fmt.Errorf("failed to create message: %w", err)
	}

	// Run the assistant
	run, err := s.client.CreateRun(ctx, threadID, openai.RunRequest{
		AssistantID: s.assistantID,
	})
	if err != nil {
		return "", "", fmt.Errorf("failed to create run: %w", err)
	}

	// Wait for completion with timeout
	timeout := time.After(30 * time.Second)
	ticker := time.NewTicker(500 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return "", "", ctx.Err()
		case <-timeout:
			return "", "", errors.New("timeout waiting for assistant response")
		case <-ticker.C:
			run, err = s.client.RetrieveRun(ctx, threadID, run.ID)
			if err != nil {
				return "", "", fmt.Errorf("failed to retrieve run: %w", err)
			}

			if run.Status == openai.RunStatusCompleted {
				// Helper function for string pointer
				strPtr := func(s string) *string { return &s }

				// Get the assistant's response
				messages, err := s.client.ListMessage(ctx, threadID, nil, nil, nil, nil, strPtr("desc"))
				if err != nil {
					return "", "", fmt.Errorf("failed to list messages: %w", err)
				}

				if len(messages.Messages) > 0 {
					lastMessage := messages.Messages[0]
					if len(lastMessage.Content) > 0 {
						content := lastMessage.Content[0]
						if content.Type == "text" && content.Text != nil {
							return content.Text.Value, threadID, nil
						}
					}
				}

				return "", threadID, errors.New("no response from assistant")
			}

			if run.Status == openai.RunStatusFailed ||
			   run.Status == openai.RunStatusCancelled ||
			   run.Status == openai.RunStatusExpired {
				return "", "", fmt.Errorf("run failed with status: %s", run.Status)
			}
		}
	}
}

// GetThreadMessages retrieves all messages from a thread
func (s *OpenAIService) GetThreadMessages(ctx context.Context, threadID string) ([]openai.Message, error) {
	if threadID == "" {
		return []openai.Message{}, nil
	}

	messagesList, err := s.client.ListMessage(ctx, threadID, nil, nil, nil, nil, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to list messages: %w", err)
	}

	return messagesList.Messages, nil
}

// DeleteThread deletes a conversation thread
func (s *OpenAIService) DeleteThread(ctx context.Context, threadID string) error {
	if threadID == "" {
		return nil
	}

	_, err := s.client.DeleteThread(ctx, threadID)
	if err != nil {
		return fmt.Errorf("failed to delete thread: %w", err)
	}

	return nil
}
