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
	signatures := router.Group("/users/me/signatures")
	signatures.Use(authMiddleware.RequireAuth())
	{
		signatures.POST("", signatureHandler.CreateSignature)
		signatures.GET("", signatureHandler.ListSignatures)
		signatures.GET("/default", signatureHandler.GetDefaultSignature)
		signatures.PUT("/:id", signatureHandler.UpdateSignature)
		signatures.DELETE("/:id", signatureHandler.DeleteSignature)
	}
}
