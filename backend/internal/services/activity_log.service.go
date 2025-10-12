package services

import (
	"context"
	"fmt"
	"log"
	"net"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kodesonik/process-manager/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// ActivityLogService handles activity logging operations
type ActivityLogService struct {
	db         *DatabaseService
	collection *mongo.Collection
}

// NewActivityLogService creates a new activity log service instance
func NewActivityLogService(db *DatabaseService) *ActivityLogService {
	collection := db.Database.Collection("activity_logs")

	// Create indexes for better query performance
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		indexes := []mongo.IndexModel{
			{
				Keys: bson.D{
					{Key: "user_id", Value: 1},
					{Key: "timestamp", Value: -1},
				},
			},
			{
				Keys: bson.D{
					{Key: "action", Value: 1},
					{Key: "timestamp", Value: -1},
				},
			},
			{
				Keys: bson.D{
					{Key: "category", Value: 1},
					{Key: "timestamp", Value: -1},
				},
			},
			{
				Keys: bson.D{
					{Key: "level", Value: 1},
					{Key: "timestamp", Value: -1},
				},
			},
			{
				Keys: bson.D{
					{Key: "resource_type", Value: 1},
					{Key: "resource_id", Value: 1},
					{Key: "timestamp", Value: -1},
				},
			},
			{
				Keys: bson.D{
					{Key: "timestamp", Value: -1},
				},
			},
			{
				Keys: bson.D{
					{Key: "target_user_id", Value: 1},
					{Key: "timestamp", Value: -1},
				},
			},
		}

		_, err := collection.Indexes().CreateMany(ctx, indexes)
		if err != nil {
			log.Printf("Warning: Failed to create activity log indexes: %v", err)
		} else {
			log.Printf("✅ Activity log indexes created successfully")
		}
	}()

	return &ActivityLogService{
		db:         db,
		collection: collection,
	}
}

// LogActivity logs a new activity with context information
func (s *ActivityLogService) LogActivity(ctx context.Context, req models.ActivityLogRequest, c *gin.Context) error {
	now := time.Now()

	// Extract context information
	ipAddress := s.extractIPAddress(c)
	userAgent := s.extractUserAgent(c)

	// Get actor information from context
	var actorName, actorEmail, actorAvatar string
	var userID *primitive.ObjectID

	if user, exists := c.Get("user"); exists {
		if userModel, ok := user.(*models.User); ok {
			userID = &userModel.ID
			actorName = userModel.FirstName + " " + userModel.LastName
			actorEmail = userModel.Email
			actorAvatar = userModel.Avatar
		}
	}

	// Override userID if provided in request (for system actions)
	if req.UserID != nil {
		userID = req.UserID
		// Fetch user details for the overridden userID
		userService := GetUserService()
		if user, err := userService.GetUserByID(ctx, *userID); err == nil {
			actorName = user.FirstName + " " + user.LastName
			actorEmail = user.Email
			actorAvatar = user.Avatar
		}
	}

	// Create activity log entry
	activityLog := models.ActivityLog{
		ID:           primitive.NewObjectID(),
		UserID:       userID,
		ActorName:    actorName,
		ActorEmail:   actorEmail,
		ActorAvatar:  actorAvatar,
		TargetUserID: req.TargetUserID,
		TargetName:   req.TargetName,
		Action:       req.Action,
		Category:     models.GetCategoryFromAction(req.Action),
		Level:        models.GetLevelFromAction(req.Action),
		Description:  req.Description,
		ResourceType: req.ResourceType,
		ResourceID:   req.ResourceID,
		Details:      req.Details,
		IPAddress:    ipAddress,
		UserAgent:    userAgent,
		Success:      req.Success,
		ErrorMessage: req.ErrorMessage,
		Duration:     req.Duration,
		Timestamp:    now,
		CreatedAt:    now,
	}

	// Insert into database
	_, err := s.collection.InsertOne(ctx, activityLog)
	if err != nil {
		log.Printf("Failed to log activity: %v", err)
		return fmt.Errorf("failed to log activity: %w", err)
	}

	// Log to console for debugging (only in development)
	if gin.Mode() == gin.DebugMode {
		log.Printf("📝 Activity logged: %s by %s (%s) - %s",
			req.Action, actorName, actorEmail, req.Description)
	}

	return nil
}

// LogActivitySimple logs a simple activity without Gin context
func (s *ActivityLogService) LogActivitySimple(ctx context.Context, action models.ActivityAction, description string, userID *primitive.ObjectID, success bool) error {
	now := time.Now()

	// Get user information if userID is provided
	var actorName, actorEmail, actorAvatar string
	if userID != nil {
		userService := GetUserService()
		if user, err := userService.GetUserByID(ctx, *userID); err == nil {
			actorName = user.FirstName + " " + user.LastName
			actorEmail = user.Email
			actorAvatar = user.Avatar
		}
	}

	// Create activity log entry
	activityLog := models.ActivityLog{
		ID:          primitive.NewObjectID(),
		UserID:      userID,
		ActorName:   actorName,
		ActorEmail:  actorEmail,
		ActorAvatar: actorAvatar,
		Action:      action,
		Category:    models.GetCategoryFromAction(action),
		Level:       models.GetLevelFromAction(action),
		Description: description,
		Success:     success,
		Timestamp:   now,
		CreatedAt:   now,
	}

	// Insert into database
	_, err := s.collection.InsertOne(ctx, activityLog)
	if err != nil {
		log.Printf("Failed to log activity: %v", err)
		return fmt.Errorf("failed to log activity: %w", err)
	}

	return nil
}

// GetActivityLogs retrieves activity logs with filters and pagination
func (s *ActivityLogService) GetActivityLogs(ctx context.Context, filters models.ActivityLogFilters) ([]models.ActivityLog, int64, error) {
	// Build filter query
	filter := bson.M{}

	if filters.UserID != nil {
		filter["user_id"] = *filters.UserID
	}

	if filters.TargetUserID != nil {
		filter["target_user_id"] = *filters.TargetUserID
	}

	if filters.Action != "" {
		filter["action"] = filters.Action
	}

	if filters.Category != "" {
		filter["category"] = filters.Category
	}

	if filters.Level != "" {
		filter["level"] = filters.Level
	}

	if filters.ResourceType != "" {
		filter["resource_type"] = filters.ResourceType
	}

	if filters.ResourceID != nil {
		filter["resource_id"] = *filters.ResourceID
	}

	if filters.Success != nil {
		filter["success"] = *filters.Success
	}

	if filters.IPAddress != "" {
		filter["ip_address"] = filters.IPAddress
	}

	// Date range filter
	if filters.DateFrom != nil || filters.DateTo != nil {
		dateFilter := bson.M{}
		if filters.DateFrom != nil {
			dateFilter["$gte"] = *filters.DateFrom
		}
		if filters.DateTo != nil {
			dateFilter["$lte"] = *filters.DateTo
		}
		filter["timestamp"] = dateFilter
	}

	// Get total count
	total, err := s.collection.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count activity logs: %w", err)
	}

	// Set pagination defaults
	if filters.Page < 1 {
		filters.Page = 1
	}
	if filters.Limit < 1 {
		filters.Limit = 20
	}
	if filters.Limit > 100 {
		filters.Limit = 100
	}

	// Calculate skip
	skip := (filters.Page - 1) * filters.Limit

	// Find options with pagination and sorting
	findOptions := options.Find().
		SetSort(bson.D{{Key: "timestamp", Value: -1}}). // Sort by timestamp descending
		SetSkip(int64(skip)).
		SetLimit(int64(filters.Limit))

	// Execute query
	cursor, err := s.collection.Find(ctx, filter, findOptions)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to find activity logs: %w", err)
	}
	defer cursor.Close(ctx)

	// Decode results
	var activityLogs []models.ActivityLog
	if err = cursor.All(ctx, &activityLogs); err != nil {
		return nil, 0, fmt.Errorf("failed to decode activity logs: %w", err)
	}

	return activityLogs, total, nil
}

// GetActivityLogByID retrieves a specific activity log by ID
func (s *ActivityLogService) GetActivityLogByID(ctx context.Context, id primitive.ObjectID) (*models.ActivityLog, error) {
	var activityLog models.ActivityLog
	err := s.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&activityLog)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, fmt.Errorf("activity log not found")
		}
		return nil, fmt.Errorf("failed to find activity log: %w", err)
	}

	return &activityLog, nil
}

// GetUserActivitySummary gets activity summary for a specific user
func (s *ActivityLogService) GetUserActivitySummary(ctx context.Context, userID primitive.ObjectID, days int) (map[string]interface{}, error) {
	startDate := time.Now().AddDate(0, 0, -days)

	// Aggregation pipeline
	pipeline := []bson.M{
		{
			"$match": bson.M{
				"user_id":   userID,
				"timestamp": bson.M{"$gte": startDate},
			},
		},
		{
			"$group": bson.M{
				"_id": bson.M{
					"category": "$category",
					"success":  "$success",
				},
				"count": bson.M{"$sum": 1},
			},
		},
	}

	cursor, err := s.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, fmt.Errorf("failed to aggregate activity summary: %w", err)
	}
	defer cursor.Close(ctx)

	// Process results
	summary := map[string]interface{}{
		"total":        0,
		"successful":   0,
		"failed":       0,
		"byCategory":   map[string]int{},
		"periodDays":   days,
		"startDate":    startDate,
	}

	var results []bson.M
	if err = cursor.All(ctx, &results); err != nil {
		return nil, fmt.Errorf("failed to decode activity summary: %w", err)
	}

	for _, result := range results {
		count := result["count"].(int32)
		category := result["_id"].(bson.M)["category"].(string)
		success := result["_id"].(bson.M)["success"].(bool)

		summary["total"] = summary["total"].(int) + int(count)

		if success {
			summary["successful"] = summary["successful"].(int) + int(count)
		} else {
			summary["failed"] = summary["failed"].(int) + int(count)
		}

		byCategory := summary["byCategory"].(map[string]int)
		byCategory[category] = byCategory[category] + int(count)
	}

	return summary, nil
}

// DeleteOldActivityLogs removes activity logs older than specified days
func (s *ActivityLogService) DeleteOldActivityLogs(ctx context.Context, olderThanDays int) (int64, error) {
	cutoffDate := time.Now().AddDate(0, 0, -olderThanDays)

	result, err := s.collection.DeleteMany(ctx, bson.M{
		"timestamp": bson.M{"$lt": cutoffDate},
	})
	if err != nil {
		return 0, fmt.Errorf("failed to delete old activity logs: %w", err)
	}

	return result.DeletedCount, nil
}

// GetActivityLogStats returns general statistics about activity logs
func (s *ActivityLogService) GetActivityLogStats(ctx context.Context) (map[string]interface{}, error) {
	// Total count
	total, err := s.collection.CountDocuments(ctx, bson.M{})
	if err != nil {
		return nil, fmt.Errorf("failed to count total activity logs: %w", err)
	}

	// Recent activity (last 24 hours)
	last24h := time.Now().Add(-24 * time.Hour)
	recent, err := s.collection.CountDocuments(ctx, bson.M{
		"timestamp": bson.M{"$gte": last24h},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to count recent activity logs: %w", err)
	}

	// Failed actions (last 24 hours)
	failed, err := s.collection.CountDocuments(ctx, bson.M{
		"timestamp": bson.M{"$gte": last24h},
		"success":   false,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to count failed activity logs: %w", err)
	}

	return map[string]interface{}{
		"total":       total,
		"last24Hours": recent,
		"failed24h":   failed,
		"timestamp":   time.Now(),
	}, nil
}

// Helper methods

func (s *ActivityLogService) extractIPAddress(c *gin.Context) string {
	// Try X-Forwarded-For header first (for proxies)
	if ip := c.GetHeader("X-Forwarded-For"); ip != "" {
		// X-Forwarded-For can contain multiple IPs, take the first one
		ips := strings.Split(ip, ",")
		if len(ips) > 0 {
			return strings.TrimSpace(ips[0])
		}
	}

	// Try X-Real-IP header
	if ip := c.GetHeader("X-Real-IP"); ip != "" {
		return ip
	}

	// Fall back to RemoteAddr
	ip, _, err := net.SplitHostPort(c.Request.RemoteAddr)
	if err != nil {
		return c.Request.RemoteAddr
	}

	return ip
}

func (s *ActivityLogService) extractUserAgent(c *gin.Context) string {
	return c.GetHeader("User-Agent")
}

// ToResponseList converts a slice of ActivityLog to ActivityLogResponse
func (s *ActivityLogService) ToResponseList(activityLogs []models.ActivityLog) []models.ActivityLogResponse {
	responses := make([]models.ActivityLogResponse, len(activityLogs))
	for i, log := range activityLogs {
		responses[i] = log.ToResponse()
	}
	return responses
}

// Singleton pattern for global access
var activityLogService *ActivityLogService

// InitActivityLogService initializes the global activity log service
func InitActivityLogService(db *DatabaseService) *ActivityLogService {
	if activityLogService == nil {
		activityLogService = NewActivityLogService(db)
	}
	return activityLogService
}

// GetActivityLogService returns the global activity log service instance
func GetActivityLogService() *ActivityLogService {
	if activityLogService == nil {
		log.Fatal("ActivityLogService not initialized. Call InitActivityLogService() first")
	}
	return activityLogService
}