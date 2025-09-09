package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kodesonik/process-manager/internal/models"
	"github.com/kodesonik/process-manager/internal/services"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// AuthMiddleware handles JWT authentication
type AuthMiddleware struct {
	jwtService  *services.JWTService
	userService *services.UserService
}

// NewAuthMiddleware creates a new auth middleware instance
func NewAuthMiddleware(jwtService *services.JWTService, userService *services.UserService) *AuthMiddleware {
	return &AuthMiddleware{
		jwtService:  jwtService,
		userService: userService,
	}
}

// RequireAuth middleware that requires valid authentication
func (am *AuthMiddleware) RequireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Extract token from Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error":   "Authorization header is required",
				"code":    "MISSING_AUTH_HEADER",
			})
			c.Abort()
			return
		}

		// Extract token from "Bearer <token>" format
		token, err := am.jwtService.ExtractTokenFromHeader(authHeader)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error":   "Invalid authorization header format",
				"code":    "INVALID_AUTH_HEADER",
			})
			c.Abort()
			return
		}

		// Validate access token
		claims, err := am.jwtService.ValidateAccessToken(token)
		if err != nil {
			var errorCode string
			var statusCode int

			switch err {
			case services.ErrExpiredToken:
				errorCode = "TOKEN_EXPIRED"
				statusCode = http.StatusUnauthorized
			case services.ErrInvalidToken, services.ErrInvalidClaims:
				errorCode = "INVALID_TOKEN"
				statusCode = http.StatusUnauthorized
			default:
				errorCode = "AUTH_ERROR"
				statusCode = http.StatusUnauthorized
			}

			c.JSON(statusCode, gin.H{
				"success": false,
				"error":   "Token validation failed",
				"code":    errorCode,
			})
			c.Abort()
			return
		}

		// Get user from database to ensure they still exist and are active
		user, err := am.userService.GetUserByID(c.Request.Context(), claims.UserID)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error":   "User not found or inactive",
				"code":    "USER_NOT_FOUND",
			})
			c.Abort()
			return
		}

		// Set user information in context for use by handlers
		c.Set("user", user)
		c.Set("user_id", user.ID)
		c.Set("user_role", user.Role)
		c.Set("claims", claims)

		c.Next()
	}
}

// RequireRole middleware that requires specific user roles
func (am *AuthMiddleware) RequireRole(allowedRoles ...models.UserRole) gin.HandlerFunc {
	return func(c *gin.Context) {
		// First require authentication
		am.RequireAuth()(c)
		if c.IsAborted() {
			return
		}

		// Get user role from context
		userInterface, exists := c.Get("user")
		if !exists {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "User context not found",
				"code":    "INTERNAL_ERROR",
			})
			c.Abort()
			return
		}

		user, ok := userInterface.(*models.User)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "Invalid user context",
				"code":    "INTERNAL_ERROR",
			})
			c.Abort()
			return
		}

		// Check if user has required role
		hasRequiredRole := false
		for _, allowedRole := range allowedRoles {
			if user.Role == allowedRole {
				hasRequiredRole = true
				break
			}
		}

		if !hasRequiredRole {
			c.JSON(http.StatusForbidden, gin.H{
				"success":       false,
				"error":         "Insufficient permissions",
				"code":          "INSUFFICIENT_PERMISSIONS",
				"required_role": allowedRoles,
				"user_role":     user.Role,
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequireAdmin middleware that requires admin role
func (am *AuthMiddleware) RequireAdmin() gin.HandlerFunc {
	return am.RequireRole(models.RoleAdmin)
}

// RequireManagerOrAdmin middleware that requires manager or admin role
func (am *AuthMiddleware) RequireManagerOrAdmin() gin.HandlerFunc {
	return am.RequireRole(models.RoleManager, models.RoleAdmin)
}

// RequireVerified middleware that requires email verification
func (am *AuthMiddleware) RequireVerified() gin.HandlerFunc {
	return func(c *gin.Context) {
		// First require authentication
		am.RequireAuth()(c)
		if c.IsAborted() {
			return
		}

		// Get user from context
		userInterface, exists := c.Get("user")
		if !exists {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "User context not found",
				"code":    "INTERNAL_ERROR",
			})
			c.Abort()
			return
		}

		user, ok := userInterface.(*models.User)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "Invalid user context",
				"code":    "INTERNAL_ERROR",
			})
			c.Abort()
			return
		}

		// Check if user is verified
		if !user.Verified {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"error":   "Email verification required",
				"code":    "EMAIL_NOT_VERIFIED",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// OptionalAuth middleware that extracts user info if token is provided but doesn't require it
func (am *AuthMiddleware) OptionalAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			// No auth header, continue without setting user context
			c.Next()
			return
		}

		// Try to extract and validate token
		token, err := am.jwtService.ExtractTokenFromHeader(authHeader)
		if err != nil {
			// Invalid header format, continue without setting user context
			c.Next()
			return
		}

		// Try to validate token
		claims, err := am.jwtService.ValidateAccessToken(token)
		if err != nil {
			// Invalid token, continue without setting user context
			c.Next()
			return
		}

		// Try to get user
		user, err := am.userService.GetUserByID(c.Request.Context(), claims.UserID)
		if err != nil {
			// User not found, continue without setting user context
			c.Next()
			return
		}

		// Set user information in context
		c.Set("user", user)
		c.Set("user_id", user.ID)
		c.Set("user_role", user.Role)
		c.Set("claims", claims)

		c.Next()
	}
}

// GetCurrentUser helper function to get current user from context
func GetCurrentUser(c *gin.Context) (*models.User, bool) {
	userInterface, exists := c.Get("user")
	if !exists {
		return nil, false
	}

	user, ok := userInterface.(*models.User)
	if !ok {
		return nil, false
	}

	return user, true
}

// GetCurrentUserID helper function to get current user ID from context
func GetCurrentUserID(c *gin.Context) (primitive.ObjectID, bool) {
	userIDInterface, exists := c.Get("user_id")
	if !exists {
		return primitive.NilObjectID, false
	}

	userID, ok := userIDInterface.(primitive.ObjectID)
	if !ok {
		return primitive.NilObjectID, false
	}

	return userID, true
}

// GetCurrentUserRole helper function to get current user role from context
func GetCurrentUserRole(c *gin.Context) (models.UserRole, bool) {
	roleInterface, exists := c.Get("user_role")
	if !exists {
		return "", false
	}

	role, ok := roleInterface.(models.UserRole)
	if !ok {
		return "", false
	}

	return role, true
}

// ValidateOwnership middleware that validates resource ownership
// Useful for endpoints where users can only access their own resources
func (am *AuthMiddleware) ValidateOwnership(getResourceOwnerID func(*gin.Context) (primitive.ObjectID, error)) gin.HandlerFunc {
	return func(c *gin.Context) {
		// First require authentication
		am.RequireAuth()(c)
		if c.IsAborted() {
			return
		}

		// Get current user ID
		currentUserID, exists := GetCurrentUserID(c)
		if !exists {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "User ID not found in context",
				"code":    "INTERNAL_ERROR",
			})
			c.Abort()
			return
		}

		// Get current user role
		currentUserRole, _ := GetCurrentUserRole(c)

		// Admins can access any resource
		if currentUserRole == models.RoleAdmin {
			c.Next()
			return
		}

		// Get resource owner ID
		resourceOwnerID, err := getResourceOwnerID(c)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "Failed to determine resource ownership",
				"code":    "OWNERSHIP_CHECK_FAILED",
			})
			c.Abort()
			return
		}

		// Check ownership
		if resourceOwnerID != currentUserID {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"error":   "You can only access your own resources",
				"code":    "OWNERSHIP_VIOLATION",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// RateLimitByUser creates a rate limiter based on user ID
// This will be implemented after we add rate limiting functionality
func (am *AuthMiddleware) RateLimitByUser(requests int, window string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// TODO: Implement rate limiting by user ID
		// For now, just continue
		c.Next()
	}
}