package handlers

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kodesonik/process-manager/internal/helpers"
	"github.com/kodesonik/process-manager/internal/middleware"
	"github.com/kodesonik/process-manager/internal/models"
	"github.com/kodesonik/process-manager/internal/services"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type DocumentHandler struct {
	documentService *services.DocumentService
}

func NewDocumentHandler(documentService *services.DocumentService) *DocumentHandler {
	return &DocumentHandler{
		documentService: documentService,
	}
}

// CreateDocument creates a new document
// POST /api/documents
func (h *DocumentHandler) CreateDocument(c *gin.Context) {
	var req models.CreateDocumentRequest
	if err := helpers.BindAndValidate(c, &req); err != nil {
		helpers.SendValidationErrors(c, err)
		return
	}

	// Get current user
	user, exists := middleware.GetCurrentUser(c)
	if !exists {
		helpers.SendUnauthorized(c, "User not found in context", "UNAUTHORIZED")
		return
	}

	ctx := c.Request.Context()
	document, err := h.documentService.Create(ctx, &req, user.ID)
	if err != nil {
		if err.Error() == "document reference already exists" {
			helpers.SendBadRequest(c, err.Error())
			return
		}
		helpers.SendInternalError(c, err)
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Document created successfully",
		"data":    document.ToResponse(),
	})
}

// GetDocument retrieves a document by ID
// GET /api/documents/:id
func (h *DocumentHandler) GetDocument(c *gin.Context) {
	idParam := c.Param("id")
	id, err := primitive.ObjectIDFromHex(idParam)
	if err != nil {
		helpers.SendBadRequest(c, "Invalid document ID format")
		return
	}

	ctx := c.Request.Context()
	document, err := h.documentService.GetByID(ctx, id)
	if err != nil {
		if err.Error() == "document not found" {
			helpers.SendNotFound(c, "Document not found")
			return
		}
		helpers.SendInternalError(c, err)
		return
	}

	helpers.SendSuccess(c, "Document retrieved successfully", document.ToResponse())
}

// ListDocuments retrieves documents with filtering and pagination
// Only returns documents that the user has access to
// GET /api/documents
func (h *DocumentHandler) ListDocuments(c *gin.Context) {
	// Get current user
	user, exists := middleware.GetCurrentUser(c)
	if !exists {
		helpers.SendUnauthorized(c, "User not found in context", "UNAUTHORIZED")
		return
	}

	var filter models.DocumentFilter

	// Parse query parameters
	if status := c.Query("status"); status != "" {
		docStatus := models.DocumentStatus(status)
		filter.Status = &docStatus
	}
	if createdBy := c.Query("createdBy"); createdBy != "" {
		filter.CreatedBy = &createdBy
	}
	if search := c.Query("search"); search != "" {
		filter.Search = &search
	}

	// Parse pagination
	page := 1
	if pageStr := c.Query("page"); pageStr != "" {
		var p int
		if _, err := fmt.Sscanf(pageStr, "%d", &p); err == nil && p > 0 {
			page = p
		}
	}
	limit := 20
	if limitStr := c.Query("limit"); limitStr != "" {
		var l int
		if _, err := fmt.Sscanf(limitStr, "%d", &l); err == nil && l > 0 {
			limit = l
		}
	}

	filter.Page = page
	filter.Limit = limit

	ctx := c.Request.Context()
	// Use ListUserAccessible instead of List to filter by user access
	documents, total, err := h.documentService.ListUserAccessible(ctx, user.ID, user.Role, &filter)
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	// Convert to response
	responses := make([]models.DocumentResponse, 0, len(documents))
	for _, doc := range documents {
		responses = append(responses, doc.ToResponse())
	}

	// Calculate pagination info
	totalPages := (int(total) + limit - 1) / limit

	helpers.SendSuccessWithPagination(c, "Documents retrieved successfully", responses, helpers.PaginationInfo{
		Page:       page,
		Limit:      limit,
		Total:      int(total),
		TotalPages: totalPages,
	})
}

// UpdateDocument updates a document
// PUT /api/documents/:id
func (h *DocumentHandler) UpdateDocument(c *gin.Context) {
	idParam := c.Param("id")
	id, err := primitive.ObjectIDFromHex(idParam)
	if err != nil {
		helpers.SendBadRequest(c, "Invalid document ID format")
		return
	}

	var req models.UpdateDocumentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		helpers.SendBadRequest(c, "Invalid request body")
		return
	}

	// Get current user
	user, exists := middleware.GetCurrentUser(c)
	if !exists {
		helpers.SendUnauthorized(c, "User not found in context", "UNAUTHORIZED")
		return
	}

	ctx := c.Request.Context()
	document, err := h.documentService.Update(ctx, id, &req, user.ID)
	if err != nil {
		if err.Error() == "document not found" {
			helpers.SendNotFound(c, "Document not found")
			return
		}
		helpers.SendInternalError(c, err)
		return
	}

	helpers.SendSuccess(c, "Document updated successfully", document.ToResponse())
}

// DeleteDocument deletes a document
// DELETE /api/documents/:id
func (h *DocumentHandler) DeleteDocument(c *gin.Context) {
	idParam := c.Param("id")
	id, err := primitive.ObjectIDFromHex(idParam)
	if err != nil {
		helpers.SendBadRequest(c, "Invalid document ID format")
		return
	}

	ctx := c.Request.Context()
	err = h.documentService.Delete(ctx, id)
	if err != nil {
		if err.Error() == "document not found" {
			helpers.SendNotFound(c, "Document not found")
			return
		}
		helpers.SendInternalError(c, err)
		return
	}

	helpers.SendSuccess(c, "Document deleted successfully", nil)
}

// DuplicateDocument duplicates a document
// POST /api/documents/:id/duplicate
func (h *DocumentHandler) DuplicateDocument(c *gin.Context) {
	idParam := c.Param("id")
	id, err := primitive.ObjectIDFromHex(idParam)
	if err != nil {
		helpers.SendBadRequest(c, "Invalid document ID format")
		return
	}

	// Get current user
	user, exists := middleware.GetCurrentUser(c)
	if !exists {
		helpers.SendUnauthorized(c, "User not found in context", "UNAUTHORIZED")
		return
	}

	ctx := c.Request.Context()
	document, err := h.documentService.Duplicate(ctx, id, user.ID)
	if err != nil {
		if err.Error() == "document not found" {
			helpers.SendNotFound(c, "Document not found")
			return
		}
		helpers.SendInternalError(c, err)
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Document duplicated successfully",
		"data":    document.ToResponse(),
	})
}

// GetDocumentVersions retrieves all versions of a document
// GET /api/documents/:id/versions
func (h *DocumentHandler) GetDocumentVersions(c *gin.Context) {
	idParam := c.Param("id")
	id, err := primitive.ObjectIDFromHex(idParam)
	if err != nil {
		helpers.SendBadRequest(c, "Invalid document ID format")
		return
	}

	ctx := c.Request.Context()
	versions, err := h.documentService.GetVersions(ctx, id)
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	// Convert to response
	responses := make([]models.DocumentVersionResponse, 0, len(versions))
	for _, version := range versions {
		responses = append(responses, version.ToResponse())
	}

	helpers.SendSuccess(c, "Document versions retrieved successfully", responses)
}
