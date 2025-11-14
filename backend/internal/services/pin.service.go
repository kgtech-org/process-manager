package services

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"regexp"
	"time"

	"github.com/kodesonik/process-manager/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"
)

const (
	// MaxPinAttempts is the maximum number of failed PIN attempts before locking
	MaxPinAttempts = 5
	// PinLockDuration is how long a PIN is locked after max failed attempts (15 minutes)
	PinLockDuration = 15 * time.Minute
	// PinCost is the bcrypt cost for PIN hashing
	PinCost = 12
)

// Common PIN patterns to reject
var commonPins = []string{
	"000000", "111111", "222222", "333333", "444444",
	"555555", "666666", "777777", "888888", "999999",
	"123456", "654321", "123123", "111222", "112233",
	"121212", "123321", "102030", "010203",
}

// PinService handles PIN authentication operations
type PinService struct {
	db             *DatabaseService
	userCollection *mongo.Collection
	otpService     *OTPService
}

// NewPinService creates a new PIN service instance
func NewPinService(db *DatabaseService, otpService *OTPService) *PinService {
	return &PinService{
		db:             db,
		userCollection: db.Collection("users"),
		otpService:     otpService,
	}
}

// ============================================
// PIN Validation
// ============================================

// ValidatePin validates PIN format and security requirements
func (s *PinService) ValidatePin(pin string) error {
	// Check length
	if len(pin) != 6 {
		return fmt.Errorf("PIN must be exactly 6 digits")
	}

	// Check if all characters are digits
	matched, _ := regexp.MatchString("^[0-9]{6}$", pin)
	if !matched {
		return fmt.Errorf("PIN must contain only numbers")
	}

	// Check for common/weak PINs
	for _, commonPin := range commonPins {
		if pin == commonPin {
			return fmt.Errorf("this PIN is too common, please choose a different one")
		}
	}

	// Check for sequential patterns (ascending/descending)
	if isSequential(pin) {
		return fmt.Errorf("PIN cannot be sequential (e.g., 123456 or 654321)")
	}

	return nil
}

// isSequential checks if PIN is a sequential pattern
func isSequential(pin string) bool {
	// Check ascending (e.g., 123456, 234567)
	isAscending := true
	for i := 0; i < len(pin)-1; i++ {
		if pin[i+1] != pin[i]+1 {
			isAscending = false
			break
		}
	}
	if isAscending {
		return true
	}

	// Check descending (e.g., 654321, 543210)
	isDescending := true
	for i := 0; i < len(pin)-1; i++ {
		if pin[i+1] != pin[i]-1 {
			isDescending = false
			break
		}
	}
	return isDescending
}

// ============================================
// PIN Hashing & Verification
// ============================================

// generateSalt creates a random salt for additional PIN security
func (s *PinService) generateSalt() (string, error) {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(bytes), nil
}

// HashPin hashes a PIN with bcrypt and adds salt
func (s *PinService) HashPin(pin string) (hash string, salt string, err error) {
	// Generate salt
	salt, err = s.generateSalt()
	if err != nil {
		return "", "", fmt.Errorf("failed to generate salt: %w", err)
	}

	// Combine PIN with salt before hashing
	saltedPin := pin + salt

	// Hash with bcrypt
	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(saltedPin), PinCost)
	if err != nil {
		return "", "", fmt.Errorf("failed to hash PIN: %w", err)
	}

	return string(hashedBytes), salt, nil
}

// ComparePin compares a PIN with its hash using the stored salt
func (s *PinService) ComparePin(pin, hash, salt string) bool {
	saltedPin := pin + salt
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(saltedPin))
	return err == nil
}

// ============================================
// PIN Lock Management
// ============================================

// IsLocked checks if a user's PIN is locked due to failed attempts
func (s *PinService) IsLocked(ctx context.Context, email string) (bool, error) {
	var user models.User
	err := s.userCollection.FindOne(ctx, bson.M{"email": email}).Decode(&user)
	if err != nil {
		return false, err
	}

	// Check if locked and if lock duration has passed
	if user.PinLockedAt != nil {
		lockExpiry := user.PinLockedAt.Add(PinLockDuration)
		if time.Now().Before(lockExpiry) {
			return true, nil
		}
		// Lock has expired, unlock automatically
		_ = s.UnlockPin(ctx, email)
	}

	return false, nil
}

// UnlockPin unlocks a user's PIN and resets attempt counter
func (s *PinService) UnlockPin(ctx context.Context, email string) error {
	_, err := s.userCollection.UpdateOne(
		ctx,
		bson.M{"email": email},
		bson.M{
			"$set": bson.M{
				"pin_locked_at": nil,
				"pin_attempts":  0,
				"updated_at":    time.Now(),
			},
		},
	)
	return err
}

// ============================================
// PIN Operations
// ============================================

// SetPin sets or updates a user's PIN
func (s *PinService) SetPin(ctx context.Context, userID primitive.ObjectID, pin, confirmPin string) error {
	// Validate PINs match
	if pin != confirmPin {
		return fmt.Errorf("PINs do not match")
	}

	// Validate PIN format and security
	if err := s.ValidatePin(pin); err != nil {
		return err
	}

	// Hash PIN
	hash, salt, err := s.HashPin(pin)
	if err != nil {
		return err
	}

	// Update user with PIN
	now := time.Now()
	_, err = s.userCollection.UpdateOne(
		ctx,
		bson.M{"_id": userID},
		bson.M{
			"$set": bson.M{
				"pin_hash":      hash,
				"pin_salt":      salt,
				"has_pin":       true,
				"pin_set_at":    now,
				"pin_attempts":  0,
				"pin_locked_at": nil,
				"updated_at":    now,
			},
		},
	)

	return err
}

// VerifyPin verifies a user's PIN and handles failed attempts
func (s *PinService) VerifyPin(ctx context.Context, email, pin string) (*models.User, error) {
	// Get user
	var user models.User
	err := s.userCollection.FindOne(ctx, bson.M{"email": email}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, fmt.Errorf("user not found")
		}
		return nil, err
	}

	// Check if user has PIN set up
	if !user.HasPin {
		return nil, fmt.Errorf("user has not set up PIN authentication")
	}

	// Check if PIN is locked
	isLocked, err := s.IsLocked(ctx, email)
	if err != nil {
		return nil, err
	}
	if isLocked {
		timeRemaining := user.PinLockedAt.Add(PinLockDuration).Sub(time.Now())
		return nil, fmt.Errorf("PIN is locked due to too many failed attempts. Please try again in %d minutes or reset your PIN", int(timeRemaining.Minutes())+1)
	}

	// Verify PIN
	if !s.ComparePin(pin, user.PinHash, user.PinSalt) {
		// Increment failed attempts
		newAttempts := user.PinAttempts + 1
		update := bson.M{
			"pin_attempts": newAttempts,
			"updated_at":   time.Now(),
		}

		// Lock if max attempts reached
		if newAttempts >= MaxPinAttempts {
			update["pin_locked_at"] = time.Now()
		}

		_, _ = s.userCollection.UpdateOne(
			ctx,
			bson.M{"_id": user.ID},
			bson.M{"$set": update},
		)

		attemptsRemaining := MaxPinAttempts - newAttempts
		if attemptsRemaining <= 0 {
			return nil, fmt.Errorf("invalid PIN. Your account has been locked for %d minutes", int(PinLockDuration.Minutes()))
		}
		return nil, fmt.Errorf("invalid PIN. %d attempts remaining", attemptsRemaining)
	}

	// PIN is correct, reset attempts and update last login
	now := time.Now()
	_, err = s.userCollection.UpdateOne(
		ctx,
		bson.M{"_id": user.ID},
		bson.M{
			"$set": bson.M{
				"pin_attempts": 0,
				"last_login":   now,
				"updated_at":   now,
			},
		},
	)
	if err != nil {
		return nil, err
	}

	// Reload user with updated data
	err = s.userCollection.FindOne(ctx, bson.M{"_id": user.ID}).Decode(&user)
	if err != nil {
		return nil, err
	}

	return &user, nil
}

// ResetPin resets a user's PIN after OTP verification
func (s *PinService) ResetPin(ctx context.Context, email, otp, newPin, confirmPin string) error {
	// Verify OTP first
	err := s.otpService.VerifyOTP(ctx, email, otp)
	if err != nil {
		return fmt.Errorf("invalid or expired OTP: %w", err)
	}

	// Get user
	var user models.User
	err = s.userCollection.FindOne(ctx, bson.M{"email": email}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return fmt.Errorf("user not found")
		}
		return err
	}

	// Validate new PINs match
	if newPin != confirmPin {
		return fmt.Errorf("PINs do not match")
	}

	// Validate new PIN
	if err := s.ValidatePin(newPin); err != nil {
		return err
	}

	// Hash new PIN
	hash, salt, err := s.HashPin(newPin)
	if err != nil {
		return err
	}

	// Update user with new PIN and unlock
	now := time.Now()
	_, err = s.userCollection.UpdateOne(
		ctx,
		bson.M{"_id": user.ID},
		bson.M{
			"$set": bson.M{
				"pin_hash":      hash,
				"pin_salt":      salt,
				"has_pin":       true,
				"pin_set_at":    now,
				"pin_attempts":  0,
				"pin_locked_at": nil,
				"updated_at":    now,
			},
		},
	)

	return err
}

// CheckPinStatus checks if a user has PIN set up and if it's locked
func (s *PinService) CheckPinStatus(ctx context.Context, email string) (hasPin bool, isLocked bool, err error) {
	var user models.User
	err = s.userCollection.FindOne(ctx, bson.M{"email": email}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return false, false, fmt.Errorf("user not found")
		}
		return false, false, err
	}

	hasPin = user.HasPin
	isLocked, err = s.IsLocked(ctx, email)

	return hasPin, isLocked, err
}
