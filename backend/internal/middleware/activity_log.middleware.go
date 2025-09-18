package middleware

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kodesonik/process-manager/internal/models"
	"github.com/kodesonik/process-manager/internal/services"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ActivityLogMiddleware handles automatic activity logging
type ActivityLogMiddleware struct {
	activityLogService *services.ActivityLogService
}

// NewActivityLogMiddleware creates a new activity log middleware instance
func NewActivityLogMiddleware(activityLogService *services.ActivityLogService) *ActivityLogMiddleware {
	return &ActivityLogMiddleware{
		activityLogService: activityLogService,
	}
}

// responseWriter wraps gin.ResponseWriter to capture response data
type responseWriter struct {
	gin.ResponseWriter
	body       *bytes.Buffer
	statusCode int
}

func (w *responseWriter) Write(b []byte) (int, error) {
	w.body.Write(b)
	return w.ResponseWriter.Write(b)
}

func (w *responseWriter) WriteHeader(statusCode int) {
	w.statusCode = statusCode
	w.ResponseWriter.WriteHeader(statusCode)
}

// LogActivity is a middleware that automatically logs API activities
func (alm *ActivityLogMiddleware) LogActivity() gin.HandlerFunc {
	return func(c *gin.Context) {
		startTime := time.Now()

		// Skip logging for certain paths
		if alm.shouldSkipLogging(c.Request.URL.Path, c.Request.Method) {
			c.Next()
			return
		}

		// Create a wrapped response writer to capture response
		w := &responseWriter{
			ResponseWriter: c.Writer,
			body:           &bytes.Buffer{},
			statusCode:     200,
		}
		c.Writer = w

		// Read and buffer request body for logging
		var requestBody []byte
		if c.Request.Body != nil {
			requestBody, _ = io.ReadAll(c.Request.Body)
			c.Request.Body = io.NopCloser(bytes.NewBuffer(requestBody))
		}

		// Process the request
		c.Next()

		// Calculate duration
		duration := time.Since(startTime).Milliseconds()

		// Determine success based on status code
		success := w.statusCode < 400

		// Get activity details from context
		action, description := alm.determineActionAndDescription(c, w.statusCode, string(requestBody))

		// Skip if no action determined
		if action == "" {
			return
		}

		// Create activity log request
		activityReq := models.ActivityLogRequest{
			Action:      action,
			Description: description,
			Success:     success,
			Duration:    &duration,
		}

		// Add target user information if available
		if targetUserID := alm.extractTargetUserID(c, string(requestBody)); targetUserID != nil {
			activityReq.TargetUserID = targetUserID
			activityReq.TargetName = alm.extractTargetUserName(c, string(requestBody))
		}

		// Add resource information if available
		if resourceType, resourceID := alm.extractResourceInfo(c); resourceType != "" {
			activityReq.ResourceType = resourceType
			activityReq.ResourceID = resourceID
		}

		// Add error message if request failed
		if !success {
			activityReq.ErrorMessage = alm.extractErrorMessage(w.body.String(), w.statusCode)
		}

		// Add additional details
		activityReq.Details = alm.buildActivityDetails(c, string(requestBody), w.body.String(), w.statusCode)

		// Log the activity (don't block the response if logging fails)
		go func() {
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()

			if err := alm.activityLogService.LogActivity(ctx, activityReq, c); err != nil {
				// Log error but don't fail the request
				fmt.Printf("Failed to log activity: %v\n", err)
			}
		}()
	}
}

// shouldSkipLogging determines if a request should be logged
func (alm *ActivityLogMiddleware) shouldSkipLogging(path, method string) bool {
	// Skip health checks
	if path == "/health" {
		return true
	}

	// Skip activity log endpoints to avoid recursive logging
	if strings.HasPrefix(path, "/api/activity-logs") {
		return true
	}

	// Skip GET requests for static data (departments, job-positions) unless admin actions
	if method == "GET" {
		skipPaths := []string{
			"/api/departments",
			"/api/job-positions",
		}
		for _, skipPath := range skipPaths {
			if path == skipPath {
				return true
			}
		}
	}

	// Skip token refresh for now (too frequent)
	if path == "/api/auth/refresh" {
		return true
	}

	return false
}

// determineActionAndDescription determines the action and description based on the request
func (alm *ActivityLogMiddleware) determineActionAndDescription(c *gin.Context, statusCode int, requestBody string) (models.ActivityAction, string) {
	path := c.Request.URL.Path
	method := c.Request.Method

	// Authentication endpoints
	if strings.HasPrefix(path, "/api/auth/") {
		return alm.getAuthAction(path, method, statusCode, requestBody)
	}

	// User management endpoints
	if strings.HasPrefix(path, "/api/users") {
		return alm.getUserAction(path, method, statusCode, requestBody)
	}

	// Department management endpoints
	if strings.HasPrefix(path, "/api/departments") {
		return alm.getDepartmentAction(path, method, statusCode)
	}

	// Job position management endpoints
	if strings.HasPrefix(path, "/api/job-positions") {
		return alm.getJobPositionAction(path, method, statusCode)
	}

	return "", ""
}

// getAuthAction determines action for authentication endpoints
func (alm *ActivityLogMiddleware) getAuthAction(path, method string, statusCode int, requestBody string) (models.ActivityAction, string) {
	switch {
	case strings.Contains(path, "/login") && method == "POST":
		if statusCode == 200 {
			return models.ActionUserLogin, "User logged in successfully"
		}
		return models.ActionLoginFailed, "User login attempt failed"

	case strings.Contains(path, "/logout") && method == "POST":
		return models.ActionUserLogout, "User logged out"

	case strings.Contains(path, "/register/step1") && method == "POST":
		email := alm.extractEmailFromRequest(requestBody)
		return models.ActionUserRegistered, fmt.Sprintf("User registration initiated for %s", email)

	case strings.Contains(path, "/register/step2") && method == "POST":
		return models.ActionOTPVerified, "OTP verified for registration"

	case strings.Contains(path, "/register/step3") && method == "POST":
		if statusCode == 200 {
			return models.ActionUserRegistered, "User registration completed successfully"
		}
		return models.ActionUserRegistered, "User registration completion failed"

	case strings.Contains(path, "/verify-otp") && method == "POST":
		if statusCode == 200 {
			return models.ActionOTPVerified, "OTP verified successfully"
		}
		return models.ActionOTPVerified, "OTP verification failed"

	case strings.Contains(path, "/refresh") && method == "POST":
		return models.ActionTokenRefreshed, "Access token refreshed"

	case strings.Contains(path, "/me") && method == "GET":
		return "", "" // Skip logging for profile retrieval

	case strings.Contains(path, "/me") && method == "PUT":
		return models.ActionUserUpdated, "User updated own profile"

	case strings.Contains(path, "/upload-avatar") && method == "POST":
		if statusCode == 200 {
			return models.ActionUserAvatarUploaded, "User uploaded avatar"
		}
		return models.ActionUserAvatarUploaded, "User avatar upload failed"
	}

	return "", ""
}

// getUserAction determines action for user management endpoints
func (alm *ActivityLogMiddleware) getUserAction(path, method string, statusCode int, requestBody string) (models.ActivityAction, string) {
	switch method {
	case "GET":
		if strings.Contains(path, "/users/") {
			return "", "" // Skip individual user retrieval
		}
		return "", "" // Skip user listing

	case "POST":
		return models.ActionUserUpdated, "User created by admin"

	case "PUT":
		if strings.Contains(path, "/validate") {
			action := alm.extractValidationAction(requestBody)
			if action == "approve" {
				return models.ActionUserApproved, "User registration approved"
			}
			return models.ActionUserRejected, "User registration rejected"
		}

		if strings.Contains(path, "/activate") {
			return models.ActionUserActivated, "User account activated"
		}

		if strings.Contains(path, "/deactivate") {
			return models.ActionUserDeactivated, "User account deactivated"
		}

		if strings.Contains(path, "/role") {
			role := alm.extractRoleFromRequest(requestBody)
			return models.ActionUserRoleChanged, fmt.Sprintf("User role changed to %s", role)
		}

		return models.ActionUserUpdated, "User information updated"

	case "DELETE":
		return models.ActionUserDeleted, "User deleted"
	}

	return "", ""
}

// getDepartmentAction determines action for department management endpoints
func (alm *ActivityLogMiddleware) getDepartmentAction(path, method string, statusCode int) (models.ActivityAction, string) {
	switch method {
	case "GET":
		return "", "" // Skip department listing/retrieval

	case "POST":
		if statusCode == 201 {
			return models.ActionDepartmentCreated, "Department created"
		}
		return models.ActionDepartmentCreated, "Department creation failed"

	case "PUT":
		return models.ActionDepartmentUpdated, "Department updated"

	case "DELETE":
		return models.ActionDepartmentDeleted, "Department deleted"
	}

	return "", ""
}

// getJobPositionAction determines action for job position management endpoints
func (alm *ActivityLogMiddleware) getJobPositionAction(path, method string, statusCode int) (models.ActivityAction, string) {
	switch method {
	case "GET":
		return "", "" // Skip job position listing/retrieval

	case "POST":
		if statusCode == 201 {
			return models.ActionJobPositionCreated, "Job position created"
		}
		return models.ActionJobPositionCreated, "Job position creation failed"

	case "PUT":
		return models.ActionJobPositionUpdated, "Job position updated"

	case "DELETE":
		return models.ActionJobPositionDeleted, "Job position deleted"
	}

	return "", ""
}

// Helper methods for extracting information

func (alm *ActivityLogMiddleware) extractTargetUserID(c *gin.Context, requestBody string) *primitive.ObjectID {
	// Extract from URL parameter
	if userIDStr := c.Param("userId"); userIDStr != "" {
		if userID, err := primitive.ObjectIDFromHex(userIDStr); err == nil {
			return &userID
		}
	}

	// Extract from URL parameter (alternative)
	if idStr := c.Param("id"); idStr != "" && strings.Contains(c.Request.URL.Path, "/users/") {
		if id, err := primitive.ObjectIDFromHex(idStr); err == nil {
			return &id
		}
	}

	return nil
}

func (alm *ActivityLogMiddleware) extractTargetUserName(c *gin.Context, requestBody string) string {
	// Try to extract name from request body
	var requestData map[string]interface{}
	if err := json.Unmarshal([]byte(requestBody), &requestData); err == nil {
		if name, ok := requestData["name"].(string); ok {
			return name
		}
	}

	return ""
}

func (alm *ActivityLogMiddleware) extractResourceInfo(c *gin.Context) (string, *primitive.ObjectID) {
	path := c.Request.URL.Path

	// Determine resource type from path
	if strings.Contains(path, "/users") {
		if idStr := c.Param("userId"); idStr != "" {
			if id, err := primitive.ObjectIDFromHex(idStr); err == nil {
				return "user", &id
			}
		}
		if idStr := c.Param("id"); idStr != "" {
			if id, err := primitive.ObjectIDFromHex(idStr); err == nil {
				return "user", &id
			}
		}
	}

	if strings.Contains(path, "/departments") {
		if idStr := c.Param("id"); idStr != "" {
			if id, err := primitive.ObjectIDFromHex(idStr); err == nil {
				return "department", &id
			}
		}
	}

	if strings.Contains(path, "/job-positions") {
		if idStr := c.Param("id"); idStr != "" {
			if id, err := primitive.ObjectIDFromHex(idStr); err == nil {
				return "job_position", &id
			}
		}
	}

	return "", nil
}

func (alm *ActivityLogMiddleware) extractErrorMessage(responseBody string, statusCode int) string {
	// Try to parse error from response
	var response map[string]interface{}
	if err := json.Unmarshal([]byte(responseBody), &response); err == nil {
		if errorMsg, ok := response["error"].(string); ok {
			return errorMsg
		}
		if message, ok := response["message"].(string); ok {
			return message
		}
	}

	// Fallback to HTTP status text
	return http.StatusText(statusCode)
}

func (alm *ActivityLogMiddleware) extractEmailFromRequest(requestBody string) string {
	var requestData map[string]interface{}
	if err := json.Unmarshal([]byte(requestBody), &requestData); err == nil {
		if email, ok := requestData["email"].(string); ok {
			return email
		}
	}
	return ""
}

func (alm *ActivityLogMiddleware) extractValidationAction(requestBody string) string {
	var requestData map[string]interface{}
	if err := json.Unmarshal([]byte(requestBody), &requestData); err == nil {
		if action, ok := requestData["action"].(string); ok {
			return action
		}
	}
	return ""
}

func (alm *ActivityLogMiddleware) extractRoleFromRequest(requestBody string) string {
	var requestData map[string]interface{}
	if err := json.Unmarshal([]byte(requestBody), &requestData); err == nil {
		if role, ok := requestData["role"].(string); ok {
			return role
		}
	}
	return ""
}

func (alm *ActivityLogMiddleware) buildActivityDetails(c *gin.Context, requestBody, responseBody string, statusCode int) map[string]interface{} {
	details := map[string]interface{}{
		"method":     c.Request.Method,
		"path":       c.Request.URL.Path,
		"statusCode": statusCode,
	}

	// Add query parameters if present
	if len(c.Request.URL.RawQuery) > 0 {
		details["queryParams"] = c.Request.URL.RawQuery
	}

	// Add relevant request data (excluding sensitive information)
	if requestBody != "" && len(requestBody) < 1000 { // Limit size
		var requestData map[string]interface{}
		if err := json.Unmarshal([]byte(requestBody), &requestData); err == nil {
			// Remove sensitive fields
			alm.removeSensitiveFields(requestData)
			if len(requestData) > 0 {
				details["requestData"] = requestData
			}
		}
	}

	return details
}

func (alm *ActivityLogMiddleware) removeSensitiveFields(data map[string]interface{}) {
	sensitiveFields := []string{
		"password", "token", "secret", "key", "otp", "refreshToken", "accessToken",
	}

	for _, field := range sensitiveFields {
		delete(data, field)
	}
}