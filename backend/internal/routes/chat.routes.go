package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/kodesonik/process-manager/internal/handlers"
	"github.com/kodesonik/process-manager/internal/middleware"
)

func SetupChatRoutes(router *gin.RouterGroup, chatHandler *handlers.ChatHandler, authMiddleware *middleware.AuthMiddleware) {
	chat := router.Group("/chat")
	chat.Use(authMiddleware.RequireAuth())
	{
		// Send a message (creates new thread if threadId not provided)
		chat.POST("/messages", chatHandler.SendMessage)

		// Get all threads for current user
		chat.GET("/threads", chatHandler.GetThreads)

		// Get specific thread with messages
		chat.GET("/threads/:id", chatHandler.GetThread)

		// Update thread title
		chat.PATCH("/threads/:id", chatHandler.UpdateThreadTitle)

		// Delete a thread
		chat.DELETE("/threads/:id", chatHandler.DeleteThread)
	}

	// Admin routes
	admin := router.Group("/admin/chat")
	admin.Use(authMiddleware.RequireAdmin())
	{
		// Get all threads across all users
		admin.GET("/threads", chatHandler.GetAllThreadsAdmin)

		// Get all threads with messages (merged in one response)
		admin.GET("/threads-with-messages", chatHandler.GetAllThreadsWithMessagesAdmin)

		// Get specific thread with messages (any user)
		admin.GET("/threads/:id", chatHandler.GetThreadAdmin)
	}
}
