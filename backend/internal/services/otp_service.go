package services

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math/big"
	"time"

	"github.com/kodesonik/process-manager/internal/models"
	"github.com/redis/go-redis/v9"
)

// OTPService handles OTP generation and verification using Redis
type OTPService struct {
	redisClient *redis.Client
	otpExpiry   time.Duration
	maxAttempts int
}

// NewOTPService creates a new OTP service instance
func NewOTPService(redisClient *redis.Client) *OTPService {
	return &OTPService{
		redisClient: redisClient,
		otpExpiry:   5 * time.Minute, // OTP expires in 5 minutes
		maxAttempts: 3,               // Maximum 3 attempts per OTP
	}
}

// GenerateOTP generates a 6-digit OTP and stores it in Redis
func (s *OTPService) GenerateOTP(ctx context.Context, email string) (string, error) {
	// Generate 6-digit OTP
	otp, err := s.generateRandomOTP()
	if err != nil {
		return "", fmt.Errorf("failed to generate OTP: %w", err)
	}

	// Create OTP token
	otpToken := &models.OTPToken{
		Email:     email,
		OTP:       otp,
		ExpiresAt: time.Now().Add(s.otpExpiry),
		Attempts:  0,
		CreatedAt: time.Now(),
	}

	// Serialize token to JSON
	tokenJSON, err := json.Marshal(otpToken)
	if err != nil {
		return "", fmt.Errorf("failed to serialize OTP token: %w", err)
	}

	// Store in Redis with expiry
	key := s.getOTPKey(email)
	err = s.redisClient.Set(ctx, key, tokenJSON, s.otpExpiry).Err()
	if err != nil {
		return "", fmt.Errorf("failed to store OTP in Redis: %w", err)
	}

	return otp, nil
}

// VerifyOTP verifies the provided OTP against the stored one
func (s *OTPService) VerifyOTP(ctx context.Context, email, otp string) error {
	key := s.getOTPKey(email)

	// Get OTP token from Redis
	tokenJSON, err := s.redisClient.Get(ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			return models.ErrInvalidOTP
		}
		return fmt.Errorf("failed to get OTP from Redis: %w", err)
	}

	// Deserialize token
	var otpToken models.OTPToken
	if err := json.Unmarshal([]byte(tokenJSON), &otpToken); err != nil {
		return fmt.Errorf("failed to deserialize OTP token: %w", err)
	}

	// Check if OTP has expired
	if time.Now().After(otpToken.ExpiresAt) {
		// Delete expired OTP
		s.redisClient.Del(ctx, key)
		return models.ErrOTPExpired
	}

	// Check if too many attempts
	if otpToken.Attempts >= s.maxAttempts {
		// Delete OTP after max attempts
		s.redisClient.Del(ctx, key)
		return models.ErrTooManyAttempts
	}

	// Verify OTP
	if otpToken.OTP != otp {
		// Increment attempts
		otpToken.Attempts++
		tokenJSON, _ := json.Marshal(otpToken)
		s.redisClient.Set(ctx, key, tokenJSON, time.Until(otpToken.ExpiresAt))
		return models.ErrInvalidOTP
	}

	// OTP is valid, delete it to prevent reuse
	s.redisClient.Del(ctx, key)
	return nil
}

// GetOTPInfo returns OTP information for debugging/admin purposes
func (s *OTPService) GetOTPInfo(ctx context.Context, email string) (*models.OTPToken, error) {
	key := s.getOTPKey(email)

	tokenJSON, err := s.redisClient.Get(ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			return nil, models.ErrInvalidOTP
		}
		return nil, fmt.Errorf("failed to get OTP from Redis: %w", err)
	}

	var otpToken models.OTPToken
	if err := json.Unmarshal([]byte(tokenJSON), &otpToken); err != nil {
		return nil, fmt.Errorf("failed to deserialize OTP token: %w", err)
	}

	return &otpToken, nil
}

// DeleteOTP removes an OTP from Redis
func (s *OTPService) DeleteOTP(ctx context.Context, email string) error {
	key := s.getOTPKey(email)
	return s.redisClient.Del(ctx, key).Err()
}

// CleanupExpiredOTPs removes expired OTPs (Redis handles this automatically with TTL, but this is for manual cleanup)
func (s *OTPService) CleanupExpiredOTPs(ctx context.Context) error {
	// Redis automatically handles TTL expiry, but we can implement manual cleanup if needed
	// For now, Redis TTL is sufficient
	return nil
}

// generateRandomOTP generates a secure random 6-digit OTP
func (s *OTPService) generateRandomOTP() (string, error) {
	// Generate random number between 100000 and 999999
	min := big.NewInt(100000)
	max := big.NewInt(999999)

	n, err := rand.Int(rand.Reader, new(big.Int).Sub(max, min))
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("%06d", n.Add(n, min).Int64()), nil
}

// getOTPKey generates Redis key for OTP storage
func (s *OTPService) getOTPKey(email string) string {
	return fmt.Sprintf("otp:%s", email)
}

// GenerateTemporaryToken generates a secure temporary token for OTP verification
func (s *OTPService) GenerateTemporaryToken(ctx context.Context, email string) (string, error) {
	// Generate 32 random bytes
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return "", fmt.Errorf("failed to generate token: %w", err)
	}
	
	// Encode to base64 URL-safe string
	token := base64.URLEncoding.EncodeToString(tokenBytes)
	
	// Store token-email mapping in Redis with same expiry as OTP
	key := fmt.Sprintf("temp_token:%s", token)
	err := s.redisClient.Set(ctx, key, email, s.otpExpiry).Err()
	if err != nil {
		return "", fmt.Errorf("failed to store temporary token: %w", err)
	}
	
	return token, nil
}

// GetEmailFromTemporaryToken retrieves the email associated with a temporary token
func (s *OTPService) GetEmailFromTemporaryToken(ctx context.Context, token string) (string, error) {
	key := fmt.Sprintf("temp_token:%s", token)
	
	email, err := s.redisClient.Get(ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			return "", models.ErrInvalidToken
		}
		return "", fmt.Errorf("failed to get email from token: %w", err)
	}
	
	return email, nil
}

// DeleteTemporaryToken removes a temporary token from Redis
func (s *OTPService) DeleteTemporaryToken(ctx context.Context, token string) error {
	key := fmt.Sprintf("temp_token:%s", token)
	return s.redisClient.Del(ctx, key).Err()
}

// SetOTPExpiry sets the OTP expiry duration
func (s *OTPService) SetOTPExpiry(duration time.Duration) {
	s.otpExpiry = duration
}

// SetMaxAttempts sets the maximum number of OTP verification attempts
func (s *OTPService) SetMaxAttempts(attempts int) {
	s.maxAttempts = attempts
}

// GetStats returns OTP service statistics
func (s *OTPService) GetStats() map[string]interface{} {
	return map[string]interface{}{
		"otp_expiry_minutes": s.otpExpiry.Minutes(),
		"max_attempts":       s.maxAttempts,
	}
}
