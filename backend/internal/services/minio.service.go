package services

import (
	"context"
	"fmt"
	"io"
	"log"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

// MinIOService handles object storage operations with MinIO
type MinIOService struct {
	client       *minio.Client
	bucketName   string
	endpoint     string
	useSSL       bool
	publicURL    string
}

var minioService *MinIOService

// InitMinIOService initializes the MinIO service
func InitMinIOService() (*MinIOService, error) {
	if minioService != nil {
		return minioService, nil
	}

	endpoint := os.Getenv("MINIO_ENDPOINT")
	if endpoint == "" {
		endpoint = "localhost:9000"
	}

	accessKey := os.Getenv("MINIO_ACCESS_KEY")
	if accessKey == "" {
		accessKey = "minioadmin"
	}

	secretKey := os.Getenv("MINIO_SECRET_KEY")
	if secretKey == "" {
		secretKey = "minioadmin"
	}

	bucketName := os.Getenv("MINIO_BUCKET_NAME")
	if bucketName == "" {
		bucketName = "process-manager"
	}

	useSSL := os.Getenv("MINIO_USE_SSL") == "true"

	// Use UPLOAD_BASE_URL for file URLs (served through nginx)
	publicURL := os.Getenv("UPLOAD_BASE_URL")
	if publicURL == "" {
		// Fallback to MINIO_PUBLIC_URL for backward compatibility
		publicURL = os.Getenv("MINIO_PUBLIC_URL")
		if publicURL == "" {
			protocol := "http"
			if useSSL {
				protocol = "https"
			}
			publicURL = fmt.Sprintf("%s://%s", protocol, endpoint)
		}
	}

	// Initialize MinIO client
	client, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: useSSL,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to initialize MinIO client: %w", err)
	}

	minioService = &MinIOService{
		client:     client,
		bucketName: bucketName,
		endpoint:   endpoint,
		useSSL:     useSSL,
		publicURL:  publicURL,
	}

	// Create bucket if it doesn't exist
	ctx := context.Background()
	exists, err := client.BucketExists(ctx, bucketName)
	if err != nil {
		return nil, fmt.Errorf("failed to check if bucket exists: %w", err)
	}

	if !exists {
		err = client.MakeBucket(ctx, bucketName, minio.MakeBucketOptions{})
		if err != nil {
			return nil, fmt.Errorf("failed to create bucket: %w", err)
		}
		log.Printf("✅ MinIO bucket '%s' created successfully", bucketName)
	}

	// Always set/update bucket policy to allow public read access for avatars and documents
	policy := fmt.Sprintf(`{
		"Version": "2012-10-17",
		"Statement": [
			{
				"Effect": "Allow",
				"Principal": "*",
				"Action": "s3:GetObject",
				"Resource": "arn:aws:s3:::%s/avatars/*"
			},
			{
				"Effect": "Allow",
				"Principal": "*",
				"Action": "s3:GetObject",
				"Resource": "arn:aws:s3:::%s/documents/*"
			}
		]
	}`, bucketName, bucketName)

	err = client.SetBucketPolicy(ctx, bucketName, policy)
	if err != nil {
		log.Printf("⚠️  Warning: Failed to set bucket policy: %v", err)
	} else {
		log.Printf("✅ MinIO bucket policy updated for public access (avatars & documents)")
	}

	log.Printf("✅ MinIO service initialized successfully")
	log.Printf("   📦 Bucket: %s", bucketName)
	log.Printf("   🔗 Endpoint: %s", endpoint)
	log.Printf("   🌐 Public URL: %s", publicURL)

	return minioService, nil
}

// GetMinIOService returns the MinIO service instance
func GetMinIOService() *MinIOService {
	if minioService == nil {
		log.Fatal("MinIO service not initialized. Call InitMinIOService() first")
	}
	return minioService
}

// UploadAvatar uploads a user avatar image to MinIO
func (s *MinIOService) UploadAvatar(ctx context.Context, userID string, reader io.Reader, size int64, contentType string, filename string) (string, error) {
	// Generate object key for avatar
	fileExt := filepath.Ext(filename)
	if fileExt == "" {
		// Default to jpg if no extension
		fileExt = ".jpg"
	}
	
	objectKey := fmt.Sprintf("avatars/%s%s", userID, fileExt)

	// Upload options
	opts := minio.PutObjectOptions{
		ContentType: contentType,
		UserMetadata: map[string]string{
			"uploaded-by": userID,
			"upload-time": time.Now().Format(time.RFC3339),
		},
	}

	// Upload the file
	info, err := s.client.PutObject(ctx, s.bucketName, objectKey, reader, size, opts)
	if err != nil {
		return "", fmt.Errorf("failed to upload avatar: %w", err)
	}

	log.Printf("✅ Avatar uploaded successfully: %s (size: %d bytes)", info.Key, info.Size)

	// Return the public URL through nginx /files/ path
	avatarURL := fmt.Sprintf("%s/%s/%s", s.publicURL, s.bucketName, objectKey)
	return avatarURL, nil
}

// DeleteAvatar removes a user avatar from MinIO
func (s *MinIOService) DeleteAvatar(ctx context.Context, avatarURL string) error {
	if avatarURL == "" {
		return nil // Nothing to delete
	}

	// Extract object key from URL
	objectKey, err := s.extractObjectKeyFromURL(avatarURL)
	if err != nil {
		return fmt.Errorf("failed to extract object key from URL: %w", err)
	}

	// Delete the object
	err = s.client.RemoveObject(ctx, s.bucketName, objectKey, minio.RemoveObjectOptions{})
	if err != nil {
		return fmt.Errorf("failed to delete avatar: %w", err)
	}

	log.Printf("✅ Avatar deleted successfully: %s", objectKey)
	return nil
}

// GetAvatarURL returns the public URL for a user's avatar
func (s *MinIOService) GetAvatarURL(userID string, fileExt string) string {
	if fileExt == "" {
		fileExt = ".jpg"
	}
	objectKey := fmt.Sprintf("avatars/%s%s", userID, fileExt)
	return fmt.Sprintf("%s/%s/%s", s.publicURL, s.bucketName, objectKey)
}

// CheckAvatarExists checks if a user's avatar exists in MinIO
func (s *MinIOService) CheckAvatarExists(ctx context.Context, userID string) (bool, string, error) {
	// Check for common image extensions
	extensions := []string{".jpg", ".jpeg", ".png", ".gif", ".webp"}
	
	for _, ext := range extensions {
		objectKey := fmt.Sprintf("avatars/%s%s", userID, ext)
		_, err := s.client.StatObject(ctx, s.bucketName, objectKey, minio.StatObjectOptions{})
		if err == nil {
			// Avatar exists
			avatarURL := fmt.Sprintf("%s/%s/%s", s.publicURL, s.bucketName, objectKey)
			return true, avatarURL, nil
		}
	}
	
	return false, "", nil
}

// extractObjectKeyFromURL extracts the MinIO object key from a public URL
func (s *MinIOService) extractObjectKeyFromURL(avatarURL string) (string, error) {
	if avatarURL == "" {
		return "", fmt.Errorf("empty avatar URL")
	}

	parsedURL, err := url.Parse(avatarURL)
	if err != nil {
		return "", fmt.Errorf("invalid avatar URL: %w", err)
	}

	// For URLs like http://localhost/files/avatars/user123.jpg
	// Remove the /files/ prefix to get the object key
	path := strings.TrimPrefix(parsedURL.Path, "/files/")
	path = strings.TrimPrefix(path, "/")

	// If the URL doesn't contain /files/, try the old format with bucket name
	if path == strings.TrimPrefix(parsedURL.Path, "/") {
		path = strings.TrimPrefix(parsedURL.Path, "/"+s.bucketName+"/")
		path = strings.TrimPrefix(path, "/")
	}

	if path == "" || path == avatarURL {
		return "", fmt.Errorf("could not extract object key from URL")
	}

	return path, nil
}

// Health checks MinIO connectivity
func (s *MinIOService) Health(ctx context.Context) error {
	// Check if bucket exists as a health check
	exists, err := s.client.BucketExists(ctx, s.bucketName)
	if err != nil {
		return fmt.Errorf("MinIO health check failed: %w", err)
	}
	if !exists {
		return fmt.Errorf("MinIO bucket '%s' does not exist", s.bucketName)
	}
	return nil
}

// GetUploadLimits returns the file upload limits
func (s *MinIOService) GetUploadLimits() (int64, []string) {
	maxSize := int64(5 * 1024 * 1024) // 5MB default
	if envSize := os.Getenv("MAX_AVATAR_SIZE_MB"); envSize != "" {
		// Could parse this from environment if needed
	}

	allowedTypes := []string{
		"image/jpeg",
		"image/jpg",
		"image/png",
		"image/gif",
		"image/webp",
	}

	return maxSize, allowedTypes
}

// UploadAnnexFile uploads a file for a document annex to MinIO
func (s *MinIOService) UploadAnnexFile(ctx context.Context, documentID string, annexID string, fileID string, reader io.Reader, size int64, contentType string, filename string) (string, error) {
	// Generate object key for annex file
	fileExt := filepath.Ext(filename)
	baseName := strings.TrimSuffix(filename, fileExt)

	// Clean filename to make it URL-safe
	baseName = strings.ReplaceAll(baseName, " ", "_")

	objectKey := fmt.Sprintf("documents/%s/annexes/%s/%s%s", documentID, annexID, fileID, fileExt)

	// Upload options
	opts := minio.PutObjectOptions{
		ContentType: contentType,
		UserMetadata: map[string]string{
			"document-id": documentID,
			"annex-id":    annexID,
			"file-id":     fileID,
			"filename":    filename,
			"upload-time": time.Now().Format(time.RFC3339),
		},
	}

	// Upload the file
	info, err := s.client.PutObject(ctx, s.bucketName, objectKey, reader, size, opts)
	if err != nil {
		return "", fmt.Errorf("failed to upload annex file: %w", err)
	}

	log.Printf("✅ Annex file uploaded successfully: %s (size: %d bytes)", info.Key, info.Size)

	// Return the public URL
	fileURL := fmt.Sprintf("%s/%s/%s", s.publicURL, s.bucketName, objectKey)
	return fileURL, nil
}

// DeleteAnnexFile removes an annex file from MinIO
func (s *MinIOService) DeleteAnnexFile(ctx context.Context, fileURL string) error {
	if fileURL == "" {
		return nil // Nothing to delete
	}

	// Extract object key from URL
	objectKey, err := s.extractObjectKeyFromURL(fileURL)
	if err != nil {
		return fmt.Errorf("failed to extract object key from URL: %w", err)
	}

	// Delete the object
	err = s.client.RemoveObject(ctx, s.bucketName, objectKey, minio.RemoveObjectOptions{})
	if err != nil {
		return fmt.Errorf("failed to delete annex file: %w", err)
	}

	log.Printf("✅ Annex file deleted successfully: %s", objectKey)
	return nil
}