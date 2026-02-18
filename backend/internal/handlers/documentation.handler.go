package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kodesonik/process-manager/internal/services"
)

type DocumentationHandler struct {
	service *services.DocumentationService
}

func NewDocumentationHandler(service *services.DocumentationService) *DocumentationHandler {
	return &DocumentationHandler{
		service: service,
	}
}

// GetPublicDocumentationURL returns the URL for the public documentation JSON
func (h *DocumentationHandler) GetPublicDocumentationURL(c *gin.Context) {
	url := h.service.GetPublicDocumentationURL()
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"url":     url,
	})
}

// TriggerUpdate manually triggers a documentation update (Admin only)
func (h *DocumentationHandler) TriggerUpdate(c *gin.Context) {
	h.service.TriggerUpdate()
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Documentation update triggered",
	})
}
