package services

import (
	"context"
	"fmt"
	"net"
	"time"

	"github.com/kodesonik/process-manager/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// DeviceService handles device management operations
type DeviceService struct {
	deviceCollection *mongo.Collection
	firebaseService  *FirebaseService
}

// NewDeviceService creates a new device service
func NewDeviceService(db *DatabaseService, firebaseService *FirebaseService) *DeviceService {
	collection := db.Collection("devices")

	// Create indexes
	ctx := context.Background()
	indexes := []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "userId", Value: 1}, {Key: "deviceUuid", Value: 1}},
			Options: options.Index().SetUnique(true),
		},
		{
			Keys: bson.D{{Key: "userId", Value: 1}},
		},
		{
			Keys: bson.D{{Key: "deviceUuid", Value: 1}},
		},
		{
			Keys: bson.D{{Key: "fcmToken", Value: 1}},
		},
		{
			Keys: bson.D{{Key: "isActive", Value: 1}},
		},
		{
			Keys: bson.D{{Key: "lastActiveAt", Value: 1}},
		},
	}

	if _, err := collection.Indexes().CreateMany(ctx, indexes); err != nil {
		// Log error but don't fail service creation
		fmt.Printf("Warning: Failed to create device indexes: %v\n", err)
	}

	return &DeviceService{
		deviceCollection: collection,
		firebaseService:  firebaseService,
	}
}

// RegisterDevice registers a new device for push notifications
func (s *DeviceService) RegisterDevice(ctx context.Context, userID primitive.ObjectID, req *models.DeviceRegistrationRequest, ipAddress string) (*models.Device, error) {
	// Validate device type
	if !models.IsValidDeviceType(req.DeviceType) {
		return nil, models.ErrInvalidDeviceType
	}

	// Validate FCM token with Firebase
	if err := s.firebaseService.ValidateToken(ctx, req.FCMToken); err != nil {
		return nil, models.ErrInvalidFCMToken
	}

	// Check if device already exists
	existing, err := s.GetDeviceByUUID(ctx, userID, req.DeviceUUID)
	if err == nil {
		// Device exists, update it
		return s.updateExistingDevice(ctx, existing, req, ipAddress)
	} else if err != models.ErrDeviceNotFound {
		return nil, fmt.Errorf("failed to check existing device: %w", err)
	}

	// Check device limit per user (e.g., max 10 devices)
	deviceCount, err := s.GetUserDeviceCount(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to count user devices: %w", err)
	}
	if deviceCount >= 10 {
		return nil, models.ErrMaxDevicesExceeded
	}

	// Create new device
	now := time.Now()
	device := &models.Device{
		UserID:       userID,
		DeviceUUID:   req.DeviceUUID,
		FCMToken:     req.FCMToken,
		DeviceType:   req.DeviceType,
		DeviceName:   req.DeviceName,
		Browser:      req.Browser,
		Platform:     req.Platform,
		UserAgent:    req.UserAgent,
		IPAddress:    sanitizeIP(ipAddress),
		IsActive:     true,
		LastActiveAt: now,
		RegisteredAt: now,
		UpdatedAt:    now,
	}

	result, err := s.deviceCollection.InsertOne(ctx, device)
	if err != nil {
		if mongo.IsDuplicateKeyError(err) {
			return nil, models.ErrDeviceExists
		}
		return nil, fmt.Errorf("failed to insert device: %w", err)
	}

	device.ID = result.InsertedID.(primitive.ObjectID)
	return device, nil
}

// UpdateDeviceToken updates the FCM token for a device
func (s *DeviceService) UpdateDeviceToken(ctx context.Context, userID primitive.ObjectID, deviceUUID, newToken string) error {
	// Validate FCM token with Firebase
	if err := s.firebaseService.ValidateToken(ctx, newToken); err != nil {
		return models.ErrInvalidFCMToken
	}

	filter := bson.M{
		"userId":     userID,
		"deviceUuid": deviceUUID,
	}

	update := bson.M{
		"$set": bson.M{
			"fcmToken":     newToken,
			"lastActiveAt": time.Now(),
			"updatedAt":    time.Now(),
		},
	}

	result, err := s.deviceCollection.UpdateOne(ctx, filter, update)
	if err != nil {
		return fmt.Errorf("failed to update device token: %w", err)
	}

	if result.MatchedCount == 0 {
		return models.ErrDeviceNotFound
	}

	return nil
}

// GetUserDevices returns all devices for a user
func (s *DeviceService) GetUserDevices(ctx context.Context, userID primitive.ObjectID) ([]*models.Device, error) {
	filter := bson.M{"userId": userID}

	cursor, err := s.deviceCollection.Find(ctx, filter, options.Find().SetSort(bson.D{{Key: "registeredAt", Value: -1}}))
	if err != nil {
		return nil, fmt.Errorf("failed to find user devices: %w", err)
	}
	defer cursor.Close(ctx)

	var devices []*models.Device
	if err = cursor.All(ctx, &devices); err != nil {
		return nil, fmt.Errorf("failed to decode devices: %w", err)
	}

	return devices, nil
}

// GetActiveUserDevices returns only active devices for a user
func (s *DeviceService) GetActiveUserDevices(ctx context.Context, userID primitive.ObjectID) ([]*models.Device, error) {
	filter := bson.M{
		"userId":   userID,
		"isActive": true,
	}

	cursor, err := s.deviceCollection.Find(ctx, filter, options.Find().SetSort(bson.D{{Key: "lastActiveAt", Value: -1}}))
	if err != nil {
		return nil, fmt.Errorf("failed to find active user devices: %w", err)
	}
	defer cursor.Close(ctx)

	var devices []*models.Device
	if err = cursor.All(ctx, &devices); err != nil {
		return nil, fmt.Errorf("failed to decode devices: %w", err)
	}

	return devices, nil
}

// GetDeviceByUUID returns a device by its UUID and user ID
func (s *DeviceService) GetDeviceByUUID(ctx context.Context, userID primitive.ObjectID, deviceUUID string) (*models.Device, error) {
	filter := bson.M{
		"userId":     userID,
		"deviceUuid": deviceUUID,
	}

	var device models.Device
	if err := s.deviceCollection.FindOne(ctx, filter).Decode(&device); err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, models.ErrDeviceNotFound
		}
		return nil, fmt.Errorf("failed to find device: %w", err)
	}

	return &device, nil
}

// GetDevicesByIDs returns devices by their IDs
func (s *DeviceService) GetDevicesByIDs(ctx context.Context, deviceIDs []primitive.ObjectID) ([]*models.Device, error) {
	filter := bson.M{
		"_id": bson.M{"$in": deviceIDs},
	}

	cursor, err := s.deviceCollection.Find(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to find devices by IDs: %w", err)
	}
	defer cursor.Close(ctx)

	var devices []*models.Device
	if err = cursor.All(ctx, &devices); err != nil {
		return nil, fmt.Errorf("failed to decode devices: %w", err)
	}

	return devices, nil
}

// DeregisterDevice removes a device
func (s *DeviceService) DeregisterDevice(ctx context.Context, userID primitive.ObjectID, deviceUUID string) error {
	filter := bson.M{
		"userId":     userID,
		"deviceUuid": deviceUUID,
	}

	result, err := s.deviceCollection.DeleteOne(ctx, filter)
	if err != nil {
		return fmt.Errorf("failed to delete device: %w", err)
	}

	if result.DeletedCount == 0 {
		return models.ErrDeviceNotFound
	}

	return nil
}

// DeactivateDevice marks a device as inactive
func (s *DeviceService) DeactivateDevice(ctx context.Context, userID primitive.ObjectID, deviceUUID string) error {
	filter := bson.M{
		"userId":     userID,
		"deviceUuid": deviceUUID,
	}

	update := bson.M{
		"$set": bson.M{
			"isActive":  false,
			"updatedAt": time.Now(),
		},
	}

	result, err := s.deviceCollection.UpdateOne(ctx, filter, update)
	if err != nil {
		return fmt.Errorf("failed to deactivate device: %w", err)
	}

	if result.MatchedCount == 0 {
		return models.ErrDeviceNotFound
	}

	return nil
}

// UpdateLastActive updates the last active timestamp for a device
func (s *DeviceService) UpdateLastActive(ctx context.Context, userID primitive.ObjectID, deviceUUID string) error {
	filter := bson.M{
		"userId":     userID,
		"deviceUuid": deviceUUID,
	}

	update := bson.M{
		"$set": bson.M{
			"lastActiveAt": time.Now(),
			"updatedAt":    time.Now(),
		},
	}

	_, err := s.deviceCollection.UpdateOne(ctx, filter, update)
	if err != nil {
		return fmt.Errorf("failed to update last active: %w", err)
	}

	return nil
}

// GetUserDeviceCount returns the number of devices for a user
func (s *DeviceService) GetUserDeviceCount(ctx context.Context, userID primitive.ObjectID) (int64, error) {
	filter := bson.M{"userId": userID}

	count, err := s.deviceCollection.CountDocuments(ctx, filter)
	if err != nil {
		return 0, fmt.Errorf("failed to count user devices: %w", err)
	}

	return count, nil
}

// CleanupInactiveDevices removes devices that haven't been active for a specified duration
func (s *DeviceService) CleanupInactiveDevices(ctx context.Context, inactiveDuration time.Duration) (int64, error) {
	cutoffTime := time.Now().Add(-inactiveDuration)

	filter := bson.M{
		"lastActiveAt": bson.M{"$lt": cutoffTime},
	}

	result, err := s.deviceCollection.DeleteMany(ctx, filter)
	if err != nil {
		return 0, fmt.Errorf("failed to cleanup inactive devices: %w", err)
	}

	return result.DeletedCount, nil
}

// GetDevicesForNotification returns active devices for users that should receive notifications
func (s *DeviceService) GetDevicesForNotification(ctx context.Context, userIDs []primitive.ObjectID, deviceIDs []primitive.ObjectID) ([]*models.Device, error) {
	var filter bson.M

	if len(deviceIDs) > 0 {
		// Target specific devices
		filter = bson.M{
			"_id":      bson.M{"$in": deviceIDs},
			"isActive": true,
		}
	} else if len(userIDs) > 0 {
		// Target users' active devices
		filter = bson.M{
			"userId":   bson.M{"$in": userIDs},
			"isActive": true,
		}
	} else {
		return nil, fmt.Errorf("no target users or devices specified")
	}

	cursor, err := s.deviceCollection.Find(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to find devices for notification: %w", err)
	}
	defer cursor.Close(ctx)

	var devices []*models.Device
	if err = cursor.All(ctx, &devices); err != nil {
		return nil, fmt.Errorf("failed to decode devices: %w", err)
	}

	return devices, nil
}

// Private helper methods

func (s *DeviceService) updateExistingDevice(ctx context.Context, existing *models.Device, req *models.DeviceRegistrationRequest, ipAddress string) (*models.Device, error) {
	now := time.Now()

	update := bson.M{
		"$set": bson.M{
			"fcmToken":     req.FCMToken,
			"deviceName":   req.DeviceName,
			"browser":      req.Browser,
			"platform":     req.Platform,
			"userAgent":    req.UserAgent,
			"ipAddress":    sanitizeIP(ipAddress),
			"isActive":     true,
			"lastActiveAt": now,
			"updatedAt":    now,
		},
	}

	filter := bson.M{
		"userId":     existing.UserID,
		"deviceUuid": existing.DeviceUUID,
	}

	_, err := s.deviceCollection.UpdateOne(ctx, filter, update)
	if err != nil {
		return nil, fmt.Errorf("failed to update existing device: %w", err)
	}

	// Return updated device
	existing.FCMToken = req.FCMToken
	existing.DeviceName = req.DeviceName
	existing.Browser = req.Browser
	existing.Platform = req.Platform
	existing.UserAgent = req.UserAgent
	existing.IPAddress = sanitizeIP(ipAddress)
	existing.IsActive = true
	existing.LastActiveAt = now
	existing.UpdatedAt = now

	return existing, nil
}

func sanitizeIP(ipAddress string) string {
	// Parse and validate IP address
	if ip := net.ParseIP(ipAddress); ip != nil {
		return ip.String()
	}
	return ""
}