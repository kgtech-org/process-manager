package services

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// DatabaseService handles database connections and operations
type DatabaseService struct {
	Client   *mongo.Client
	Database *mongo.Database
}

var dbService *DatabaseService

// InitDatabase initializes the database connection
func InitDatabase() (*DatabaseService, error) {
	if dbService != nil {
		return dbService, nil
	}

	mongoURI := os.Getenv("MONGODB_URI")
	if mongoURI == "" {
		mongoURI = "mongodb://admin:password@localhost:27017/process_manager?authSource=admin"
	}

	dbName := os.Getenv("MONGODB_DATABASE")
	if dbName == "" {
		dbName = "process_manager"
	}

	// Set client options
	clientOptions := options.Client().ApplyURI(mongoURI)

	// Set connection timeout
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Connect to MongoDB
	client, err := mongo.Connect(ctx, clientOptions)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to MongoDB: %w", err)
	}

	// Test the connection
	err = client.Ping(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to ping MongoDB: %w", err)
	}

	database := client.Database(dbName)

	dbService = &DatabaseService{
		Client:   client,
		Database: database,
	}

	log.Printf("✅ Connected to MongoDB database: %s", dbName)

	// Create indexes
	if err := dbService.createIndexes(ctx); err != nil {
		log.Printf("Warning: Failed to create some indexes: %v", err)
	}

	return dbService, nil
}

// GetDatabase returns the database service instance
func GetDatabase() *DatabaseService {
	if dbService == nil {
		log.Fatal("Database not initialized. Call InitDatabase() first")
	}
	return dbService
}

// Close closes the database connection
func (ds *DatabaseService) Close(ctx context.Context) error {
	if ds.Client != nil {
		return ds.Client.Disconnect(ctx)
	}
	return nil
}

// createIndexes creates all necessary database indexes
func (ds *DatabaseService) createIndexes(ctx context.Context) error {
	// User collection indexes
	userCollection := ds.Database.Collection("users")

	// Unique index on email
	emailIndex := mongo.IndexModel{
		Keys:    bson.D{{Key: "email", Value: 1}},
		Options: options.Index().SetUnique(true),
	}

	// Compound index on active and role
	activeRoleIndex := mongo.IndexModel{
		Keys: bson.D{
			{Key: "active", Value: 1},
			{Key: "role", Value: 1},
		},
	}

	// Index on created_at for sorting
	createdAtIndex := mongo.IndexModel{
		Keys: bson.D{{Key: "created_at", Value: -1}},
	}

	userIndexes := []mongo.IndexModel{emailIndex, activeRoleIndex, createdAtIndex}

	_, err := userCollection.Indexes().CreateMany(ctx, userIndexes)
	if err != nil {
		log.Printf("Failed to create user indexes: %v", err)
		return err
	}

	// Password reset token collection indexes
	resetTokenCollection := ds.Database.Collection("password_reset_tokens")

	// Index on token for fast lookups
	tokenIndex := mongo.IndexModel{
		Keys: bson.D{{Key: "token", Value: 1}},
	}

	// TTL index to automatically delete expired tokens
	ttlIndex := mongo.IndexModel{
		Keys:    bson.D{{Key: "expires_at", Value: 1}},
		Options: options.Index().SetExpireAfterSeconds(0), // Delete when expires_at is reached
	}

	resetTokenIndexes := []mongo.IndexModel{tokenIndex, ttlIndex}

	_, err = resetTokenCollection.Indexes().CreateMany(ctx, resetTokenIndexes)
	if err != nil {
		log.Printf("Failed to create password reset token indexes: %v", err)
		return err
	}

	// Email verification token collection indexes
	verificationTokenCollection := ds.Database.Collection("email_verification_tokens")

	_, err = verificationTokenCollection.Indexes().CreateMany(ctx, resetTokenIndexes) // Same indexes as reset tokens
	if err != nil {
		log.Printf("Failed to create email verification token indexes: %v", err)
		return err
	}

	// Refresh token collection indexes
	refreshTokenCollection := ds.Database.Collection("refresh_tokens")

	// Index on token for fast lookups
	refreshTokenIndex := mongo.IndexModel{
		Keys: bson.D{{Key: "token", Value: 1}},
	}

	// Index on user_id for cleanup
	userIdIndex := mongo.IndexModel{
		Keys: bson.D{{Key: "user_id", Value: 1}},
	}

	// TTL index to automatically delete expired tokens
	refreshTtlIndex := mongo.IndexModel{
		Keys:    bson.D{{Key: "expires_at", Value: 1}},
		Options: options.Index().SetExpireAfterSeconds(0),
	}

	refreshTokenIndexes := []mongo.IndexModel{refreshTokenIndex, userIdIndex, refreshTtlIndex}

	_, err = refreshTokenCollection.Indexes().CreateMany(ctx, refreshTokenIndexes)
	if err != nil {
		log.Printf("Failed to create refresh token indexes: %v", err)
		return err
	}

	// Department collection indexes
	departmentCollection := ds.Database.Collection("departments")

	// Unique index on code
	deptCodeIndex := mongo.IndexModel{
		Keys:    bson.D{{Key: "code", Value: 1}},
		Options: options.Index().SetUnique(true),
	}

	// Index on active status
	deptActiveIndex := mongo.IndexModel{
		Keys: bson.D{{Key: "active", Value: 1}},
	}

	// Index on parent_id for hierarchical queries
	deptParentIndex := mongo.IndexModel{
		Keys: bson.D{{Key: "parent_id", Value: 1}},
	}

	departmentIndexes := []mongo.IndexModel{deptCodeIndex, deptActiveIndex, deptParentIndex}

	_, err = departmentCollection.Indexes().CreateMany(ctx, departmentIndexes)
	if err != nil {
		log.Printf("Failed to create department indexes: %v", err)
		return err
	}

	// Job Position collection indexes
	jobPositionCollection := ds.Database.Collection("job_positions")

	// Index on department_id for filtering by department
	jobDeptIndex := mongo.IndexModel{
		Keys: bson.D{{Key: "department_id", Value: 1}},
	}

	// Index on active status
	jobActiveIndex := mongo.IndexModel{
		Keys: bson.D{{Key: "active", Value: 1}},
	}

	// Compound index on department and active status
	jobDeptActiveIndex := mongo.IndexModel{
		Keys: bson.D{
			{Key: "department_id", Value: 1},
			{Key: "active", Value: 1},
		},
	}

	jobPositionIndexes := []mongo.IndexModel{jobDeptIndex, jobActiveIndex, jobDeptActiveIndex}

	_, err = jobPositionCollection.Indexes().CreateMany(ctx, jobPositionIndexes)
	if err != nil {
		log.Printf("Failed to create job position indexes: %v", err)
		return err
	}

	log.Printf("✅ Database indexes created successfully")
	return nil
}

// Collection returns a MongoDB collection
func (ds *DatabaseService) Collection(name string) *mongo.Collection {
	return ds.Database.Collection(name)
}

// Health checks database connectivity
func (ds *DatabaseService) Health(ctx context.Context) error {
	return ds.Client.Ping(ctx, nil)
}
