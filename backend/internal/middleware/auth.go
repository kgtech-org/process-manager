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
		token := am.jwtService.ExtractTokenFromHeader(authHeader)
		if token == "" {
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
			case models.ErrTokenExpired:
				errorCode = "TOKEN_EXPIRED"
				statusCode = http.StatusUnauthorized
			case models.ErrInvalidToken:
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

		// Check if user can login
		if !user.CanLogin() {
			var errorCode string
			switch user.Status {
			case models.StatusPending:
				errorCode = "ACCOUNT_PENDING"
			case models.StatusRejected:
				errorCode = "ACCOUNT_REJECTED"
			case models.StatusInactive:
				errorCode = "ACCOUNT_INACTIVE"
			default:
				errorCode = "ACCOUNT_ACCESS_DENIED"
			}

			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"error":   "Account access denied",
				"code":    errorCode,
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

// RequireAdmin middleware that requires admin role
func (am *AuthMiddleware) RequireAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		// First, ensure user is authenticated
		am.RequireAuth()(c)
		if c.IsAborted() {
			return
		}

		// Check if user has admin role
		user, exists := GetCurrentUser(c)
		if !exists {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "User context not found",
				"code":    "CONTEXT_ERROR",
			})
			c.Abort()
			return
		}

		if user.Role != models.RoleAdmin {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"error":   "Admin access required",
				"code":    "INSUFFICIENT_ROLE",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequireManager middleware that requires manager or admin role
func (am *AuthMiddleware) RequireManager() gin.HandlerFunc {
	return func(c *gin.Context) {
		// First, ensure user is authenticated
		am.RequireAuth()(c)
		if c.IsAborted() {
			return
		}

		// Check if user has manager or admin role
		user, exists := GetCurrentUser(c)
		if !exists {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "User context not found",
				"code":    "CONTEXT_ERROR",
			})
			c.Abort()
			return
		}

		if user.Role != models.RoleAdmin && user.Role != models.RoleManager {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"error":   "Manager access required",
				"code":    "INSUFFICIENT_ROLE",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// OptionalAuth middleware that allows both authenticated and unauthenticated requests
func (am *AuthMiddleware) OptionalAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Extract token from Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			// No token provided, continue without authentication
			c.Next()
			return
		}

		// Extract token from "Bearer <token>" format
		token := am.jwtService.ExtractTokenFromHeader(authHeader)
		if token == "" {
			// Invalid format, continue without authentication
			c.Next()
			return
		}

		// Validate access token
		claims, err := am.jwtService.ValidateAccessToken(token)
		if err != nil {
			// Invalid token, continue without authentication
			c.Next()
			return
		}

		// Get user from database
		user, err := am.userService.GetUserByID(c.Request.Context(), claims.UserID)
		if err != nil {
			// User not found, continue without authentication
			c.Next()
			return
		}

		// Check if user can login
		if !user.CanLogin() {
			// User cannot login, continue without authentication
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

// Helper functions to extract user information from context

// GetCurrentUser extracts the current user from the Gin context
func GetCurrentUser(c *gin.Context) (*models.User, bool) {
	user, exists := c.Get("user")
	if !exists {
		return nil, false
	}
	return user.(*models.User), true
}

// GetCurrentUserID extracts the current user ID from the Gin context
func GetCurrentUserID(c *gin.Context) (primitive.ObjectID, bool) {
	userID, exists := c.Get("user_id")
	if !exists {
		return primitive.NilObjectID, false
	}
	return userID.(primitive.ObjectID), true
}

// GetCurrentUserRole extracts the current user role from the Gin context
func GetCurrentUserRole(c *gin.Context) (models.UserRole, bool) {
	role, exists := c.Get("user_role")
	if !exists {
		return "", false
	}
	return role.(models.UserRole), true
}

// GetCurrentClaims extracts the JWT claims from the Gin context
func GetCurrentClaims(c *gin.Context) (*services.JWTCustomClaims, bool) {
	claims, exists := c.Get("claims")
	if !exists {
		return nil, false
	}
	return claims.(*services.JWTCustomClaims), true
}
