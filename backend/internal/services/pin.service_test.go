package services_test

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/kodesonik/process-manager/internal/models"
	"github.com/kodesonik/process-manager/internal/services"
	"github.com/stretchr/testify/assert"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const (
	testMongoURI = "mongodb://kodesonik:Forzaa12@localhost:27017/process_manager_test?authSource=admin"
)

func setupTestDB(t *testing.T) (*mongo.Client, *mongo.Database, func()) {
	// Skip if running in short mode
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Connect to MongoDB
	// Note: User/Pass must match docker-compose. Using default from docker-compose.dev.yml
	uri := os.Getenv("MONGODB_URI")
	if uri == "" {
		uri = testMongoURI
	}

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		t.Fatalf("Failed to connect to MongoDB: %v", err)
	}

	db := client.Database("process_manager_test_" + primitive.NewObjectID().Hex())

	cleanup := func() {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := db.Drop(ctx); err != nil {
			fmt.Printf("Failed to drop test database: %v\n", err)
		}
		if err := client.Disconnect(ctx); err != nil {
			fmt.Printf("Failed to disconnect from MongoDB: %v\n", err)
		}
	}

	return client, db, cleanup
}

func TestPinService_Integration(t *testing.T) {
	_, db, cleanup := setupTestDB(t)
	defer cleanup()

	pinService := services.NewPinService(db)
	userCollection := db.Collection("users")

	ctx := context.Background()

	// Create a test user
	userID := primitive.NewObjectID()
	user := &models.User{
		ID:       userID,
		Email:    "testpin@example.com",
		Active:   true,
		Verified: true,
	}
	_, err := userCollection.InsertOne(ctx, user)
	assert.NoError(t, err)

	t.Run("SetPin", func(t *testing.T) {
		err := pinService.SetPin(ctx, userID, "123456")
		assert.NoError(t, err)

		// Verify user update
		var updatedUser models.User
		err = userCollection.FindOne(ctx, bson.M{"_id": userID}).Decode(&updatedUser)
		assert.NoError(t, err)
		assert.True(t, updatedUser.HasPin)
		assert.NotEmpty(t, updatedUser.PinHash)
		assert.Equal(t, 0, updatedUser.PinAttempts)
	})

	t.Run("VerifyPin_Success", func(t *testing.T) {
		// Get fresh user
		var freshUser models.User
		err := userCollection.FindOne(ctx, bson.M{"_id": userID}).Decode(&freshUser)
		assert.NoError(t, err)

		valid, err := pinService.VerifyPin(ctx, &freshUser, "123456")
		assert.NoError(t, err)
		assert.True(t, valid)

		// Verify attempts reset
		err = userCollection.FindOne(ctx, bson.M{"_id": userID}).Decode(&freshUser)
		assert.NoError(t, err)
		assert.Equal(t, 0, freshUser.PinAttempts)
	})

	t.Run("VerifyPin_Failure", func(t *testing.T) {
		// Get fresh user
		var freshUser models.User
		err := userCollection.FindOne(ctx, bson.M{"_id": userID}).Decode(&freshUser)
		assert.NoError(t, err)

		valid, err := pinService.VerifyPin(ctx, &freshUser, "000000")
		assert.Error(t, err)
		assert.False(t, valid)
		assert.Equal(t, "invalid PIN", err.Error())

		// Verify attempts incremented
		err = userCollection.FindOne(ctx, bson.M{"_id": userID}).Decode(&freshUser)
		assert.NoError(t, err)
		assert.Equal(t, 1, freshUser.PinAttempts)
	})

	t.Run("VerifyPin_Locking", func(t *testing.T) {
		// Reset attempts for this test
		_, err := userCollection.UpdateOne(ctx, bson.M{"_id": userID}, bson.M{"$set": bson.M{"pin_attempts": 0}})
		assert.NoError(t, err)

		var freshUser models.User
		// Fail 5 times
		for i := 0; i < 5; i++ {
			err = userCollection.FindOne(ctx, bson.M{"_id": userID}).Decode(&freshUser)
			assert.NoError(t, err)
			_, err = pinService.VerifyPin(ctx, &freshUser, "999999")
			assert.Error(t, err)
		}

		// Verify locked
		err = userCollection.FindOne(ctx, bson.M{"_id": userID}).Decode(&freshUser)
		assert.NoError(t, err)
		assert.Equal(t, 5, freshUser.PinAttempts)
		assert.NotNil(t, freshUser.PinLockedAt)
		assert.True(t, pinService.IsLocked(&freshUser))

		// Verify subsequent attempt fails with lock message
		valid, err := pinService.VerifyPin(ctx, &freshUser, "123456") // Correct PIN
		assert.Error(t, err)
		assert.False(t, valid)
		assert.Contains(t, err.Error(), "account is locked")
	})
}
