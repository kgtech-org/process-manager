package services

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/kodesonik/process-manager/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type ChatService struct {
	threadCollection  *mongo.Collection
	messageCollection *mongo.Collection
	openaiService     *OpenAIService
}

func NewChatService(db *mongo.Database, openaiService *OpenAIService) *ChatService {
	return &ChatService{
		threadCollection:  db.Collection("chat_threads"),
		messageCollection: db.Collection("chat_messages"),
		openaiService:     openaiService,
	}
}

// SendMessage sends a message and gets a response from the assistant
func (s *ChatService) SendMessage(ctx context.Context, userID primitive.ObjectID, req *models.CreateChatMessageRequest) (*models.ChatMessageResponse, error) {
	if s.openaiService == nil {
		return nil, fmt.Errorf("OpenAI service is not available")
	}

	var thread *models.ChatThread
	var err error
	var openaiThreadID string

	// Get or create thread
	if req.ThreadID != nil && *req.ThreadID != "" {
		threadObjID, err := primitive.ObjectIDFromHex(*req.ThreadID)
		if err != nil {
			return nil, fmt.Errorf("invalid thread ID: %w", err)
		}

		thread, err = s.GetThread(ctx, threadObjID, userID)
		if err != nil {
			return nil, err
		}
		openaiThreadID = thread.OpenAIThreadID
	}

	// Save user message to database
	userMessage := &models.ChatMessage{
		ID:        primitive.NewObjectID(),
		Role:      "user",
		Content:   req.Message,
		CreatedAt: time.Now(),
	}

	// Send message to OpenAI and get response
	assistantResponse, newOpenAIThreadID, err := s.openaiService.SendMessage(ctx, req.Message, openaiThreadID)
	if err != nil {
		return nil, fmt.Errorf("failed to get response from assistant: %w", err)
	}

	// If this is a new thread, create it in database
	if thread == nil {
		// Generate title from first message (first 50 chars)
		title := req.Message
		if len(title) > 50 {
			title = title[:50] + "..."
		}

		thread = &models.ChatThread{
			ID:             primitive.NewObjectID(),
			UserID:         userID,
			OpenAIThreadID: newOpenAIThreadID,
			Title:          title,
			LastMessage:    assistantResponse,
			MessageCount:   2, // user message + assistant response
			CreatedAt:      time.Now(),
			UpdatedAt:      time.Now(),
		}

		_, err = s.threadCollection.InsertOne(ctx, thread)
		if err != nil {
			return nil, fmt.Errorf("failed to create thread: %w", err)
		}

		// Set thread ID for messages
		userMessage.ThreadID = thread.ID
	} else {
		// Update existing thread
		userMessage.ThreadID = thread.ID

		_, err = s.threadCollection.UpdateOne(
			ctx,
			bson.M{"_id": thread.ID},
			bson.M{
				"$set": bson.M{
					"last_message": assistantResponse,
					"updated_at":   time.Now(),
				},
				"$inc": bson.M{
					"message_count": 2, // user message + assistant response
				},
			},
		)
		if err != nil {
			return nil, fmt.Errorf("failed to update thread: %w", err)
		}
	}

	// Save user message
	_, err = s.messageCollection.InsertOne(ctx, userMessage)
	if err != nil {
		return nil, fmt.Errorf("failed to save user message: %w", err)
	}

	// Save assistant message
	assistantMessage := &models.ChatMessage{
		ID:        primitive.NewObjectID(),
		ThreadID:  thread.ID,
		Role:      "assistant",
		Content:   assistantResponse,
		CreatedAt: time.Now(),
	}

	_, err = s.messageCollection.InsertOne(ctx, assistantMessage)
	if err != nil {
		return nil, fmt.Errorf("failed to save assistant message: %w", err)
	}

	return &models.ChatMessageResponse{
		ThreadID: thread.ID.Hex(),
		Message:  assistantResponse,
		Role:     "assistant",
	}, nil
}

// GetThread retrieves a thread by ID and verifies ownership
func (s *ChatService) GetThread(ctx context.Context, threadID primitive.ObjectID, userID primitive.ObjectID) (*models.ChatThread, error) {
	var thread models.ChatThread

	err := s.threadCollection.FindOne(ctx, bson.M{
		"_id":     threadID,
		"user_id": userID,
	}).Decode(&thread)

	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, fmt.Errorf("thread not found")
		}
		return nil, err
	}

	return &thread, nil
}

// GetThreadWithMessages retrieves a thread with its messages
func (s *ChatService) GetThreadWithMessages(ctx context.Context, threadID primitive.ObjectID, userID primitive.ObjectID) (*models.ChatThreadResponse, error) {
	thread, err := s.GetThread(ctx, threadID, userID)
	if err != nil {
		return nil, err
	}

	// Get messages
	cursor, err := s.messageCollection.Find(ctx, bson.M{
		"thread_id": threadID,
	}, options.Find().SetSort(bson.M{"created_at": 1}))

	if err != nil {
		return nil, fmt.Errorf("failed to get messages: %w", err)
	}
	defer cursor.Close(ctx)

	var messages []models.ChatMessage
	if err = cursor.All(ctx, &messages); err != nil {
		return nil, fmt.Errorf("failed to decode messages: %w", err)
	}

	return &models.ChatThreadResponse{
		Thread:   *thread,
		Messages: messages,
	}, nil
}

// GetUserThreads retrieves all threads for a user
func (s *ChatService) GetUserThreads(ctx context.Context, userID primitive.ObjectID) ([]models.ChatThread, error) {
	cursor, err := s.threadCollection.Find(ctx, bson.M{
		"user_id": userID,
	}, options.Find().SetSort(bson.M{"updated_at": -1}))

	if err != nil {
		return nil, fmt.Errorf("failed to get threads: %w", err)
	}
	defer cursor.Close(ctx)

	var threads []models.ChatThread
	if err = cursor.All(ctx, &threads); err != nil {
		return nil, fmt.Errorf("failed to decode threads: %w", err)
	}

	return threads, nil
}

// DeleteThread deletes a thread and all its messages
func (s *ChatService) DeleteThread(ctx context.Context, threadID primitive.ObjectID, userID primitive.ObjectID) error {
	// Verify ownership
	thread, err := s.GetThread(ctx, threadID, userID)
	if err != nil {
		return err
	}

	// Delete from OpenAI
	if s.openaiService != nil && thread.OpenAIThreadID != "" {
		err = s.openaiService.DeleteThread(ctx, thread.OpenAIThreadID)
		if err != nil {
			// Log but don't fail
			fmt.Printf("⚠️  Failed to delete OpenAI thread: %v\n", err)
		}
	}

	// Delete all messages
	_, err = s.messageCollection.DeleteMany(ctx, bson.M{
		"thread_id": threadID,
	})
	if err != nil {
		return fmt.Errorf("failed to delete messages: %w", err)
	}

	// Delete thread
	_, err = s.threadCollection.DeleteOne(ctx, bson.M{
		"_id":     threadID,
		"user_id": userID,
	})
	if err != nil {
		return fmt.Errorf("failed to delete thread: %w", err)
	}

	return nil
}

// UpdateThreadTitle updates the title of a thread
func (s *ChatService) UpdateThreadTitle(ctx context.Context, threadID primitive.ObjectID, userID primitive.ObjectID, title string) error {
	// Validate title
	title = strings.TrimSpace(title)
	if title == "" {
		return fmt.Errorf("title cannot be empty")
	}
	if len(title) > 100 {
		return fmt.Errorf("title is too long (max 100 characters)")
	}

	// Update thread
	result, err := s.threadCollection.UpdateOne(
		ctx,
		bson.M{
			"_id":     threadID,
			"user_id": userID,
		},
		bson.M{
			"$set": bson.M{
				"title":      title,
				"updated_at": time.Now(),
			},
		},
	)

	if err != nil {
		return fmt.Errorf("failed to update thread: %w", err)
	}

	if result.MatchedCount == 0 {
		return fmt.Errorf("thread not found")
	}

	return nil
}
