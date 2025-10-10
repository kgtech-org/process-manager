package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/kodesonik/process-manager/internal/handlers"
	"github.com/kodesonik/process-manager/internal/middleware"
)

func RegisterInvitationRoutes(router *gin.RouterGroup, invitationHandler *handlers.InvitationHandler, authMiddleware *middleware.AuthMiddleware) {
	invitations := router.Group("/invitations")
	invitations.Use(authMiddleware.RequireAuth())
	{
		invitations.POST("", invitationHandler.CreateInvitation)
		invitations.GET("", invitationHandler.ListInvitations)
		invitations.PUT("/:id/accept", invitationHandler.AcceptInvitation)
		invitations.PUT("/:id/decline", invitationHandler.DeclineInvitation)
		invitations.POST("/:id/resend", invitationHandler.ResendInvitation)
		invitations.DELETE("/:id/cancel", invitationHandler.CancelInvitation)
	}
}
