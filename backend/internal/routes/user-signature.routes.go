package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/kodesonik/process-manager/internal/handlers"
	"github.com/kodesonik/process-manager/internal/middleware"
)

func SetupUserSignatureRoutes(
	router *gin.RouterGroup,
	signatureHandler *handlers.UserSignatureHandler,
	authMiddleware *middleware.AuthMiddleware,
) {
	signature := router.Group("/users/me/signature")
	signature.Use(authMiddleware.RequireAuth())
	{
		signature.GET("", signatureHandler.GetSignature)
		signature.POST("", signatureHandler.CreateOrUpdateSignature)
		signature.DELETE("", signatureHandler.DeleteSignature)
	}
}
