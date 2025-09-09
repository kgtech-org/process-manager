package services

import (
	"errors"
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

// JWTClaims represents the JWT claims
type JWTClaims struct {
	UserID   primitive.ObjectID `json:"user_id"`
	Email    string             `json:"email"`
	Role     models.UserRole    `json:"role"`
	TokenType string            `json:"token_type"` // "access" or "refresh"
	jwt.RegisteredClaims
}

// TokenPair represents access and refresh tokens
type TokenPair struct {
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	ExpiresAt    time.Time `json:"expires_at"`
	TokenType    string    `json:"token_type"`
}

var (
	ErrInvalidToken = errors.New("invalid token")
	ErrExpiredToken = errors.New("token has expired")
	ErrInvalidClaims = errors.New("invalid token claims")
)

// NewJWTService creates a new JWT service instance
func NewJWTService() *JWTService {
	secretKey := os.Getenv("JWT_SECRET")
	if secretKey == "" {
		// In production, this should come from environment variables or secure storage
		secretKey = "your-super-secret-key-change-in-production-please"
	}

	issuer := os.Getenv("JWT_ISSUER")
	if issuer == "" {
		issuer = "process-manager"
	}

	// Token expiry durations
	accessExpiry := 15 * time.Minute  // Short-lived access tokens
	refreshExpiry := 30 * 24 * time.Hour // Long-lived refresh tokens

	// Allow customization via environment variables
	if accessDuration := os.Getenv("JWT_ACCESS_EXPIRY"); accessDuration != "" {
		if duration, err := time.ParseDuration(accessDuration); err == nil {
			accessExpiry = duration
		}
	}

	if refreshDuration := os.Getenv("JWT_REFRESH_EXPIRY"); refreshDuration != "" {
		if duration, err := time.ParseDuration(refreshDuration); err == nil {
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

// GenerateTokenPair generates both access and refresh tokens for a user
func (j *JWTService) GenerateTokenPair(user *models.User) (*TokenPair, error) {
	now := time.Now()
	accessExpiry := now.Add(j.accessExpiry)
	
	// Generate access token
	accessClaims := &JWTClaims{
		UserID:    user.ID,
		Email:     user.Email,
		Role:      user.Role,
		TokenType: "access",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(accessExpiry),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			Issuer:    j.issuer,
			Subject:   user.ID.Hex(),
		},
	}

	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	accessTokenString, err := accessToken.SignedString(j.secretKey)
	if err != nil {
		return nil, fmt.Errorf("failed to generate access token: %w", err)
	}

	// Generate refresh token
	refreshExpiry := now.Add(j.refreshExpiry)
	refreshClaims := &JWTClaims{
		UserID:    user.ID,
		Email:     user.Email,
		Role:      user.Role,
		TokenType: "refresh",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(refreshExpiry),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			Issuer:    j.issuer,
			Subject:   user.ID.Hex(),
		},
	}

	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refreshTokenString, err := refreshToken.SignedString(j.secretKey)
	if err != nil {
		return nil, fmt.Errorf("failed to generate refresh token: %w", err)
	}

	return &TokenPair{
		AccessToken:  accessTokenString,
		RefreshToken: refreshTokenString,
		ExpiresAt:    accessExpiry,
		TokenType:    "Bearer",
	}, nil
}

// GenerateAccessToken generates a new access token
func (j *JWTService) GenerateAccessToken(user *models.User) (string, time.Time, error) {
	now := time.Now()
	expiry := now.Add(j.accessExpiry)

	claims := &JWTClaims{
		UserID:    user.ID,
		Email:     user.Email,
		Role:      user.Role,
		TokenType: "access",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expiry),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			Issuer:    j.issuer,
			Subject:   user.ID.Hex(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(j.secretKey)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("failed to generate access token: %w", err)
	}

	return tokenString, expiry, nil
}

// ValidateToken validates a JWT token and returns the claims
func (j *JWTService) ValidateToken(tokenString string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		// Validate signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return j.secretKey, nil
	})

	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, ErrExpiredToken
		}
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	claims, ok := token.Claims.(*JWTClaims)
	if !ok || !token.Valid {
		return nil, ErrInvalidClaims
	}

	return claims, nil
}

// ValidateAccessToken validates an access token specifically
func (j *JWTService) ValidateAccessToken(tokenString string) (*JWTClaims, error) {
	claims, err := j.ValidateToken(tokenString)
	if err != nil {
		return nil, err
	}

	if claims.TokenType != "access" {
		return nil, ErrInvalidToken
	}

	return claims, nil
}

// ValidateRefreshToken validates a refresh token specifically
func (j *JWTService) ValidateRefreshToken(tokenString string) (*JWTClaims, error) {
	claims, err := j.ValidateToken(tokenString)
	if err != nil {
		return nil, err
	}

	if claims.TokenType != "refresh" {
		return nil, ErrInvalidToken
	}

	return claims, nil
}

// ExtractTokenFromHeader extracts token from Authorization header
func (j *JWTService) ExtractTokenFromHeader(authHeader string) (string, error) {
	if authHeader == "" {
		return "", errors.New("authorization header is empty")
	}

	// Expected format: "Bearer <token>"
	const bearerPrefix = "Bearer "
	if len(authHeader) < len(bearerPrefix) {
		return "", errors.New("invalid authorization header format")
	}

	if authHeader[:len(bearerPrefix)] != bearerPrefix {
		return "", errors.New("authorization header must start with 'Bearer '")
	}

	token := authHeader[len(bearerPrefix):]
	if token == "" {
		return "", errors.New("token is empty")
	}

	return token, nil
}

// GetUserIDFromToken extracts user ID from a token
func (j *JWTService) GetUserIDFromToken(tokenString string) (primitive.ObjectID, error) {
	claims, err := j.ValidateAccessToken(tokenString)
	if err != nil {
		return primitive.NilObjectID, err
	}

	return claims.UserID, nil
}

// GetUserIDFromAuthHeader extracts user ID from Authorization header
func (j *JWTService) GetUserIDFromAuthHeader(authHeader string) (primitive.ObjectID, error) {
	token, err := j.ExtractTokenFromHeader(authHeader)
	if err != nil {
		return primitive.NilObjectID, err
	}

	return j.GetUserIDFromToken(token)
}

// IsTokenExpired checks if a token is expired without validating signature
func (j *JWTService) IsTokenExpired(tokenString string) bool {
	token, _ := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		return j.secretKey, nil
	})

	if claims, ok := token.Claims.(*JWTClaims); ok {
		return claims.ExpiresAt.Time.Before(time.Now())
	}

	return true
}

// GetTokenExpiresAt gets the expiration time of a token
func (j *JWTService) GetTokenExpiresAt(tokenString string) (time.Time, error) {
	claims, err := j.ValidateToken(tokenString)
	if err != nil {
		return time.Time{}, err
	}

	return claims.ExpiresAt.Time, nil
}

// RefreshTokenPair generates new tokens using a refresh token
func (j *JWTService) RefreshTokenPair(refreshTokenString string, user *models.User) (*TokenPair, error) {
	// Validate refresh token
	claims, err := j.ValidateRefreshToken(refreshTokenString)
	if err != nil {
		return nil, err
	}

	// Verify token belongs to the user
	if claims.UserID != user.ID {
		return nil, ErrInvalidToken
	}

	// Generate new token pair
	return j.GenerateTokenPair(user)
}