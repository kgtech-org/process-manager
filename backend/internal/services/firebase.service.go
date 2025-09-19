package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/messaging"
	"google.golang.org/api/option"
)

// FirebaseService handles Firebase operations
type FirebaseService struct {
	app       *firebase.App
	messaging *messaging.Client
}

// FirebaseConfig represents Firebase configuration
type FirebaseConfig struct {
	Type                    string `json:"type"`
	ProjectID               string `json:"project_id"`
	PrivateKeyID            string `json:"private_key_id"`
	PrivateKey              string `json:"private_key"`
	ClientEmail             string `json:"client_email"`
	ClientID                string `json:"client_id"`
	AuthURI                 string `json:"auth_uri"`
	TokenURI                string `json:"token_uri"`
	AuthProviderX509CertURL string `json:"auth_provider_x509_cert_url"`
	ClientX509CertURL       string `json:"client_x509_cert_url"`
	UniverseDomain          string `json:"universe_domain"`
}

// NotificationPayload represents a push notification
type NotificationPayload struct {
	Title       string                 `json:"title"`
	Body        string                 `json:"body"`
	Sound       string                 `json:"sound,omitempty"`
	Badge       *int                   `json:"badge,omitempty"`
	ClickAction string                 `json:"click_action,omitempty"`
	Data        map[string]interface{} `json:"data,omitempty"`
}

// NewFirebaseService initializes a new Firebase service
func NewFirebaseService() (*FirebaseService, error) {
	// Look for Firebase service account file
	serviceAccountPath := os.Getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
	if serviceAccountPath == "" {
		// Default to the file in backend directory
		serviceAccountPath = "yas-process-manager-firebase-adminsdk-fbsvc-f681326705.json"
	}

	// Check if file exists
	if !fileExists(serviceAccountPath) {
		return nil, fmt.Errorf("Firebase service account file not found at: %s", serviceAccountPath)
	}

	// Read and validate the service account file
	config, err := loadFirebaseConfig(serviceAccountPath)
	if err != nil {
		return nil, fmt.Errorf("failed to load Firebase config: %w", err)
	}

	log.Printf("🔥 Initializing Firebase for project: %s", config.ProjectID)

	// Initialize Firebase app
	opt := option.WithCredentialsFile(serviceAccountPath)
	app, err := firebase.NewApp(context.Background(), nil, opt)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize Firebase app: %w", err)
	}

	// Get messaging client
	messagingClient, err := app.Messaging(context.Background())
	if err != nil {
		return nil, fmt.Errorf("failed to get Firebase messaging client: %w", err)
	}

	log.Printf("✅ Firebase service initialized successfully")
	log.Printf("   📱 Project: %s", config.ProjectID)
	log.Printf("   📧 Service Account: %s", config.ClientEmail)

	return &FirebaseService{
		app:       app,
		messaging: messagingClient,
	}, nil
}

// SendToToken sends a notification to a specific FCM token
func (s *FirebaseService) SendToToken(ctx context.Context, token string, payload NotificationPayload) (string, error) {
	message := &messaging.Message{
		Token: token,
		Notification: &messaging.Notification{
			Title: payload.Title,
			Body:  payload.Body,
		},
		Data: convertDataToStringMap(payload.Data),
	}

	// Add Android specific config
	if payload.Sound != "" || payload.ClickAction != "" {
		message.Android = &messaging.AndroidConfig{
			Notification: &messaging.AndroidNotification{
				Sound:       payload.Sound,
				ClickAction: payload.ClickAction,
			},
		}
	}

	// Add APNS (iOS) specific config
	if payload.Badge != nil || payload.Sound != "" {
		message.APNS = &messaging.APNSConfig{
			Payload: &messaging.APNSPayload{
				Aps: &messaging.Aps{
					Badge: payload.Badge,
					Sound: payload.Sound,
				},
			},
		}
	}

	// Add Web push config
	if payload.ClickAction != "" {
		message.Webpush = &messaging.WebpushConfig{
			Notification: &messaging.WebpushNotification{
				Actions: []*messaging.WebpushNotificationAction{
					{
						Action: "open_url",
						Title:  "Open",
					},
				},
			},
			FCMOptions: &messaging.WebpushFCMOptions{
				Link: payload.ClickAction,
			},
		}
	}

	response, err := s.messaging.Send(ctx, message)
	if err != nil {
		return "", fmt.Errorf("failed to send FCM message: %w", err)
	}

	log.Printf("✅ FCM message sent successfully: %s", response)
	return response, nil
}

// SendToMultipleTokens sends a notification to multiple FCM tokens
func (s *FirebaseService) SendToMultipleTokens(ctx context.Context, tokens []string, payload NotificationPayload) (*messaging.BatchResponse, error) {
	if len(tokens) == 0 {
		return nil, fmt.Errorf("no tokens provided")
	}

	message := &messaging.MulticastMessage{
		Tokens: tokens,
		Notification: &messaging.Notification{
			Title: payload.Title,
			Body:  payload.Body,
		},
		Data: convertDataToStringMap(payload.Data),
	}

	// Add platform-specific configs
	if payload.Sound != "" || payload.ClickAction != "" {
		message.Android = &messaging.AndroidConfig{
			Notification: &messaging.AndroidNotification{
				Sound:       payload.Sound,
				ClickAction: payload.ClickAction,
			},
		}
	}

	if payload.Badge != nil || payload.Sound != "" {
		message.APNS = &messaging.APNSConfig{
			Payload: &messaging.APNSPayload{
				Aps: &messaging.Aps{
					Badge: payload.Badge,
					Sound: payload.Sound,
				},
			},
		}
	}

	if payload.ClickAction != "" {
		message.Webpush = &messaging.WebpushConfig{
			Notification: &messaging.WebpushNotification{
				Actions: []*messaging.WebpushNotificationAction{
					{
						Action: "open_url",
						Title:  "Open",
					},
				},
			},
			FCMOptions: &messaging.WebpushFCMOptions{
				Link: payload.ClickAction,
			},
		}
	}

	response, err := s.messaging.SendMulticast(ctx, message)
	if err != nil {
		return nil, fmt.Errorf("failed to send FCM multicast message: %w", err)
	}

	log.Printf("✅ FCM multicast sent - Success: %d, Failure: %d", response.SuccessCount, response.FailureCount)
	return response, nil
}

// ValidateToken validates an FCM token
func (s *FirebaseService) ValidateToken(ctx context.Context, token string) error {
	// Simple validation - check if token is not empty and has reasonable length
	if token == "" {
		return fmt.Errorf("FCM token cannot be empty")
	}
	if len(token) < 10 {
		return fmt.Errorf("FCM token too short")
	}

	// For now, we accept any non-empty token since we can't do dry-run validation
	// In production, you might want to maintain a cache of invalid tokens
	return nil
}

// GetProjectID returns the Firebase project ID
func (s *FirebaseService) GetProjectID() string {
	// This would require storing the config, but for now we can get it from env or file
	if projectID := os.Getenv("FIREBASE_PROJECT_ID"); projectID != "" {
		return projectID
	}
	return "yas-process-manager" // fallback to known project ID
}

// Health checks Firebase service health
func (s *FirebaseService) Health(ctx context.Context) error {
	// Simple health check - verify that the messaging client is available
	if s.messaging == nil {
		return fmt.Errorf("Firebase messaging client is not initialized")
	}

	// For now, we just check if the client exists
	// In production, you might want to send a test message to a known valid token
	return nil
}

// Helper functions

func fileExists(path string) bool {
	_, err := os.Stat(path)
	return !os.IsNotExist(err)
}

func loadFirebaseConfig(path string) (*FirebaseConfig, error) {
	// Get absolute path
	absPath, err := filepath.Abs(path)
	if err != nil {
		return nil, fmt.Errorf("failed to get absolute path: %w", err)
	}

	data, err := os.ReadFile(absPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read Firebase config file: %w", err)
	}

	var config FirebaseConfig
	if err := json.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("failed to parse Firebase config JSON: %w", err)
	}

	// Validate required fields
	if config.ProjectID == "" {
		return nil, fmt.Errorf("project_id is required in Firebase config")
	}
	if config.ClientEmail == "" {
		return nil, fmt.Errorf("client_email is required in Firebase config")
	}
	if config.PrivateKey == "" {
		return nil, fmt.Errorf("private_key is required in Firebase config")
	}

	return &config, nil
}

func convertDataToStringMap(data map[string]interface{}) map[string]string {
	if data == nil {
		return nil
	}

	result := make(map[string]string)
	for k, v := range data {
		if str, ok := v.(string); ok {
			result[k] = str
		} else {
			// Convert other types to JSON string
			if bytes, err := json.Marshal(v); err == nil {
				result[k] = string(bytes)
			}
		}
	}
	return result
}

func isInvalidTokenError(err error) bool {
	// Check if the error is related to invalid token (expected for health check)
	return err != nil && (
		err.Error() == "invalid-registration-token" ||
		err.Error() == "registration-token-not-registered")
}