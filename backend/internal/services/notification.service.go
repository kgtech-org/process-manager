package services

import (
	"context"
	"fmt"
	"time"

	"github.com/kodesonik/process-manager/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// NotificationService handles push notification operations
type NotificationService struct {
	notificationCollection *mongo.Collection
	preferencesCollection  *mongo.Collection
	firebaseService        *FirebaseService
	deviceService          *DeviceService
	userService            *UserService
}

// NewNotificationService creates a new notification service
func NewNotificationService(db *DatabaseService, firebaseService *FirebaseService, deviceService *DeviceService, userService *UserService) *NotificationService {
	notificationCollection := db.Collection("notifications")
	preferencesCollection := db.Collection("notification_preferences")

	// Create indexes
	ctx := context.Background()
	notificationIndexes := []mongo.IndexModel{
		{
			Keys: bson.D{{Key: "userId", Value: 1}},
		},
		{
			Keys: bson.D{{Key: "status", Value: 1}},
		},
		{
			Keys: bson.D{{Key: "category", Value: 1}},
		},
		{
			Keys: bson.D{{Key: "createdAt", Value: -1}},
		},
		{
			Keys: bson.D{{Key: "expiresAt", Value: 1}},
			Options: options.Index().SetExpireAfterSeconds(0),
		},
	}

	preferencesIndexes := []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "userId", Value: 1}},
			Options: options.Index().SetUnique(true),
		},
	}

	if _, err := notificationCollection.Indexes().CreateMany(ctx, notificationIndexes); err != nil {
		fmt.Printf("Warning: Failed to create notification indexes: %v\n", err)
	}

	if _, err := preferencesCollection.Indexes().CreateMany(ctx, preferencesIndexes); err != nil {
		fmt.Printf("Warning: Failed to create preferences indexes: %v\n", err)
	}

	return &NotificationService{
		notificationCollection: notificationCollection,
		preferencesCollection:  preferencesCollection,
		firebaseService:        firebaseService,
		deviceService:          deviceService,
		userService:            userService,
	}
}

// SendNotification sends a push notification to specified targets
func (s *NotificationService) SendNotification(ctx context.Context, req *models.SendNotificationRequest, senderID primitive.ObjectID) (*models.NotificationSummary, error) {
	// Validate request
	if !models.IsValidNotificationCategory(req.Category) {
		return nil, models.ErrInvalidCategory
	}
	if !models.IsValidNotificationPriority(req.Priority) {
		return nil, models.ErrInvalidPriority
	}

	// Get target users and devices
	targetUserIDs, targetDeviceIDs, err := s.resolveTargets(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve targets: %w", err)
	}

	if len(targetUserIDs) == 0 && len(targetDeviceIDs) == 0 {
		return nil, fmt.Errorf("no valid targets found")
	}

	// Get devices for notification
	devices, err := s.deviceService.GetDevicesForNotification(ctx, targetUserIDs, targetDeviceIDs)
	if err != nil {
		return nil, fmt.Errorf("failed to get devices: %w", err)
	}

	if len(devices) == 0 {
		return nil, fmt.Errorf("no active devices found for targets")
	}

	// Filter devices based on user preferences
	filteredDevices, err := s.filterDevicesByPreferences(ctx, devices, req.Category)
	if err != nil {
		return nil, fmt.Errorf("failed to filter devices: %w", err)
	}

	// Create notifications for each target user
	notifications := s.createNotifications(req, filteredDevices, senderID)

	// Send Firebase messages
	summary := &models.NotificationSummary{}
	for _, notification := range notifications {
		// Save notification to database first
		result, err := s.notificationCollection.InsertOne(ctx, notification)
		if err != nil {
			fmt.Printf("Failed to save notification: %v\n", err)
			summary.Failed++
			continue
		}
		notification.ID = result.InsertedID.(primitive.ObjectID)

		// Get user devices
		userDevices := s.getDevicesForUser(filteredDevices, notification.UserID)
		if len(userDevices) == 0 {
			s.markNotificationFailed(ctx, notification.ID, "no active devices")
			summary.Failed++
			continue
		}

		// Send to user's devices
		sent := s.sendToUserDevices(ctx, notification, userDevices, req)
		if sent {
			summary.Total++
		} else {
			summary.Failed++
		}
	}

	return summary, nil
}

// SendToUser sends a notification to a specific user
func (s *NotificationService) SendToUser(ctx context.Context, userID primitive.ObjectID, title, body string, category models.NotificationCategory, data map[string]interface{}) error {
	req := &models.SendNotificationRequest{
		UserIDs:  []string{userID.Hex()},
		Title:    title,
		Body:     body,
		Category: category,
		Priority: models.NotificationPriorityNormal,
		Data:     data,
	}

	_, err := s.SendNotification(ctx, req, primitive.NilObjectID)
	return err
}

// GetUserNotifications returns notifications for a user
func (s *NotificationService) GetUserNotifications(ctx context.Context, userID primitive.ObjectID, page, limit int, status string) ([]*models.Notification, error) {
	filter := bson.M{"userId": userID}

	if status != "" {
		filter["status"] = status
	}

	skip := (page - 1) * limit
	opts := options.Find().
		SetSort(bson.D{{Key: "createdAt", Value: -1}}).
		SetSkip(int64(skip)).
		SetLimit(int64(limit))

	cursor, err := s.notificationCollection.Find(ctx, filter, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to find notifications: %w", err)
	}
	defer cursor.Close(ctx)

	notifications := make([]*models.Notification, 0)
	if err = cursor.All(ctx, &notifications); err != nil {
		return nil, fmt.Errorf("failed to decode notifications: %w", err)
	}

	return notifications, nil
}

// MarkAsRead marks a notification as read
func (s *NotificationService) MarkAsRead(ctx context.Context, userID, notificationID primitive.ObjectID) error {
	filter := bson.M{
		"_id":    notificationID,
		"userId": userID,
	}

	now := time.Now()
	update := bson.M{
		"$set": bson.M{
			"status":    models.NotificationStatusRead,
			"readAt":    now,
			"updatedAt": now,
		},
	}

	result, err := s.notificationCollection.UpdateOne(ctx, filter, update)
	if err != nil {
		return fmt.Errorf("failed to mark notification as read: %w", err)
	}

	if result.MatchedCount == 0 {
		return models.ErrNotificationNotFound
	}

	return nil
}

// GetUserPreferences returns notification preferences for a user
func (s *NotificationService) GetUserPreferences(ctx context.Context, userID primitive.ObjectID) (*models.NotificationPreferences, error) {
	filter := bson.M{"userId": userID}

	var prefs models.NotificationPreferences
	if err := s.preferencesCollection.FindOne(ctx, filter).Decode(&prefs); err != nil {
		if err == mongo.ErrNoDocuments {
			// Create default preferences
			return s.createDefaultPreferences(ctx, userID)
		}
		return nil, fmt.Errorf("failed to find preferences: %w", err)
	}

	return &prefs, nil
}

// UpdateUserPreferences updates notification preferences for a user
func (s *NotificationService) UpdateUserPreferences(ctx context.Context, userID primitive.ObjectID, req *models.UpdatePreferencesRequest) (*models.NotificationPreferences, error) {
	filter := bson.M{"userId": userID}

	update := bson.M{
		"$set": bson.M{
			"updatedAt": time.Now(),
		},
	}

	if req.EmailEnabled != nil {
		update["$set"].(bson.M)["emailEnabled"] = *req.EmailEnabled
	}
	if req.PushEnabled != nil {
		update["$set"].(bson.M)["pushEnabled"] = *req.PushEnabled
	}
	if req.InAppEnabled != nil {
		update["$set"].(bson.M)["inAppEnabled"] = *req.InAppEnabled
	}
	if req.SoundEnabled != nil {
		update["$set"].(bson.M)["soundEnabled"] = *req.SoundEnabled
	}
	if req.BadgeEnabled != nil {
		update["$set"].(bson.M)["badgeEnabled"] = *req.BadgeEnabled
	}
	if req.Categories != nil {
		update["$set"].(bson.M)["categories"] = req.Categories
	}
	if req.DevicePreferences != nil {
		update["$set"].(bson.M)["devicePreferences"] = req.DevicePreferences
	}
	if req.QuietHoursEnabled != nil {
		update["$set"].(bson.M)["quietHoursEnabled"] = *req.QuietHoursEnabled
	}
	if req.QuietHoursStart != nil {
		update["$set"].(bson.M)["quietHoursStart"] = *req.QuietHoursStart
	}
	if req.QuietHoursEnd != nil {
		update["$set"].(bson.M)["quietHoursEnd"] = *req.QuietHoursEnd
	}
	if req.Timezone != nil {
		update["$set"].(bson.M)["timezone"] = *req.Timezone
	}

	opts := options.FindOneAndUpdate().SetReturnDocument(options.After).SetUpsert(true)
	var updatedPrefs models.NotificationPreferences
	if err := s.preferencesCollection.FindOneAndUpdate(ctx, filter, update, opts).Decode(&updatedPrefs); err != nil {
		return nil, fmt.Errorf("failed to update preferences: %w", err)
	}

	return &updatedPrefs, nil
}

// GetNotificationStats returns notification statistics for a user
func (s *NotificationService) GetNotificationStats(ctx context.Context, userID primitive.ObjectID) (*models.NotificationSummary, error) {
	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	weekStart := todayStart.AddDate(0, 0, -int(todayStart.Weekday()))

	pipeline := []bson.M{
		{"$match": bson.M{"userId": userID}},
		{
			"$group": bson.M{
				"_id": nil,
				"total": bson.M{"$sum": 1},
				"unread": bson.M{
					"$sum": bson.M{
						"$cond": bson.M{
							"if":   bson.M{"$ne": []interface{}{"$status", models.NotificationStatusRead}},
							"then": 1,
							"else": 0,
						},
					},
				},
				"today": bson.M{
					"$sum": bson.M{
						"$cond": bson.M{
							"if":   bson.M{"$gte": []interface{}{"$createdAt", todayStart}},
							"then": 1,
							"else": 0,
						},
					},
				},
				"thisWeek": bson.M{
					"$sum": bson.M{
						"$cond": bson.M{
							"if":   bson.M{"$gte": []interface{}{"$createdAt", weekStart}},
							"then": 1,
							"else": 0,
						},
					},
				},
				"failed": bson.M{
					"$sum": bson.M{
						"$cond": bson.M{
							"if":   bson.M{"$eq": []interface{}{"$status", models.NotificationStatusFailed}},
							"then": 1,
							"else": 0,
						},
					},
				},
			},
		},
	}

	cursor, err := s.notificationCollection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, fmt.Errorf("failed to aggregate notification stats: %w", err)
	}
	defer cursor.Close(ctx)

	var results []bson.M
	if err = cursor.All(ctx, &results); err != nil {
		return nil, fmt.Errorf("failed to decode stats: %w", err)
	}

	if len(results) == 0 {
		return &models.NotificationSummary{}, nil
	}

	result := results[0]
	return &models.NotificationSummary{
		Total:    getInt64FromBSON(result, "total"),
		Unread:   getInt64FromBSON(result, "unread"),
		Today:    getInt64FromBSON(result, "today"),
		ThisWeek: getInt64FromBSON(result, "thisWeek"),
		Failed:   getInt64FromBSON(result, "failed"),
	}, nil
}

// Helper methods

func (s *NotificationService) resolveTargets(ctx context.Context, req *models.SendNotificationRequest) ([]primitive.ObjectID, []primitive.ObjectID, error) {
	var userIDs []primitive.ObjectID
	var deviceIDs []primitive.ObjectID

	// Convert string IDs to ObjectIDs
	for _, userIDStr := range req.UserIDs {
		if id, err := primitive.ObjectIDFromHex(userIDStr); err == nil {
			userIDs = append(userIDs, id)
		}
	}

	for _, deviceIDStr := range req.DeviceIDs {
		if id, err := primitive.ObjectIDFromHex(deviceIDStr); err == nil {
			deviceIDs = append(deviceIDs, id)
		}
	}

	// TODO: Implement role-based and status-based targeting
	// This would require integration with user service to get users by roles/status

	return userIDs, deviceIDs, nil
}

func (s *NotificationService) filterDevicesByPreferences(ctx context.Context, devices []*models.Device, category models.NotificationCategory) ([]*models.Device, error) {
	var filtered []*models.Device

	for _, device := range devices {
		// Get user preferences
		prefs, err := s.GetUserPreferences(ctx, device.UserID)
		if err != nil {
			// If no preferences found, use default (allow all)
			filtered = append(filtered, device)
			continue
		}

		// Check if push notifications are enabled
		if !prefs.PushEnabled {
			continue
		}

		// Check category preferences
		if allowed, exists := prefs.Categories[category]; exists && !allowed {
			continue
		}

		// TODO: Check quiet hours
		// TODO: Check device-specific preferences

		filtered = append(filtered, device)
	}

	return filtered, nil
}

func (s *NotificationService) createNotifications(req *models.SendNotificationRequest, devices []*models.Device, senderID primitive.ObjectID) []*models.Notification {
	now := time.Now()
	var notifications []*models.Notification

	// Group devices by user
	userDevices := make(map[primitive.ObjectID][]*models.Device)
	for _, device := range devices {
		userDevices[device.UserID] = append(userDevices[device.UserID], device)
	}

	// Create one notification per user
	for userID := range userDevices {
		notification := &models.Notification{
			UserID:   userID,
			Type:     models.NotificationTypePush,
			Category: req.Category,
			Priority: req.Priority,
			Title:    req.Title,
			Body:     req.Body,
			Data:     req.Data,
			ImageURL: req.ImageURL,
			Status:   models.NotificationStatusPending,
			CreatedAt: now,
			UpdatedAt: now,
		}

		// Set action URL
		if req.ActionURL != "" {
			notification.ActionURL = req.ActionURL
		} else if req.ClickAction != "" {
			notification.ActionURL = req.ClickAction
		}

		// Set expiration
		if req.ExpiresIn != nil && *req.ExpiresIn > 0 {
			expiresAt := now.Add(time.Duration(*req.ExpiresIn) * time.Second)
			notification.ExpiresAt = &expiresAt
		}

		// Set creator
		if !senderID.IsZero() {
			notification.CreatedBy = senderID
		}

		notifications = append(notifications, notification)
	}

	return notifications
}

func (s *NotificationService) getDevicesForUser(devices []*models.Device, userID primitive.ObjectID) []*models.Device {
	var userDevices []*models.Device
	for _, device := range devices {
		if device.UserID == userID {
			userDevices = append(userDevices, device)
		}
	}
	return userDevices
}

func (s *NotificationService) sendToUserDevices(ctx context.Context, notification *models.Notification, devices []*models.Device, req *models.SendNotificationRequest) bool {
	// Prepare Firebase payload
	payload := FirebaseNotificationPayload{
		Title:       notification.Title,
		Body:        notification.Body,
		Sound:       req.Sound,
		Badge:       req.Badge,
		ClickAction: notification.ActionURL,
		Data:        notification.Data,
	}

	// Collect FCM tokens
	var tokens []string
	for _, device := range devices {
		if device.FCMToken != "" {
			tokens = append(tokens, device.FCMToken)
		}
	}

	if len(tokens) == 0 {
		s.markNotificationFailed(ctx, notification.ID, "no FCM tokens available")
		return false
	}

	// Send notification
	if len(tokens) == 1 {
		// Single token
		messageID, err := s.firebaseService.SendToToken(ctx, tokens[0], payload)
		if err != nil {
			s.markNotificationFailed(ctx, notification.ID, err.Error())
			return false
		}
		s.markNotificationSent(ctx, notification.ID, messageID)
	} else {
		// Multiple tokens
		response, err := s.firebaseService.SendToMultipleTokens(ctx, tokens, payload)
		if err != nil {
			s.markNotificationFailed(ctx, notification.ID, err.Error())
			return false
		}

		if response.SuccessCount > 0 {
			s.markNotificationSent(ctx, notification.ID, fmt.Sprintf("multicast-%d-success", response.SuccessCount))
		} else {
			s.markNotificationFailed(ctx, notification.ID, "all tokens failed")
			return false
		}
	}

	return true
}

func (s *NotificationService) markNotificationSent(ctx context.Context, notificationID primitive.ObjectID, messageID string) {
	now := time.Now()
	update := bson.M{
		"$set": bson.M{
			"status":       models.NotificationStatusSent,
			"fcmMessageId": messageID,
			"sentAt":       now,
			"updatedAt":    now,
		},
	}
	s.notificationCollection.UpdateByID(ctx, notificationID, update)
}

func (s *NotificationService) markNotificationFailed(ctx context.Context, notificationID primitive.ObjectID, errorMsg string) {
	update := bson.M{
		"$set": bson.M{
			"status":     models.NotificationStatusFailed,
			"error":      errorMsg,
			"updatedAt":  time.Now(),
		},
		"$inc": bson.M{
			"retryCount": 1,
		},
	}
	s.notificationCollection.UpdateByID(ctx, notificationID, update)
}

func (s *NotificationService) createDefaultPreferences(ctx context.Context, userID primitive.ObjectID) (*models.NotificationPreferences, error) {
	prefs := models.GetDefaultNotificationPreferences(userID)

	_, err := s.preferencesCollection.InsertOne(ctx, prefs)
	if err != nil {
		return nil, fmt.Errorf("failed to create default preferences: %w", err)
	}

	return prefs, nil
}

func getInt64FromBSON(data bson.M, key string) int64 {
	if val, ok := data[key]; ok {
		switch v := val.(type) {
		case int:
			return int64(v)
		case int32:
			return int64(v)
		case int64:
			return v
		}
	}
	return 0
}

// FirebaseNotificationPayload represents the payload structure for Firebase
type FirebaseNotificationPayload = NotificationPayload