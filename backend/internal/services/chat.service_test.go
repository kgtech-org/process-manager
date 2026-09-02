package services_test

import (
	"context"
	"net/http"
	"testing"
	"time"

	"github.com/kodesonik/process-manager/internal/models"
	"github.com/kodesonik/process-manager/internal/services"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

func countMessages(t *testing.T, db *mongo.Database, threadID primitive.ObjectID) int64 {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	count, err := db.Collection("chat_messages").CountDocuments(ctx, bson.M{"thread_id": threadID})
	require.NoError(t, err)
	return count
}

func loadThreads(t *testing.T, db *mongo.Database) []models.ChatThread {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cursor, err := db.Collection("chat_threads").Find(ctx, bson.M{})
	require.NoError(t, err)

	var threads []models.ChatThread
	require.NoError(t, cursor.All(ctx, &threads))
	return threads
}

// Une panne d'OpenAI ne doit jamais coûter son message à l'utilisateur : la question
// est écrite en base avant l'appel, pour rester lisible et rejouable après l'échec.
func TestChatService_KeepsUserMessageWhenAssistantFails(t *testing.T) {
	_, db, cleanup := setupTestDB(t)
	defer cleanup()

	fake := newFakeOpenAI(t)
	fake.responseStatus = http.StatusTooManyRequests
	fake.responseBody = `{"error":{"message":"You have no credits remaining.","type":"insufficient_quota"}}`
	openai := newTestService(t, fake)

	chat := services.NewChatService(db, openai)
	userID := primitive.NewObjectID()

	_, err := chat.SendMessage(context.Background(), userID, &models.CreateChatMessageRequest{
		Message: "Comment traiter un incident réseau ?",
	})

	require.Error(t, err, "the caller must learn the assistant failed")

	threads := loadThreads(t, db)
	require.Len(t, threads, 1, "the thread must survive the failure")
	assert.Equal(t, userID, threads[0].UserID)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var saved models.ChatMessage
	err = db.Collection("chat_messages").
		FindOne(ctx, bson.M{"thread_id": threads[0].ID, "role": "user"}).
		Decode(&saved)
	require.NoError(t, err, "the user message must be persisted even though the reply never came")
	assert.Equal(t, "Comment traiter un incident réseau ?", saved.Content)

	assert.Equal(t, int64(1), countMessages(t, db, threads[0].ID),
		"only the question is stored: there is no reply to store")
}

// L'échec ne doit pas abandonner une conversation vide chez OpenAI à chaque tentative.
func TestChatService_StoresConversationIDEvenWhenAssistantFails(t *testing.T) {
	_, db, cleanup := setupTestDB(t)
	defer cleanup()

	fake := newFakeOpenAI(t)
	fake.responseStatus = http.StatusTooManyRequests
	fake.responseBody = `{"error":{"message":"no credits","type":"insufficient_quota"}}`
	openai := newTestService(t, fake)

	chat := services.NewChatService(db, openai)

	_, err := chat.SendMessage(context.Background(), primitive.NewObjectID(), &models.CreateChatMessageRequest{
		Message: "Bonjour",
	})
	require.Error(t, err)

	threads := loadThreads(t, db)
	require.Len(t, threads, 1)
	assert.Equal(t, "conv_test123", threads[0].OpenAIConversationID,
		"the conversation opened upstream must be recorded so a retry reuses it")
}

func TestChatService_StoresBothMessagesOnSuccess(t *testing.T) {
	_, db, cleanup := setupTestDB(t)
	defer cleanup()

	openai := newTestService(t, newFakeOpenAI(t))
	chat := services.NewChatService(db, openai)

	response, err := chat.SendMessage(context.Background(), primitive.NewObjectID(), &models.CreateChatMessageRequest{
		Message: "Quelle est la procédure ?",
	})

	require.NoError(t, err)
	assert.Equal(t, "Bonjour, voici la procédure.", response.Message)

	threads := loadThreads(t, db)
	require.Len(t, threads, 1)
	assert.Equal(t, 2, threads[0].MessageCount)
	assert.Equal(t, "Bonjour, voici la procédure.", threads[0].LastMessage)
	assert.Equal(t, int64(2), countMessages(t, db, threads[0].ID))
}

// Un second message doit rejoindre le fil existant, pas en ouvrir un nouveau.
func TestChatService_AppendsToExistingThread(t *testing.T) {
	_, db, cleanup := setupTestDB(t)
	defer cleanup()

	openai := newTestService(t, newFakeOpenAI(t))
	chat := services.NewChatService(db, openai)
	userID := primitive.NewObjectID()

	first, err := chat.SendMessage(context.Background(), userID, &models.CreateChatMessageRequest{
		Message: "Première question",
	})
	require.NoError(t, err)

	_, err = chat.SendMessage(context.Background(), userID, &models.CreateChatMessageRequest{
		ThreadID: &first.ThreadID,
		Message:  "Seconde question",
	})
	require.NoError(t, err)

	threads := loadThreads(t, db)
	require.Len(t, threads, 1, "both messages belong to the same thread")
	assert.Equal(t, 4, threads[0].MessageCount)
	assert.Equal(t, int64(4), countMessages(t, db, threads[0].ID))
}
