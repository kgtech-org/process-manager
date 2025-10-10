package services

import (
	"fmt"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/kodesonik/process-manager/internal/models"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// JWTService handles JWT token operations
type JWTService struct {
	secretKey     []byte
	issuer        string
	accessExpiry  time.Duration
	refreshExpiry time.Duration
}

// JWTCustomClaims represents the JWT claims
type JWTCustomClaims struct {
	UserID    primitive.ObjectID `json:"userId"`
	Email     string             `json:"email"`
	Role      models.UserRole    `json:"role"`
	TokenType string             `json:"tokenType"` // "access" or "refresh"
	jwt.RegisteredClaims
}

// NewJWTService creates a new JWT service instance
func NewJWTService() *JWTService {
	secretKey := os.Getenv("JWT_SECRET")
	if secretKey == "" {
		// In production, this should come from environment variables or secure storage
		secretKey = "your-super-secret-key-change-in-production-please"
	}

	issuer := os.Getenv("JWT_ISSUER")
	if issuer == "" {
		issuer = "process-manager-api"
	}

	// Access token expires in 24 hours
	accessExpiry := 24 * time.Hour
	if exp := os.Getenv("JWT_ACCESS_EXPIRY"); exp != "" {
		if duration, err := time.ParseDuration(exp); err == nil {
			accessExpiry = duration
		}
	}

	// Refresh token expires in 30 days
	refreshExpiry := 30 * 24 * time.Hour
	if exp := os.Getenv("JWT_REFRESH_EXPIRY"); exp != "" {
		if duration, err := time.ParseDuration(exp); err == nil {
			refreshExpiry = duration
		}
	}

	return &JWTService{
		secretKey:     []byte(secretKey),
		issuer:        issuer,
		accessExpiry:  accessExpiry,
		refreshExpiry: refreshExpiry,
	}
}

// GenerateTokenPair generates both access and refresh tokens
func (s *JWTService) GenerateTokenPair(user *models.User) (*models.TokenPair, error) {
	// Generate access token
	accessToken, err := s.generateToken(user, "access", s.accessExpiry)
	if err != nil {
		return nil, fmt.Errorf("failed to generate access token: %w", err)
	}

	// Generate refresh token
	refreshToken, err := s.generateToken(user, "refresh", s.refreshExpiry)
	if err != nil {
		return nil, fmt.Errorf("failed to generate refresh token: %w", err)
	}

	return &models.TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresAt:    time.Now().Add(s.accessExpiry),
	}, nil
}

// GenerateAccessToken generates an access token for a user
func (s *JWTService) GenerateAccessToken(user *models.User) (string, error) {
	return s.generateToken(user, "access", s.accessExpiry)
}

// GenerateRefreshToken generates a refresh token for a user
func (s *JWTService) GenerateRefreshToken(user *models.User) (string, error) {
	return s.generateToken(user, "refresh", s.refreshExpiry)
}

// generateToken creates a JWT token with the specified type and expiry
func (s *JWTService) generateToken(user *models.User, tokenType string, expiry time.Duration) (string, error) {
	claims := JWTCustomClaims{
		UserID:    user.ID,
		Email:     user.Email,
		Role:      user.Role,
		TokenType: tokenType,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    s.issuer,
			Subject:   user.ID.Hex(),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(expiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}

	// Create token with claims
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// Sign token with secret key
	tokenString, err := token.SignedString(s.secretKey)
	if err != nil {
		return "", fmt.Errorf("failed to sign token: %w", err)
	}

	return tokenString, nil
}

// ValidateToken validates a JWT token and returns the claims
func (s *JWTService) ValidateToken(tokenString string) (*JWTCustomClaims, error) {
	// Parse token
	token, err := jwt.ParseWithClaims(tokenString, &JWTCustomClaims{}, func(token *jwt.Token) (interface{}, error) {
		// Validate signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return s.secretKey, nil
	})

	if err != nil {
		return nil, models.ErrInvalidToken
	}

	// Check if token is valid
	if !token.Valid {
		return nil, models.ErrInvalidToken
	}

	// Extract claims
	claims, ok := token.Claims.(*JWTCustomClaims)
	if !ok {
		return nil, models.ErrInvalidToken
	}

	// Check expiration
	if claims.ExpiresAt != nil && claims.ExpiresAt.Before(time.Now()) {
		return nil, models.ErrTokenExpired
	}

	return claims, nil
}

// ValidateAccessToken validates an access token
func (s *JWTService) ValidateAccessToken(tokenString string) (*JWTCustomClaims, error) {
	claims, err := s.ValidateToken(tokenString)
	if err != nil {
		return nil, err
	}

	// Ensure it's an access token
	if claims.TokenType != "access" {
		return nil, models.ErrInvalidToken
	}

	return claims, nil
}

// ValidateRefreshToken validates a refresh token
func (s *JWTService) ValidateRefreshToken(tokenString string) (*JWTCustomClaims, error) {
	claims, err := s.ValidateToken(tokenString)
	if err != nil {
		return nil, err
	}

	// Ensure it's a refresh token
	if claims.TokenType != "refresh" {
		return nil, models.ErrInvalidToken
	}

	return claims, nil
}

// ExtractTokenFromHeader extracts the token from Authorization header
func (s *JWTService) ExtractTokenFromHeader(authHeader string) string {
	if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
		return authHeader[7:]
	}
	return ""
}

// RefreshAccessToken generates a new access token from a refresh token
func (s *JWTService) RefreshAccessToken(refreshToken string, user *models.User) (string, error) {
	// Validate refresh token first
	_, err := s.ValidateRefreshToken(refreshToken)
	if err != nil {
		return "", err
	}

	// Generate new access token
	return s.GenerateAccessToken(user)
}

// GetAccessTokenExpiry returns the access token expiry duration
func (s *JWTService) GetAccessTokenExpiry() time.Duration {
	return s.accessExpiry
}

// GetRefreshTokenExpiry returns the refresh token expiry duration
func (s *JWTService) GetRefreshTokenExpiry() time.Duration {
	return s.refreshExpiry
}
