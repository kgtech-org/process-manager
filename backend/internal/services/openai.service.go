package services

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	openai "github.com/sashabaranov/go-openai"
)

const (
	// defaultOpenAIBaseURL is the API root used unless OPENAI_BASE_URL overrides it.
	defaultOpenAIBaseURL = "https://api.openai.com/v1"

	// defaultOpenAIModel is used unless OPENAI_MODEL overrides it.
	defaultOpenAIModel = "gpt-5.4-mini"

	// conversationIDPrefix marks a usable Conversations API identifier. Threads created
	// by the retired Assistants API were prefixed "thread_" and are no longer resolvable.
	conversationIDPrefix = "conv_"

	// responseTimeout bounds a single call to the Responses API.
	responseTimeout = 90 * time.Second

	// assistantInstructions is the persona sent on every response. It used to live on the
	// Assistant object, which the Responses API does not have.
	assistantInstructions = `Tu es un assistant expert en gestion de processus pour Togocom, une entreprise de télécommunications.

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

Contexte: Les documents que tu consultes sont des procédures de Togocom couvrant la gestion des incidents, la surveillance réseau, la restauration de service, et autres processus opérationnels.`
)

// OpenAIService handles OpenAI Responses API operations.
//
// It replaces the Assistants API (sunset on 2026-08-26): the assistant's persona is sent
// as per-call instructions, threads become Conversations, and runs become Responses.
// Documents keep living in a vector store queried through the hosted file_search tool.
type OpenAIService struct {
	client        *openai.Client
	httpClient    *http.Client
	apiKey        string
	baseURL       string
	model         string
	vectorStoreID string
}

// NewOpenAIService creates a new OpenAI service.
func NewOpenAIService() (*OpenAIService, error) {
	apiKey := os.Getenv("OPENAI_API_KEY")
	if apiKey == "" {
		return nil, errors.New("OPENAI_API_KEY environment variable is not set")
	}

	baseURL := os.Getenv("OPENAI_BASE_URL")
	if baseURL == "" {
		baseURL = defaultOpenAIBaseURL
	}
	baseURL = strings.TrimSuffix(baseURL, "/")

	model := os.Getenv("OPENAI_MODEL")
	if model == "" {
		model = defaultOpenAIModel
	}

	config := openai.DefaultConfig(apiKey)
	config.BaseURL = baseURL

	service := &OpenAIService{
		client:        openai.NewClientWithConfig(config),
		httpClient:    &http.Client{Timeout: 30 * time.Second},
		apiKey:        apiKey,
		baseURL:       baseURL,
		model:         model,
		vectorStoreID: os.Getenv("OPENAI_VECTOR_STORE_ID"),
	}

	if service.vectorStoreID != "" {
		log.Printf("✅ OpenAI service ready (model: %s, vector store: %s)", model, service.vectorStoreID)
	} else {
		log.Printf("✅ OpenAI service ready (model: %s, no vector store yet)", model)
	}

	return service, nil
}

// doJSON performs a raw JSON call against the OpenAI API. The Conversations endpoints have
// no binding in go-openai v1.42.0, so they are issued by hand.
func (s *OpenAIService) doJSON(ctx context.Context, method, path string, payload any, out any) error {
	var body io.Reader
	if payload != nil {
		encoded, err := json.Marshal(payload)
		if err != nil {
			return fmt.Errorf("failed to encode request: %w", err)
		}
		body = bytes.NewReader(encoded)
	}

	req, err := http.NewRequestWithContext(ctx, method, s.baseURL+path, body)
	if err != nil {
		return fmt.Errorf("failed to build request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+s.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("openai returned %d: %s", resp.StatusCode, strings.TrimSpace(string(raw)))
	}

	if out == nil {
		return nil
	}

	if err := json.Unmarshal(raw, out); err != nil {
		return fmt.Errorf("failed to decode response: %w", err)
	}

	return nil
}

// createConversation opens a new server-side conversation, the Responses API replacement
// for an Assistants thread.
func (s *OpenAIService) createConversation(ctx context.Context) (string, error) {
	var result struct {
		ID string `json:"id"`
	}

	if err := s.doJSON(ctx, http.MethodPost, "/conversations", map[string]any{}, &result); err != nil {
		return "", fmt.Errorf("failed to create conversation: %w", err)
	}

	if result.ID == "" {
		return "", errors.New("conversation created without an id")
	}

	return result.ID, nil
}

// DeleteConversation removes a conversation and its stored items. Identifiers that predate
// the Responses API no longer resolve, so they are skipped rather than reported as errors.
func (s *OpenAIService) DeleteConversation(ctx context.Context, conversationID string) error {
	if !isConversationID(conversationID) {
		return nil
	}

	if err := s.doJSON(ctx, http.MethodDelete, "/conversations/"+conversationID, nil, nil); err != nil {
		return fmt.Errorf("failed to delete conversation: %w", err)
	}

	return nil
}

// isConversationID reports whether an identifier can be used with the Conversations API.
func isConversationID(id string) bool {
	return strings.HasPrefix(id, conversationIDPrefix)
}

// ensureVectorStore returns the vector store backing file_search, creating it on first use.
func (s *OpenAIService) ensureVectorStore(ctx context.Context) (string, error) {
	if s.vectorStoreID != "" {
		return s.vectorStoreID, nil
	}

	vectorStore, err := s.client.CreateVectorStore(ctx, openai.VectorStoreRequest{
		Name: "Process Documents",
	})
	if err != nil {
		return "", fmt.Errorf("failed to create vector store: %w", err)
	}

	s.vectorStoreID = vectorStore.ID
	log.Printf("✅ Created new vector store: %s", vectorStore.ID)
	log.Printf("⚠️  Save this ID in your environment: OPENAI_VECTOR_STORE_ID=%s", vectorStore.ID)

	return vectorStore.ID, nil
}

// UploadDocument uploads a document to OpenAI and adds it to the vector store used by
// the file_search tool.
func (s *OpenAIService) UploadDocument(ctx context.Context, filePath string, uploadFileName string, documentID string) error {
	// Open the file
	file, err := os.Open(filePath)
	if err != nil {
		return fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	// Upload file to OpenAI
	uploadedFile, err := s.client.CreateFile(ctx, openai.FileRequest{
		FileName: uploadFileName,
		FilePath: filePath,
		Purpose:  string(openai.PurposeAssistants),
	})

	if err != nil {
		return fmt.Errorf("failed to upload file to OpenAI: %w", err)
	}

	log.Printf("✅ Uploaded document to OpenAI: %s (File ID: %s)", uploadFileName, uploadedFile.ID)

	vectorStoreID, err := s.ensureVectorStore(ctx)
	if err != nil {
		return err
	}

	// Add file to vector store
	_, err = s.client.CreateVectorStoreFile(ctx, vectorStoreID, openai.VectorStoreFileRequest{
		FileID: uploadedFile.ID,
	})

	if err != nil {
		return fmt.Errorf("failed to add file to vector store: %w", err)
	}

	log.Printf("✅ Added document %s to vector store %s", uploadFileName, vectorStoreID)

	return nil
}

// UploadDocumentFromReader uploads a document from an io.Reader
func (s *OpenAIService) UploadDocumentFromReader(ctx context.Context, reader io.Reader, filename string, documentID string) error {
	// Create temporary file with meaningful prefix/suffix if possible
	// We'll use "upload-*.ext" pattern if filename has extension
	// But os.CreateTemp pattern "pattern*" puts random string at the end.
	// So we use "upload-*"
	ext := filepath.Ext(filename)
	if ext == "" {
		ext = ".tmp"
	}
	pattern := fmt.Sprintf("process_upload_*%s", ext)
	tempFile, err := os.CreateTemp("", pattern)
	if err != nil {
		return fmt.Errorf("failed to create temp file: %w", err)
	}
	defer os.Remove(tempFile.Name())

	// Copy content to temp file
	if _, err := io.Copy(tempFile, reader); err != nil {
		tempFile.Close()
		return fmt.Errorf("failed to write to temp file: %w", err)
	}

	// Close the file to flush changes to disk
	if err := tempFile.Close(); err != nil {
		return fmt.Errorf("failed to close temp file: %w", err)
	}

	// Upload using file path, passing the desired filename
	return s.UploadDocument(ctx, tempFile.Name(), filename, documentID)
}

// SendMessage sends a message to the model and returns its reply along with the
// conversation it belongs to.
//
// conversationID may be empty (a conversation is then opened) or hold a stale Assistants
// thread ID, which is discarded the same way. userContext is an optional string with the
// user's department and job position, appended to the persona so replies can be tailored.
func (s *OpenAIService) SendMessage(ctx context.Context, message string, conversationID string, userContext string) (string, string, error) {
	ctx, cancel := context.WithTimeout(ctx, responseTimeout)
	defer cancel()

	if !isConversationID(conversationID) {
		newID, err := s.createConversation(ctx)
		if err != nil {
			return "", "", err
		}
		conversationID = newID
	}

	instructions := assistantInstructions
	if userContext != "" {
		instructions = instructions + "\n\n" + userContext
	}

	request := openai.CreateResponseRequest{
		Model:        s.model,
		Conversation: conversationID,
		Instructions: instructions,
		Input:        message,
	}

	if s.vectorStoreID != "" {
		request.Tools = []openai.ResponseTool{{
			Type: "file_search",
			Parameters: map[string]any{
				"vector_store_ids": []string{s.vectorStoreID},
			},
		}}
	}

	response, err := s.client.CreateResponse(ctx, request)
	if err != nil {
		return "", "", fmt.Errorf("failed to create response: %w", err)
	}

	reply := strings.TrimSpace(response.GetOutputText())
	if reply == "" {
		return "", conversationID, errors.New("no response from assistant")
	}

	return reply, conversationID, nil
}
