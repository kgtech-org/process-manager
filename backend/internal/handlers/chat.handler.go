package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kodesonik/process-manager/internal/helpers"
	"github.com/kodesonik/process-manager/internal/models"
	"github.com/kodesonik/process-manager/internal/services"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ChatHandler struct {
	chatService *services.ChatService
}

func NewChatHandler(chatService *services.ChatService) *ChatHandler {
	return &ChatHandler{
		chatService: chatService,
	}
}

// SendMessage handles sending a message to the AI assistant
func (h *ChatHandler) SendMessage(c *gin.Context) {
	// Get user ID from context (set by auth middleware)
	userIDValue, exists := c.Get("userId")
	if !exists {
		helpers.SendUnauthorized(c, "User not authenticated", "UNAUTHORIZED")
		return
	}

	userID, ok := userIDValue.(primitive.ObjectID)
	if !ok {
		helpers.SendInternalError(c, nil)
		return
	}

	// Parse request body
	var req models.CreateChatMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		helpers.SendBadRequest(c, err.Error())
		return
	}

	// Send message and get response
	ctx := c.Request.Context()
	response, err := h.chatService.SendMessage(ctx, userID, &req)
	if err != nil {
		if err.Error() == "OpenAI service is not available" {
			helpers.SendErrorWithCode(c, http.StatusServiceUnavailable, "AI assistant is currently unavailable. Please try again later.")
			return
		}
		helpers.SendInternalError(c, err)
		return
	}

	helpers.SendSuccess(c, "Message sent successfully", response)
}

// GetThreads retrieves all chat threads for the current user
func (h *ChatHandler) GetThreads(c *gin.Context) {
	// Get user ID from context
	userIDValue, exists := c.Get("userId")
	if !exists {
		helpers.SendUnauthorized(c, "User not authenticated", "UNAUTHORIZED")
		return
	}

	userID, ok := userIDValue.(primitive.ObjectID)
	if !ok {
		helpers.SendInternalError(c, nil)
		return
	}

	// Get threads
	ctx := c.Request.Context()
	threads, err := h.chatService.GetUserThreads(ctx, userID)
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	helpers.SendSuccess(c, "Threads retrieved successfully", threads)
}

// GetThread retrieves a specific thread with its messages
func (h *ChatHandler) GetThread(c *gin.Context) {
	// Get user ID from context
	userIDValue, exists := c.Get("userId")
	if !exists {
		helpers.SendUnauthorized(c, "User not authenticated", "UNAUTHORIZED")
		return
	}

	userID, ok := userIDValue.(primitive.ObjectID)
	if !ok {
		helpers.SendInternalError(c, nil)
		return
	}

	// Get thread ID from URL
	threadIDParam := c.Param("id")
	threadID, err := primitive.ObjectIDFromHex(threadIDParam)
	if err != nil {
		helpers.SendBadRequest(c, "Invalid thread ID format")
		return
	}

	// Get thread with messages
	ctx := c.Request.Context()
	threadData, err := h.chatService.GetThreadWithMessages(ctx, threadID, userID)
	if err != nil {
		if err.Error() == "thread not found" {
			helpers.SendNotFound(c, "Thread not found")
			return
		}
		helpers.SendInternalError(c, err)
		return
	}

	helpers.SendSuccess(c, "Thread retrieved successfully", threadData)
}

// DeleteThread deletes a chat thread
func (h *ChatHandler) DeleteThread(c *gin.Context) {
	// Get user ID from context
	userIDValue, exists := c.Get("userId")
	if !exists {
		helpers.SendUnauthorized(c, "User not authenticated", "UNAUTHORIZED")
		return
	}

	userID, ok := userIDValue.(primitive.ObjectID)
	if !ok {
		helpers.SendInternalError(c, nil)
		return
	}

	// Get thread ID from URL
	threadIDParam := c.Param("id")
	threadID, err := primitive.ObjectIDFromHex(threadIDParam)
	if err != nil {
		helpers.SendBadRequest(c, "Invalid thread ID format")
		return
	}

	// Delete thread
	ctx := c.Request.Context()
	err = h.chatService.DeleteThread(ctx, threadID, userID)
	if err != nil {
		if err.Error() == "thread not found" {
			helpers.SendNotFound(c, "Thread not found")
			return
		}
		helpers.SendInternalError(c, err)
		return
	}

	helpers.SendSuccess(c, "Thread deleted successfully", nil)
}

// UpdateThreadTitle updates the title of a thread
func (h *ChatHandler) UpdateThreadTitle(c *gin.Context) {
	// Get user ID from context
	userIDValue, exists := c.Get("userId")
	if !exists {
		helpers.SendUnauthorized(c, "User not authenticated", "UNAUTHORIZED")
		return
	}

	userID, ok := userIDValue.(primitive.ObjectID)
	if !ok {
		helpers.SendInternalError(c, nil)
		return
	}

	// Get thread ID from URL
	threadIDParam := c.Param("id")
	threadID, err := primitive.ObjectIDFromHex(threadIDParam)
	if err != nil {
		helpers.SendBadRequest(c, "Invalid thread ID format")
		return
	}

	// Parse request body
	var req struct {
		Title string `json:"title" binding:"required,min=1,max=100"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		helpers.SendBadRequest(c, err.Error())
		return
	}

	// Update thread title
	ctx := c.Request.Context()
	err = h.chatService.UpdateThreadTitle(ctx, threadID, userID, req.Title)
	if err != nil {
		if err.Error() == "thread not found" {
			helpers.SendNotFound(c, "Thread not found")
			return
		}
		helpers.SendInternalError(c, err)
		return
	}

	helpers.SendSuccess(c, "Thread title updated successfully", nil)
}
