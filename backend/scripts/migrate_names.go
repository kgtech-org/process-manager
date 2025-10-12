package main

import (
	"context"
	"log"
	"os"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// OldUser represents the old user structure with name field
type OldUser struct {
	ID   interface{} `bson:"_id"`
	Name string      `bson:"name"`
}

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

	// Get users collection
	collection := client.Database(dbName).Collection("users")

	// Find all users with the old 'name' field
	cursor, err := collection.Find(ctx, bson.M{"name": bson.M{"$exists": true}})
	if err != nil {
		log.Fatalf("Failed to find users: %v", err)
	}
	defer cursor.Close(ctx)

	updated := 0
	failed := 0

	// Iterate through all users
	for cursor.Next(ctx) {
		var user OldUser
		if err := cursor.Decode(&user); err != nil {
			log.Printf("Failed to decode user: %v", err)
			failed++
			continue
		}

		// Skip if name is empty
		if user.Name == "" {
			log.Printf("Skipping user %v: empty name", user.ID)
			continue
		}

		// Split the name
		firstName, lastName := splitName(user.Name)

		// Update the user with firstName and lastName, remove old name field
		update := bson.M{
			"$set": bson.M{
				"first_name": firstName,
				"last_name":  lastName,
				"updated_at": time.Now(),
			},
			"$unset": bson.M{
				"name": "",
			},
		}

		result, err := collection.UpdateOne(
			ctx,
			bson.M{"_id": user.ID},
			update,
		)

		if err != nil {
			log.Printf("Failed to update user %v: %v", user.ID, err)
			failed++
			continue
		}

		if result.ModifiedCount > 0 {
			log.Printf("✓ Updated user %v: '%s' -> firstName: '%s', lastName: '%s'",
				user.ID, user.Name, firstName, lastName)
			updated++
		}
	}

	if err := cursor.Err(); err != nil {
		log.Fatalf("Cursor error: %v", err)
	}

	// Summary
	log.Println("\n" + strings.Repeat("=", 50))
	log.Printf("Migration completed!")
	log.Printf("Successfully updated: %d users", updated)
	if failed > 0 {
		log.Printf("Failed: %d users", failed)
	}
	log.Println(strings.Repeat("=", 50))
}

// splitName splits a full name into firstName and lastName
func splitName(fullName string) (firstName, lastName string) {
	// Trim whitespace
	fullName = strings.TrimSpace(fullName)

	// Split by spaces
	parts := strings.Fields(fullName)

	if len(parts) == 0 {
		return "Unknown", "User"
	}

	if len(parts) == 1 {
		// Only one name provided, use it as both first and last
		return parts[0], parts[0]
	}

	// First part is firstName, everything else is lastName
	firstName = parts[0]
	lastName = strings.Join(parts[1:], " ")

	return firstName, lastName
}
