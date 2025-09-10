package services

import (
	"context"
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

// RedisService manages Redis connections and operations
type RedisService struct {
	Client *redis.Client
}

// NewRedisService creates a new Redis service instance
func NewRedisService() (*RedisService, error) {
	// Get Redis configuration from environment variables
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "redis://localhost:6379"
	}

	// Parse Redis URL or use individual config
	var client *redis.Client

	if redisURL != "" && redisURL != "redis://localhost:6379" {
		// Parse Redis URL
		opt, err := redis.ParseURL(redisURL)
		if err != nil {
			return nil, fmt.Errorf("failed to parse Redis URL: %w", err)
		}
		client = redis.NewClient(opt)
	} else {
		// Use individual configuration
		host := os.Getenv("REDIS_HOST")
		if host == "" {
			host = "localhost"
		}

		port := os.Getenv("REDIS_PORT")
		if port == "" {
			port = "6379"
		}

		password := os.Getenv("REDIS_PASSWORD")

		dbStr := os.Getenv("REDIS_DB")
		db := 0
		if dbStr != "" {
			if parsedDB, err := strconv.Atoi(dbStr); err == nil {
				db = parsedDB
			}
		}

		client = redis.NewClient(&redis.Options{
			Addr:     fmt.Sprintf("%s:%s", host, port),
			Password: password,
			DB:       db,
		})
	}

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}

	return &RedisService{
		Client: client,
	}, nil
}

// Health checks Redis connection health
func (r *RedisService) Health(ctx context.Context) error {
	return r.Client.Ping(ctx).Err()
}

// Close closes the Redis connection
func (r *RedisService) Close() error {
	return r.Client.Close()
}

// Set stores a key-value pair with optional expiration
func (r *RedisService) Set(ctx context.Context, key string, value interface{}, expiration time.Duration) error {
	return r.Client.Set(ctx, key, value, expiration).Err()
}

// Get retrieves a value by key
func (r *RedisService) Get(ctx context.Context, key string) (string, error) {
	return r.Client.Get(ctx, key).Result()
}

// Delete removes a key
func (r *RedisService) Delete(ctx context.Context, key string) error {
	return r.Client.Del(ctx, key).Err()
}

// Exists checks if a key exists
func (r *RedisService) Exists(ctx context.Context, key string) (bool, error) {
	result, err := r.Client.Exists(ctx, key).Result()
	return result > 0, err
}

// SetExpiry sets expiration time for a key
func (r *RedisService) SetExpiry(ctx context.Context, key string, expiration time.Duration) error {
	return r.Client.Expire(ctx, key, expiration).Err()
}

// GetTTL gets the remaining time to live for a key
func (r *RedisService) GetTTL(ctx context.Context, key string) (time.Duration, error) {
	return r.Client.TTL(ctx, key).Result()
}

// FlushDB clears all keys in the current database (use with caution)
func (r *RedisService) FlushDB(ctx context.Context) error {
	return r.Client.FlushDB(ctx).Err()
}

// Keys returns all keys matching a pattern
func (r *RedisService) Keys(ctx context.Context, pattern string) ([]string, error) {
	return r.Client.Keys(ctx, pattern).Result()
}

// Increment increments a numeric value
func (r *RedisService) Increment(ctx context.Context, key string) (int64, error) {
	return r.Client.Incr(ctx, key).Result()
}

// Decrement decrements a numeric value
func (r *RedisService) Decrement(ctx context.Context, key string) (int64, error) {
	return r.Client.Decr(ctx, key).Result()
}
