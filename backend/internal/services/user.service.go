package services

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/kodesonik/process-manager/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// UserService handles user-related database operations
type UserService struct {
	db             *DatabaseService
	userCollection *mongo.Collection
}

// NewUserService creates a new user service instance
func NewUserService(db *DatabaseService) *UserService {
	return &UserService{
		db:             db,
		userCollection: db.Collection("users"),
	}
}

// ============================================
// User CRUD Operations
// ============================================

// CreateUser creates a new user in the database (admin creation)
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
		Role:       req.Role,
		Phone:      req.Phone,
		Status:     models.StatusActive, // Admin-created users are active by default
		Active:     true,
		Verified:   true,
	}

	// Handle department ID
	if req.DepartmentID != "" {
		departmentOID, err := primitive.ObjectIDFromHex(req.DepartmentID)
		if err != nil {
			return nil, fmt.Errorf("invalid department ID: %w", err)
		}
		user.DepartmentID = &departmentOID
	}

	// Handle job position ID
	if req.JobPositionID != "" {
		jobPositionOID, err := primitive.ObjectIDFromHex(req.JobPositionID)
		if err != nil {
			return nil, fmt.Errorf("invalid job position ID: %w", err)
		}
		user.JobPositionID = &jobPositionOID
	}

	// Set timestamps
	now := time.Now()
	user.CreatedAt = now
	user.UpdatedAt = now
	user.ValidatedAt = &now

	// Validate user
	if !user.ValidateEmail() {
		return nil, models.ErrInvalidEmail
	}

	if !models.IsValidRole(user.Role) {
		return nil, models.ErrInvalidRole
	}

	// Insert user into database
	result, err := s.userCollection.InsertOne(ctx, user)
	if err != nil {
		if mongo.IsDuplicateKeyError(err) {
			return nil, models.ErrEmailExists
		}
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	user.ID = result.InsertedID.(primitive.ObjectID)
	return user, nil
}

// RegisterUser registers a new user with pending status
func (s *UserService) RegisterUser(ctx context.Context, req *models.RegisterUserRequest) (*models.User, error) {
	// Check if user with email already exists
	existingUser, err := s.GetUserByEmail(ctx, req.Email)
	if err == nil && existingUser != nil {
		return nil, models.ErrEmailExists
	}

	// Create new user with pending status
	user := &models.User{
		Email:      req.Email,
		Name:       req.Name,
		Role:       models.RoleUser, // Default role for registration
		Phone:      req.Phone,
	}

	// Handle department ID
	if req.DepartmentID != "" {
		departmentOID, err := primitive.ObjectIDFromHex(req.DepartmentID)
		if err != nil {
			return nil, fmt.Errorf("invalid department ID: %w", err)
		}
		user.DepartmentID = &departmentOID
	}

	// Handle job position ID
	if req.JobPositionID != "" {
		jobPositionOID, err := primitive.ObjectIDFromHex(req.JobPositionID)
		if err != nil {
			return nil, fmt.Errorf("invalid job position ID: %w", err)
		}
		user.JobPositionID = &jobPositionOID
	}

	// BeforeCreate sets status to pending and validates
	if err := user.BeforeCreate(); err != nil {
		return nil, err
	}

	// Insert user into database
	result, err := s.userCollection.InsertOne(ctx, user)
	if err != nil {
		if mongo.IsDuplicateKeyError(err) {
			return nil, models.ErrEmailExists
		}
		return nil, fmt.Errorf("failed to register user: %w", err)
	}

	user.ID = result.InsertedID.(primitive.ObjectID)
	return user, nil
}

// GetUserByEmail finds a user by email address
func (s *UserService) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	filter := bson.M{"email": email}

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
	filter := bson.M{"_id": id}

	err := s.userCollection.FindOne(ctx, filter).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, models.ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to find user: %w", err)
	}

	return &user, nil
}

// GetActiveUserByEmail finds an active user by email address
func (s *UserService) GetActiveUserByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	filter := bson.M{
		"email":  email,
		"status": models.StatusActive,
		"active": true,
	}

	err := s.userCollection.FindOne(ctx, filter).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, models.ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to find active user: %w", err)
	}

	return &user, nil
}

// UpdateUser updates user profile information
func (s *UserService) UpdateUser(ctx context.Context, userID primitive.ObjectID, req *models.UpdateProfileRequest) (*models.User, error) {
	update := bson.M{
		"$set": bson.M{
			"updated_at": time.Now(),
		},
	}

	// Add fields to update if provided
	if req.Name != "" {
		update["$set"].(bson.M)["name"] = req.Name
	}
	if req.Phone != "" {
		update["$set"].(bson.M)["phone"] = req.Phone
	}
	if req.DepartmentID != "" {
		departmentID, err := primitive.ObjectIDFromHex(req.DepartmentID)
		if err != nil {
			return nil, fmt.Errorf("invalid department ID: %w", err)
		}
		update["$set"].(bson.M)["department_id"] = departmentID
	}
	if req.JobPositionID != "" {
		jobPositionID, err := primitive.ObjectIDFromHex(req.JobPositionID)
		if err != nil {
			return nil, fmt.Errorf("invalid job position ID: %w", err)
		}
		update["$set"].(bson.M)["job_position_id"] = jobPositionID
	}
	if req.Avatar != "" {
		update["$set"].(bson.M)["avatar"] = req.Avatar
	}

	// Update and return the updated user
	var user models.User
	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	err := s.userCollection.FindOneAndUpdate(
		ctx,
		bson.M{"_id": userID},
		update,
		opts,
	).Decode(&user)

	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, models.ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to update user: %w", err)
	}

	return &user, nil
}

// SoftDeleteUser marks a user as deleted
func (s *UserService) SoftDeleteUser(ctx context.Context, userID primitive.ObjectID) error {
	update := bson.M{
		"$set": bson.M{
			"status":     models.StatusInactive,
			"active":     false,
			"updated_at": time.Now(),
		},
	}

	result, err := s.userCollection.UpdateOne(
		ctx,
		bson.M{"_id": userID},
		update,
	)

	if err != nil {
		return fmt.Errorf("failed to delete user: %w", err)
	}

	if result.MatchedCount == 0 {
		return models.ErrUserNotFound
	}

	return nil
}

// ============================================
// User Status Management
// ============================================

// SetUserActiveStatus activates or deactivates a user account
func (s *UserService) SetUserActiveStatus(ctx context.Context, userID primitive.ObjectID, active bool) error {
	status := models.StatusActive
	if !active {
		status = models.StatusInactive
	}

	update := bson.M{
		"$set": bson.M{
			"active":     active,
			"status":     status,
			"updated_at": time.Now(),
		},
	}

	result, err := s.userCollection.UpdateOne(
		ctx,
		bson.M{"_id": userID},
		update,
	)

	if err != nil {
		return fmt.Errorf("failed to update user status: %w", err)
	}

	if result.MatchedCount == 0 {
		return models.ErrUserNotFound
	}

	return nil
}

// UpdateUserRole updates a user's role
func (s *UserService) UpdateUserRole(ctx context.Context, userID primitive.ObjectID, role models.UserRole) error {
	if !models.IsValidRole(role) {
		return models.ErrInvalidRole
	}

	update := bson.M{
		"$set": bson.M{
			"role":       role,
			"updated_at": time.Now(),
		},
	}

	result, err := s.userCollection.UpdateOne(
		ctx,
		bson.M{"_id": userID},
		update,
	)

	if err != nil {
		return fmt.Errorf("failed to update user role: %w", err)
	}

	if result.MatchedCount == 0 {
		return models.ErrUserNotFound
	}

	return nil
}

// ValidateUser handles admin validation of pending users
func (s *UserService) ValidateUser(ctx context.Context, userID primitive.ObjectID, req *models.ValidateUserRequest, adminID primitive.ObjectID) (*models.User, error) {
	// Get the user to validate
	user, err := s.GetUserByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Check if user is in pending status
	if user.Status != models.StatusPending {
		return nil, fmt.Errorf("user is not in pending status")
	}

	now := time.Now()
	update := bson.M{
		"$set": bson.M{
			"updated_at": now,
		},
	}

	if req.Action == "approve" {
		// Set role if provided
		role := models.RoleUser
		if req.Role != "" && models.IsValidRole(req.Role) {
			role = req.Role
		}

		update["$set"].(bson.M)["status"] = models.StatusActive
		update["$set"].(bson.M)["active"] = true
		update["$set"].(bson.M)["verified"] = true
		update["$set"].(bson.M)["role"] = role
		update["$set"].(bson.M)["validated_by"] = adminID
		update["$set"].(bson.M)["validated_at"] = now
	} else if req.Action == "reject" {
		update["$set"].(bson.M)["status"] = models.StatusRejected
		update["$set"].(bson.M)["active"] = false
		update["$set"].(bson.M)["rejected_by"] = adminID
		update["$set"].(bson.M)["rejected_at"] = now
		update["$set"].(bson.M)["rejection_reason"] = req.Reason
	} else {
		return nil, fmt.Errorf("invalid action: %s", req.Action)
	}

	// Update and return the updated user
	var updatedUser models.User
	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	err = s.userCollection.FindOneAndUpdate(
		ctx,
		bson.M{"_id": userID},
		update,
		opts,
	).Decode(&updatedUser)

	if err != nil {
		return nil, fmt.Errorf("failed to validate user: %w", err)
	}

	return &updatedUser, nil
}

// ============================================
// User Listing and Filtering
// ============================================

// ListUsers returns a list of users with pagination and filters
func (s *UserService) ListUsers(ctx context.Context, skip, limit int64, filter bson.M) ([]*models.User, int64, error) {
	// Count total documents
	total, err := s.userCollection.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count users: %w", err)
	}

	// Find users with pagination
	opts := options.Find().
		SetSkip(skip).
		SetLimit(limit).
		SetSort(bson.D{{Key: "created_at", Value: -1}})

	cursor, err := s.userCollection.Find(ctx, filter, opts)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to find users: %w", err)
	}
	defer cursor.Close(ctx)

	var users []*models.User
	if err = cursor.All(ctx, &users); err != nil {
		return nil, 0, fmt.Errorf("failed to decode users: %w", err)
	}

	return users, total, nil
}

// GetPendingUsers returns all pending users with pagination
func (s *UserService) GetPendingUsers(ctx context.Context, skip, limit int64) ([]*models.User, int64, error) {
	filter := bson.M{"status": models.StatusPending}
	return s.ListUsers(ctx, skip, limit, filter)
}

// GetAllUsersForNotification returns users for notification purposes
func (s *UserService) GetAllUsersForNotification(roles []string, status string) ([]*models.User, error) {
	ctx := context.Background()
	filter := bson.M{}

	// Filter by roles if provided
	if len(roles) > 0 {
		validRoles := []models.UserRole{}
		for _, role := range roles {
			if models.IsValidRole(models.UserRole(role)) {
				validRoles = append(validRoles, models.UserRole(role))
			}
		}
		if len(validRoles) > 0 {
			filter["role"] = bson.M{"$in": validRoles}
		}
	}

	// Filter by status if provided
	if status != "" && models.IsValidStatus(models.UserStatus(status)) {
		filter["status"] = models.UserStatus(status)
	} else if status == "" {
		// Default to active users only
		filter["status"] = models.StatusActive
	}

	cursor, err := s.userCollection.Find(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to find users: %w", err)
	}
	defer cursor.Close(ctx)

	var users []*models.User
	if err = cursor.All(ctx, &users); err != nil {
		return nil, fmt.Errorf("failed to decode users: %w", err)
	}

	return users, nil
}

// GetUsersWithFilters returns users with advanced filtering options
func (s *UserService) GetUsersWithFilters(ctx context.Context, opts *models.UserFilterOptions) ([]*models.User, int64, error) {
	// Build filter
	filter := bson.M{}

	if opts.Status != "" && models.IsValidStatus(opts.Status) {
		filter["status"] = opts.Status
	}

	if opts.Role != "" && models.IsValidRole(opts.Role) {
		filter["role"] = opts.Role
	}

	if opts.DepartmentID != "" {
		departmentID, err := primitive.ObjectIDFromHex(opts.DepartmentID)
		if err == nil {
			filter["department_id"] = departmentID
		}
	}

	if opts.Active != nil {
		filter["active"] = *opts.Active
	}

	if opts.Verified != nil {
		filter["verified"] = *opts.Verified
	}

	if opts.Search != "" {
		filter["$or"] = []bson.M{
			{"name": bson.M{"$regex": opts.Search, "$options": "i"}},
			{"email": bson.M{"$regex": opts.Search, "$options": "i"}},
		}
	}

	// Calculate pagination
	skip := int64((opts.Page - 1) * opts.Limit)
	limit := int64(opts.Limit)

	return s.ListUsers(ctx, skip, limit, filter)
}

// ============================================
// Authentication Support Operations
// ============================================

// UpdateLastLogin updates the last login timestamp
func (s *UserService) UpdateLastLogin(ctx context.Context, userID primitive.ObjectID) error {
	now := time.Now()
	update := bson.M{
		"$set": bson.M{
			"last_login": now,
			"updated_at": now,
		},
	}

	_, err := s.userCollection.UpdateOne(
		ctx,
		bson.M{"_id": userID},
		update,
	)

	return err
}

// VerifyUser marks a user as verified
func (s *UserService) VerifyUser(ctx context.Context, userID primitive.ObjectID) error {
	update := bson.M{
		"$set": bson.M{
			"verified":   true,
			"updated_at": time.Now(),
		},
	}

	result, err := s.userCollection.UpdateOne(
		ctx,
		bson.M{"_id": userID},
		update,
	)

	if err != nil {
		return fmt.Errorf("failed to verify user: %w", err)
	}

	if result.MatchedCount == 0 {
		return models.ErrUserNotFound
	}

	return nil
}


// ============================================
// Default Admin Management
// ============================================

// EnsureDefaultAdmin creates a default admin user if no admin exists
func (s *UserService) EnsureDefaultAdmin(ctx context.Context) error {
	// Check if any admin user already exists
	filter := bson.M{
		"role":   models.RoleAdmin,
		"active": true,
	}

	count, err := s.userCollection.CountDocuments(ctx, filter)
	if err != nil {
		return fmt.Errorf("failed to check for existing admin: %w", err)
	}

	// If admin already exists, no need to create one
	if count > 0 {
		return nil
	}

	// Get default admin credentials from environment variables
	adminEmail := getEnvOrDefault("DEFAULT_ADMIN_EMAIL", "admin@process-manager.local")
	adminName := getEnvOrDefault("DEFAULT_ADMIN_NAME", "System Administrator")

	// Create default admin user
	defaultAdmin := &models.User{
		Email:    adminEmail,
		Name:     adminName,
		Role:     models.RoleAdmin,
		Status:   models.StatusActive,
		Active:   true,
		Verified: true,
	}

	// Set timestamps
	now := time.Now()
	defaultAdmin.CreatedAt = now
	defaultAdmin.UpdatedAt = now
	defaultAdmin.ValidatedAt = &now

	// Validate admin user
	if !defaultAdmin.ValidateEmail() {
		return fmt.Errorf("invalid default admin email: %s", adminEmail)
	}

	// Insert default admin into database
	result, err := s.userCollection.InsertOne(ctx, defaultAdmin)
	if err != nil {
		if mongo.IsDuplicateKeyError(err) {
			// Admin with this email already exists, which is fine
			return nil
		}
		return fmt.Errorf("failed to create default admin: %w", err)
	}

	defaultAdmin.ID = result.InsertedID.(primitive.ObjectID)
	
	fmt.Printf("✅ Default admin user created successfully:\n")
	fmt.Printf("   📧 Email: %s\n", adminEmail)
	fmt.Printf("   👤 Name: %s\n", adminName)
	fmt.Printf("   🔑 Role: %s\n", models.RoleAdmin)
	fmt.Printf("   🆔 ID: %s\n", defaultAdmin.ID.Hex())
	fmt.Println("   ⚠️  Please use OTP-based authentication to log in")

	return nil
}

// CreateUserFromRegistration creates a user from the 3-step registration process
func (s *UserService) CreateUserFromRegistration(ctx context.Context, email string, req *models.Step3RegistrationRequest) (*models.User, error) {
	// Convert string IDs to ObjectIDs
	departmentID, err := primitive.ObjectIDFromHex(req.DepartmentID)
	if err != nil {
		return nil, fmt.Errorf("invalid department ID: %w", err)
	}
	
	jobPositionID, err := primitive.ObjectIDFromHex(req.JobPositionID)
	if err != nil {
		return nil, fmt.Errorf("invalid job position ID: %w", err)
	}

	// Create new user
	now := time.Now()
	user := &models.User{
		Email:         email,
		Name:          req.Name,
		Phone:         req.Phone,
		DepartmentID:  &departmentID,
		JobPositionID: &jobPositionID,
		Role:          models.RoleUser, // Default role for new registrations
		Status:        models.StatusPending,
		Active:        false,
		Verified:      true, // Email was verified in step 2
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	// Validate user
	if !user.ValidateEmail() {
		return nil, models.ErrInvalidEmail
	}

	// Insert user into database
	result, err := s.userCollection.InsertOne(ctx, user)
	if err != nil {
		if mongo.IsDuplicateKeyError(err) {
			return nil, models.ErrEmailExists
		}
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	user.ID = result.InsertedID.(primitive.ObjectID)
	return user, nil
}

// ============================================
// User Response Population Methods
// ============================================

// ToResponseWithDetails converts a User to UserResponse with populated department and job position
func (s *UserService) ToResponseWithDetails(ctx context.Context, user *models.User) (models.UserResponse, error) {
	response := user.ToResponse()

	// Populate department if user has one
	if user.DepartmentID != nil {
		department, err := s.getDepartmentByID(ctx, *user.DepartmentID)
		if err == nil && department != nil {
			deptResponse := department.ToResponse()
			response.Department = &deptResponse
		}
	}

	// Populate job position if user has one
	if user.JobPositionID != nil {
		jobPosition, err := s.getJobPositionByID(ctx, *user.JobPositionID)
		if err == nil && jobPosition != nil {
			jpResponse := jobPosition.ToResponse()
			response.JobPosition = &jpResponse
		}
	}

	return response, nil
}

// ToResponseListWithDetails converts a list of Users to UserResponse with populated details
func (s *UserService) ToResponseListWithDetails(ctx context.Context, users []*models.User) ([]models.UserResponse, error) {
	responses := make([]models.UserResponse, len(users))

	for i, user := range users {
		response, err := s.ToResponseWithDetails(ctx, user)
		if err != nil {
			// If population fails, use basic response
			response = user.ToResponse()
		}
		responses[i] = response
	}

	return responses, nil
}

// getDepartmentByID fetches department by ID
func (s *UserService) getDepartmentByID(ctx context.Context, departmentID primitive.ObjectID) (*models.Department, error) {
	departmentCollection := s.db.Collection("departments")

	var department models.Department
	err := departmentCollection.FindOne(ctx, bson.M{"_id": departmentID}).Decode(&department)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}

	return &department, nil
}

// getJobPositionByID fetches job position by ID
func (s *UserService) getJobPositionByID(ctx context.Context, jobPositionID primitive.ObjectID) (*models.JobPosition, error) {
	jobPositionCollection := s.db.Collection("job_positions")

	var jobPosition models.JobPosition
	err := jobPositionCollection.FindOne(ctx, bson.M{"_id": jobPositionID}).Decode(&jobPosition)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}

	return &jobPosition, nil
}

// getEnvOrDefault returns environment variable value or default if not set
func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// Singleton pattern for global access
var userService *UserService

// InitUserService initializes the global user service
func InitUserService(db *DatabaseService) *UserService {
	if userService == nil {
		userService = NewUserService(db)
	}
	return userService
}

// GetUserService returns the global user service instance
func GetUserService() *UserService {
	if userService == nil {
		// Return a basic instance for activity log service calls
		// This should ideally be initialized in main.go first
		return nil
	}
	return userService
}
