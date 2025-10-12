package main

import (
	"context"
	"log"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	// Get MongoDB connection string from environment
	mongoURI := os.Getenv("MONGODB_URI")
	if mongoURI == "" {
		mongoURI = "mongodb://localhost:27017"
	}

	dbName := os.Getenv("MONGODB_DATABASE")
	if dbName == "" {
		dbName = "process_manager"
	}

	// Connect to MongoDB
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatalf("Failed to connect to MongoDB: %v", err)
	}
	defer client.Disconnect(ctx)

	// Ping to verify connection
	if err := client.Ping(ctx, nil); err != nil {
		log.Fatalf("Failed to ping MongoDB: %v", err)
	}

	log.Println("✓ Connected to MongoDB")

	// Update the users collection schema
	db := client.Database(dbName)

	// Drop the existing validation
	log.Println("Removing old schema validation...")
	err = db.RunCommand(ctx, bson.D{
		{Key: "collMod", Value: "users"},
		{Key: "validator", Value: bson.M{}},
		{Key: "validationLevel", Value: "off"},
	}).Err()

	if err != nil {
		log.Printf("Warning: Failed to remove old validation: %v", err)
	} else {
		log.Println("✓ Old schema validation removed")
	}

	// Create new validation with firstName and lastName
	log.Println("Creating new schema validation with firstName and lastName...")

	newValidator := bson.M{
		"$jsonSchema": bson.M{
			"bsonType": "object",
			"required": []string{"email", "first_name", "last_name", "role", "active", "created_at"},
			"properties": bson.M{
				"email": bson.M{
					"bsonType":    "string",
					"description": "must be a string and is required",
				},
				"first_name": bson.M{
					"bsonType":    "string",
					"description": "must be a string and is required",
					"minLength":   2,
					"maxLength":   50,
				},
				"last_name": bson.M{
					"bsonType":    "string",
					"description": "must be a string and is required",
					"minLength":   2,
					"maxLength":   50,
				},
				"role": bson.M{
					"bsonType":    "string",
					"enum":        []string{"admin", "manager", "user"},
					"description": "must be one of: admin, manager, user",
				},
				"active": bson.M{
					"bsonType":    "bool",
					"description": "must be a boolean",
				},
			},
		},
	}

	err = db.RunCommand(ctx, bson.D{
		{Key: "collMod", Value: "users"},
		{Key: "validator", Value: newValidator},
		{Key: "validationLevel", Value: "moderate"},
	}).Err()

	if err != nil {
		log.Fatalf("Failed to create new validation: %v", err)
	}

	log.Println("✓ New schema validation created successfully")
	log.Println("\nSchema updated! You can now run the name migration script.")
}
