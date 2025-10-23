package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ChatThread represents a conversation thread with the AI assistant
type ChatThread struct {
	ID             primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	UserID         primitive.ObjectID `json:"userId" bson:"user_id"`
	OpenAIThreadID string             `json:"openaiThreadId" bson:"openai_thread_id"`
	Title          string             `json:"title" bson:"title"`                     // Auto-generated from first message
	LastMessage    string             `json:"lastMessage" bson:"last_message"`         // Preview of last message
	MessageCount   int                `json:"messageCount" bson:"message_count"`       // Total number of messages
	CreatedAt      time.Time          `json:"createdAt" bson:"created_at"`
	UpdatedAt      time.Time          `json:"updatedAt" bson:"updated_at"`
}

// ChatMessage represents a single message in a conversation
type ChatMessage struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	ThreadID  primitive.ObjectID `json:"threadId" bson:"thread_id"`
	Role      string             `json:"role" bson:"role"`           // "user" or "assistant"
	Content   string             `json:"content" bson:"content"`
	CreatedAt time.Time          `json:"createdAt" bson:"created_at"`
}

// CreateChatMessageRequest represents a request to send a message
type CreateChatMessageRequest struct {
	ThreadID *string `json:"threadId,omitempty"` // Optional: if not provided, creates new thread
	Message  string  `json:"message" binding:"required,min=1,max=4000"`
}

// ChatMessageResponse represents the response from sending a message
type ChatMessageResponse struct {
	ThreadID string `json:"threadId"`
	Message  string `json:"message"`
	Role     string `json:"role"`
}

// ChatThreadResponse represents a thread with its recent messages
type ChatThreadResponse struct {
	Thread   ChatThread    `json:"thread"`
	Messages []ChatMessage `json:"messages"`
}

// UserInfo represents basic user information for admin views
type UserInfo struct {
	FirstName   string `json:"firstName" bson:"first_name"`
	LastName    string `json:"lastName" bson:"last_name"`
	Email       string `json:"email" bson:"email"`
	PhoneNumber string `json:"phoneNumber" bson:"phone_number"`
}

// ChatThreadWithUser represents a thread with user information (admin view)
type ChatThreadWithUser struct {
	ID             primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	UserID         primitive.ObjectID `json:"userId" bson:"user_id"`
	OpenAIThreadID string             `json:"openaiThreadId" bson:"openai_thread_id"`
	Title          string             `json:"title" bson:"title"`
	LastMessage    string             `json:"lastMessage" bson:"last_message"`
	MessageCount   int                `json:"messageCount" bson:"message_count"`
	CreatedAt      time.Time          `json:"createdAt" bson:"created_at"`
	UpdatedAt      time.Time          `json:"updatedAt" bson:"updated_at"`
	User           UserInfo           `json:"user" bson:"user"`
}

// ChatThreadWithUserAndMessages represents a thread with user info and messages (admin view)
type ChatThreadWithUserAndMessages struct {
	ChatThreadWithUser `bson:",inline"`
	Messages           []ChatMessage `json:"messages" bson:"-"`
}
