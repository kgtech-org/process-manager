package services

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/kodesonik/process-manager/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// UserService handles user-related database operations
type UserService struct {
	db                 *DatabaseService
	userCollection     *mongo.Collection
	resetTokens        *mongo.Collection
	verificationTokens *mongo.Collection
	refreshTokens      *mongo.Collection
}

// NewUserService creates a new user service instance
func NewUserService(db *DatabaseService) *UserService {
	return &UserService{
		db:                 db,
		userCollection:     db.Collection("users"),
		resetTokens:        db.Collection("password_reset_tokens"),
		verificationTokens: db.Collection("email_verification_tokens"),
		refreshTokens:      db.Collection("refresh_tokens"),
	}
}

// CreateUser creates a new user in the database
func (s *UserService) CreateUser(ctx context.Context, req *models.CreateUserRequest) (*models.User, error) {
	// Check if user with email already exists
	existingUser, err := s.GetUserByEmail(ctx, req.Email)
	if err == nil && existingUser != nil {
		return nil, models.ErrEmailExists
	}

	// Create new user
	user := &models.User{
		Email:      req.Email,
		Name:       req.Name,
		Password:   req.Password,
		Role:       req.Role,
		Phone:      req.Phone,
		Department: req.Department,
		Position:   req.Position,
	}

	// Validate and hash password
	if err := user.BeforeCreate(); err != nil {
		return nil, fmt.Errorf("user validation failed: %w", err)
	}

	// Insert user into database
	result, err := s.userCollection.InsertOne(ctx, user)
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	user.ID = result.InsertedID.(primitive.ObjectID)
	return user, nil
}

// GetUserByEmail finds a user by email address
func (s *UserService) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	filter := bson.M{"email": email, "active": true}

	err := s.userCollection.FindOne(ctx, filter).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, models.ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to find user: %w", err)
	}

	return &user, nil
}

// GetUserByID finds a user by ID
func (s *UserService) GetUserByID(ctx context.Context, id primitive.ObjectID) (*models.User, error) {
	var user models.User
	filter := bson.M{"_id": id, "active": true}

	err := s.userCollection.FindOne(ctx, filter).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, models.ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to find user: %w", err)
	}

	return &user, nil
}

// UpdateUser updates user information
func (s *UserService) UpdateUser(ctx context.Context, userID primitive.ObjectID, req *models.UpdateProfileRequest) (*models.User, error) {
	// Prepare update document
	updateDoc := bson.M{
		"updated_at": time.Now(),
	}

	if req.Name != "" {
		updateDoc["name"] = req.Name
	}
	if req.Phone != "" {
		updateDoc["phone"] = req.Phone
	}
	if req.Department != "" {
		updateDoc["department"] = req.Department
	}
	if req.Position != "" {
		updateDoc["position"] = req.Position
	}
	if req.Avatar != "" {
		updateDoc["avatar"] = req.Avatar
	}

	// Update user
	filter := bson.M{"_id": userID, "active": true}
	update := bson.M{"$set": updateDoc}

	result, err := s.userCollection.UpdateOne(ctx, filter, update)
	if err != nil {
		return nil, fmt.Errorf("failed to update user: %w", err)
	}

	if result.MatchedCount == 0 {
		return nil, models.ErrUserNotFound
	}

	// Return updated user
	return s.GetUserByID(ctx, userID)
}

// ChangePassword updates user password
func (s *UserService) ChangePassword(ctx context.Context, userID primitive.ObjectID, req *models.ChangePasswordRequest) error {
	// Get user
	user, err := s.GetUserByID(ctx, userID)
	if err != nil {
		return err
	}

	// Verify current password
	if err := user.CheckPassword(req.CurrentPassword); err != nil {
		return models.ErrInvalidPassword
	}

	// Hash new password
	user.Password = req.NewPassword
	if err := user.HashPassword(); err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	// Update password in database
	filter := bson.M{"_id": userID}
	update := bson.M{
		"$set": bson.M{
			"password":   user.Password,
			"updated_at": time.Now(),
		},
	}

	_, err = s.userCollection.UpdateOne(ctx, filter, update)
	if err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}

	return nil
}

// UpdateLastLogin updates the user's last login timestamp
func (s *UserService) UpdateLastLogin(ctx context.Context, userID primitive.ObjectID) error {
	filter := bson.M{"_id": userID}
	update := bson.M{
		"$set": bson.M{
			"last_login": time.Now(),
		},
	}

	_, err := s.userCollection.UpdateOne(ctx, filter, update)
	return err
}

// VerifyUser marks a user as verified
func (s *UserService) VerifyUser(ctx context.Context, userID primitive.ObjectID) error {
	filter := bson.M{"_id": userID}
	update := bson.M{
		"$set": bson.M{
			"verified":   true,
			"updated_at": time.Now(),
		},
	}

	result, err := s.userCollection.UpdateOne(ctx, filter, update)
	if err != nil {
		return fmt.Errorf("failed to verify user: %w", err)
	}

	if result.MatchedCount == 0 {
		return models.ErrUserNotFound
	}

	return nil
}

// DeactivateUser deactivates a user account
func (s *UserService) DeactivateUser(ctx context.Context, userID primitive.ObjectID) error {
	filter := bson.M{"_id": userID}
	update := bson.M{
		"$set": bson.M{
			"active":     false,
			"updated_at": time.Now(),
		},
	}

	result, err := s.userCollection.UpdateOne(ctx, filter, update)
	if err != nil {
		return fmt.Errorf("failed to deactivate user: %w", err)
	}

	if result.MatchedCount == 0 {
		return models.ErrUserNotFound
	}

	return nil
}

// CreatePasswordResetToken creates a password reset token
func (s *UserService) CreatePasswordResetToken(ctx context.Context, userID primitive.ObjectID) (*models.PasswordResetToken, error) {
	// Generate secure random token
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}
	token := hex.EncodeToString(tokenBytes)

	// Create reset token document
	resetToken := &models.PasswordResetToken{
		UserID:    userID,
		Token:     token,
		ExpiresAt: time.Now().Add(1 * time.Hour), // Token expires in 1 hour
		Used:      false,
		CreatedAt: time.Now(),
	}

	// Insert token
	result, err := s.resetTokens.InsertOne(ctx, resetToken)
	if err != nil {
		return nil, fmt.Errorf("failed to create reset token: %w", err)
	}

	resetToken.ID = result.InsertedID.(primitive.ObjectID)
	return resetToken, nil
}

// ValidatePasswordResetToken validates and returns a password reset token
func (s *UserService) ValidatePasswordResetToken(ctx context.Context, token string) (*models.PasswordResetToken, error) {
	var resetToken models.PasswordResetToken
	filter := bson.M{
		"token": token,
		"used":  false,
		"expires_at": bson.M{
			"$gt": time.Now(),
		},
	}

	err := s.resetTokens.FindOne(ctx, filter).Decode(&resetToken)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, models.ErrInvalidToken
		}
		return nil, fmt.Errorf("failed to find reset token: %w", err)
	}

	return &resetToken, nil
}

// UsePasswordResetToken marks a password reset token as used and resets the password
func (s *UserService) UsePasswordResetToken(ctx context.Context, token string, newPassword string) error {
	// Validate token
	resetToken, err := s.ValidatePasswordResetToken(ctx, token)
	if err != nil {
		return err
	}

	// Get user
	user, err := s.GetUserByID(ctx, resetToken.UserID)
	if err != nil {
		return err
	}

	// Hash new password
	user.Password = newPassword
	if err := user.HashPassword(); err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	// Start transaction to update password and mark token as used
	session, err := s.db.Client.StartSession()
	if err != nil {
		return fmt.Errorf("failed to start session: %w", err)
	}
	defer session.EndSession(ctx)

	_, err = session.WithTransaction(ctx, func(sc mongo.SessionContext) (interface{}, error) {
		// Update password
		userFilter := bson.M{"_id": resetToken.UserID}
		userUpdate := bson.M{
			"$set": bson.M{
				"password":   user.Password,
				"updated_at": time.Now(),
			},
		}
		_, err := s.userCollection.UpdateOne(sc, userFilter, userUpdate)
		if err != nil {
			return nil, err
		}

		// Mark token as used
		tokenFilter := bson.M{"_id": resetToken.ID}
		tokenUpdate := bson.M{
			"$set": bson.M{
				"used": true,
			},
		}
		_, err = s.resetTokens.UpdateOne(sc, tokenFilter, tokenUpdate)
		return nil, err
	})

	return err
}

// CreateEmailVerificationToken creates an email verification token
func (s *UserService) CreateEmailVerificationToken(ctx context.Context, userID primitive.ObjectID) (*models.EmailVerificationToken, error) {
	// Generate secure random token
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}
	token := hex.EncodeToString(tokenBytes)

	// Create verification token document
	verificationToken := &models.EmailVerificationToken{
		UserID:    userID,
		Token:     token,
		ExpiresAt: time.Now().Add(24 * time.Hour), // Token expires in 24 hours
		Used:      false,
		CreatedAt: time.Now(),
	}

	// Insert token
	result, err := s.verificationTokens.InsertOne(ctx, verificationToken)
	if err != nil {
		return nil, fmt.Errorf("failed to create verification token: %w", err)
	}

	verificationToken.ID = result.InsertedID.(primitive.ObjectID)
	return verificationToken, nil
}

// VerifyEmailToken validates and uses an email verification token
func (s *UserService) VerifyEmailToken(ctx context.Context, token string) error {
	var verificationToken models.EmailVerificationToken
	filter := bson.M{
		"token": token,
		"used":  false,
		"expires_at": bson.M{
			"$gt": time.Now(),
		},
	}

	err := s.verificationTokens.FindOne(ctx, filter).Decode(&verificationToken)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return models.ErrInvalidToken
		}
		return fmt.Errorf("failed to find verification token: %w", err)
	}

	// Start transaction to verify user and mark token as used
	session, err := s.db.Client.StartSession()
	if err != nil {
		return fmt.Errorf("failed to start session: %w", err)
	}
	defer session.EndSession(ctx)

	_, err = session.WithTransaction(ctx, func(sc mongo.SessionContext) (interface{}, error) {
		// Verify user
		userFilter := bson.M{"_id": verificationToken.UserID}
		userUpdate := bson.M{
			"$set": bson.M{
				"verified":   true,
				"updated_at": time.Now(),
			},
		}
		_, err := s.userCollection.UpdateOne(sc, userFilter, userUpdate)
		if err != nil {
			return nil, err
		}

		// Mark token as used
		tokenFilter := bson.M{"_id": verificationToken.ID}
		tokenUpdate := bson.M{
			"$set": bson.M{
				"used": true,
			},
		}
		_, err = s.verificationTokens.UpdateOne(sc, tokenFilter, tokenUpdate)
		return nil, err
	})

	return err
}

// CreateRefreshToken creates a refresh token for a user
func (s *UserService) CreateRefreshToken(ctx context.Context, userID primitive.ObjectID) (*models.RefreshToken, error) {
	// Generate secure random token
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}
	token := hex.EncodeToString(tokenBytes)

	// Create refresh token document
	refreshToken := &models.RefreshToken{
		UserID:    userID,
		Token:     token,
		ExpiresAt: time.Now().Add(30 * 24 * time.Hour), // Token expires in 30 days
		Revoked:   false,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	// Insert token
	result, err := s.refreshTokens.InsertOne(ctx, refreshToken)
	if err != nil {
		return nil, fmt.Errorf("failed to create refresh token: %w", err)
	}

	refreshToken.ID = result.InsertedID.(primitive.ObjectID)
	return refreshToken, nil
}

// ValidateRefreshToken validates a refresh token
func (s *UserService) ValidateRefreshToken(ctx context.Context, token string) (*models.RefreshToken, error) {
	var refreshToken models.RefreshToken
	filter := bson.M{
		"token":   token,
		"revoked": false,
		"expires_at": bson.M{
			"$gt": time.Now(),
		},
	}

	err := s.refreshTokens.FindOne(ctx, filter).Decode(&refreshToken)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, models.ErrInvalidToken
		}
		return nil, fmt.Errorf("failed to find refresh token: %w", err)
	}

	return &refreshToken, nil
}

// RevokeRefreshToken revokes a refresh token
func (s *UserService) RevokeRefreshToken(ctx context.Context, token string) error {
	filter := bson.M{"token": token}
	update := bson.M{
		"$set": bson.M{
			"revoked":    true,
			"updated_at": time.Now(),
		},
	}

	_, err := s.refreshTokens.UpdateOne(ctx, filter, update)
	return err
}

// RevokeAllUserRefreshTokens revokes all refresh tokens for a user
func (s *UserService) RevokeAllUserRefreshTokens(ctx context.Context, userID primitive.ObjectID) error {
	filter := bson.M{"user_id": userID, "revoked": false}
	update := bson.M{
		"$set": bson.M{
			"revoked":    true,
			"updated_at": time.Now(),
		},
	}

	_, err := s.refreshTokens.UpdateMany(ctx, filter, update)
	return err
}

// ListUsers returns a paginated list of users
func (s *UserService) ListUsers(ctx context.Context, skip, limit int64, filter bson.M) ([]*models.User, int64, error) {
	// Add active filter
	filter["active"] = true

	// Get total count
	total, err := s.userCollection.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count users: %w", err)
	}

	// Find users with pagination
	findOptions := options.Find()
	findOptions.SetSkip(skip)
	findOptions.SetLimit(limit)
	findOptions.SetSort(bson.D{{Key: "created_at", Value: -1}}) // Sort by creation date, newest first

	cursor, err := s.userCollection.Find(ctx, filter, findOptions)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to find users: %w", err)
	}
	defer cursor.Close(ctx)

	var users []*models.User
	if err := cursor.All(ctx, &users); err != nil {
		return nil, 0, fmt.Errorf("failed to decode users: %w", err)
	}

	return users, total, nil
}