package helpers

import (
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"strings"
)

// FileValidationResult represents the result of file validation
type FileValidationResult struct {
	Valid       bool
	Error       string
	ContentType string
	Size        int64
	Filename    string
}

// ValidateImageUpload validates an uploaded image file
func ValidateImageUpload(fileHeader *multipart.FileHeader, maxSizeMB int64) *FileValidationResult {
	result := &FileValidationResult{
		Filename: fileHeader.Filename,
		Size:     fileHeader.Size,
	}

	// Check file size
	maxSize := maxSizeMB * 1024 * 1024 // Convert MB to bytes
	if fileHeader.Size > maxSize {
		result.Error = fmt.Sprintf("File size exceeds maximum limit of %dMB", maxSizeMB)
		return result
	}

	if fileHeader.Size == 0 {
		result.Error = "File is empty"
		return result
	}

	// Open the file to read content
	file, err := fileHeader.Open()
	if err != nil {
		result.Error = "Failed to open uploaded file"
		return result
	}
	defer file.Close()

	// Read first 512 bytes to detect content type
	buffer := make([]byte, 512)
	n, err := file.Read(buffer)
	if err != nil && err != io.EOF {
		result.Error = "Failed to read file content"
		return result
	}

	// Detect content type
	contentType := http.DetectContentType(buffer[:n])
	result.ContentType = contentType

	// Validate content type
	allowedTypes := []string{
		"image/jpeg",
		"image/jpg",
		"image/png", 
		"image/gif",
		"image/webp",
	}

	isValidType := false
	for _, allowedType := range allowedTypes {
		if contentType == allowedType {
			isValidType = true
			break
		}
	}

	if !isValidType {
		result.Error = fmt.Sprintf("Invalid file type. Allowed types: %s", strings.Join(allowedTypes, ", "))
		return result
	}

	// Additional filename extension validation
	filename := strings.ToLower(fileHeader.Filename)
	validExtensions := []string{".jpg", ".jpeg", ".png", ".gif", ".webp"}
	
	hasValidExtension := false
	for _, ext := range validExtensions {
		if strings.HasSuffix(filename, ext) {
			hasValidExtension = true
			break
		}
	}

	if !hasValidExtension {
		result.Error = fmt.Sprintf("Invalid file extension. Allowed extensions: %s", strings.Join(validExtensions, ", "))
		return result
	}

	result.Valid = true
	return result
}

// GetFileExtensionFromContentType returns file extension based on content type
func GetFileExtensionFromContentType(contentType string) string {
	switch contentType {
	case "image/jpeg", "image/jpg":
		return ".jpg"
	case "image/png":
		return ".png"
	case "image/gif":
		return ".gif"
	case "image/webp":
		return ".webp"
	default:
		return ".jpg" // Default fallback
	}
}

// SanitizeFilename sanitizes a filename for safe storage
func SanitizeFilename(filename string) string {
	// Remove any directory paths
	filename = strings.ReplaceAll(filename, "/", "")
	filename = strings.ReplaceAll(filename, "\\", "")
	filename = strings.ReplaceAll(filename, "..", "")
	
	// Replace spaces and special characters
	filename = strings.ReplaceAll(filename, " ", "_")
	filename = strings.ToLower(filename)
	
	return filename
}