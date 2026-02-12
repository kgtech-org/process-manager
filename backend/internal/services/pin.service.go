package services

import (
	"context"
	"errors"
	"time"

	"github.com/kodesonik/process-manager/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"
)

const (
	MaxPinAttempts  = 5
	PinLockDuration = 15 * time.Minute
)

type PinService struct {
	userCollection *mongo.Collection
}

func NewPinService(db *mongo.Database) *PinService {
	return &PinService{
		userCollection: db.Collection("users"),
	}
}

// SetPin hashes and stores the user's PIN
func (s *PinService) SetPin(ctx context.Context, userID primitive.ObjectID, pin string) error {
	// Hash the PIN
	hashedPin, err := bcrypt.GenerateFromPassword([]byte(pin), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	// Update user document
	update := bson.M{
		"$set": bson.M{
			"pin_hash":      string(hashedPin),
			"has_pin":       true,
			"pin_set_at":    time.Now(),
			"pin_attempts":  0,
			"pin_locked_at": nil,
		},
	}

	_, err = s.userCollection.UpdateOne(ctx, bson.M{"_id": userID}, update)
	return err
}

// VerifyPin verifies the PIN and handles failed attempts
func (s *PinService) VerifyPin(ctx context.Context, user *models.User, pin string) (bool, error) {
	// Check if locked
	if s.IsLocked(user) {
		return false, errors.New("account is locked due to too many failed attempts")
	}

	// Verify PIN
	err := bcrypt.CompareHashAndPassword([]byte(user.PinHash), []byte(pin))
	if err != nil {
		// Increment attempts
		s.incrementAttempts(ctx, user.ID)
		return false, errors.New("invalid PIN")
	}

	// Reset attempts on success
	s.resetAttempts(ctx, user.ID)
	return true, nil
}

// IsLocked checks if the account is locked
func (s *PinService) IsLocked(user *models.User) bool {
	if user.PinLockedAt == nil {
		return false
	}

	// Check if lock duration has passed
	if time.Since(*user.PinLockedAt) > PinLockDuration {
		return false
	}

	return true
}

func (s *PinService) incrementAttempts(ctx context.Context, userID primitive.ObjectID) error {
	// Find current attempts
	var user models.User
	err := s.userCollection.FindOne(ctx, bson.M{"_id": userID}).Decode(&user)
	if err != nil {
		return err
	}

	attempts := user.PinAttempts + 1
	update := bson.M{
		"$set": bson.M{"pin_attempts": attempts},
	}

	// Lock if max attempts reached
	if attempts >= MaxPinAttempts {
		now := time.Now()
		update["$set"].(bson.M)["pin_locked_at"] = now
	}

	_, err = s.userCollection.UpdateOne(ctx, bson.M{"_id": userID}, update)
	return err
}

func (s *PinService) resetAttempts(ctx context.Context, userID primitive.ObjectID) error {
	update := bson.M{
		"$set": bson.M{
			"pin_attempts":  0,
			"pin_locked_at": nil,
		},
	}
	_, err := s.userCollection.UpdateOne(ctx, bson.M{"_id": userID}, update)
	return err
}
