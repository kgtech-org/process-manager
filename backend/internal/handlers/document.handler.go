package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kodesonik/process-manager/internal/helpers"
	"github.com/kodesonik/process-manager/internal/middleware"
	"github.com/kodesonik/process-manager/internal/models"
	"github.com/kodesonik/process-manager/internal/services"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type DocumentHandler struct {
	documentService     *services.DocumentService
	activityLogService  *services.ActivityLogService
}

func NewDocumentHandler(documentService *services.DocumentService, activityLogService *services.ActivityLogService) *DocumentHandler {
	return &DocumentHandler{
		documentService:    documentService,
		activityLogService: activityLogService,
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

	fmt.Printf("📄 [DOCUMENT] Creating new document:\n")
	fmt.Printf("   - Reference: %s\n", req.Reference)
	fmt.Printf("   - Title: %s\n", req.Title)
	fmt.Printf("   - Version: %s\n", req.Version)
	fmt.Printf("   - Created By: %s %s (%s)\n", user.FirstName, user.LastName, user.ID.Hex())

	document, err := h.documentService.Create(ctx, &req, user.ID)
	if err != nil {
		fmt.Printf("❌ [DOCUMENT] Failed to create document: %v\n", err)
		if err.Error() == "document reference already exists" {
			helpers.SendBadRequest(c, err.Error())
			return
		}
		helpers.SendInternalError(c, err)
		return
	}

	fmt.Printf("✅ [DOCUMENT] Document created successfully - ID: %s\n", document.ID.Hex())

	// Log activity
	activityReq := models.ActivityLogRequest{
		Action:       "document_created",
		Description:  fmt.Sprintf("Created document '%s' (%s)", document.Title, document.Reference),
		ResourceType: "document",
		ResourceID:   &document.ID,
		Success:      true,
		Details: map[string]interface{}{
			"documentId":   document.ID.Hex(),
			"reference":    document.Reference,
			"title":        document.Title,
			"version":      document.Version,
			"status":       string(document.Status),
		},
	}
	if logErr := h.activityLogService.LogActivity(ctx, activityReq, c); logErr != nil {
		fmt.Printf("Failed to log activity: %v\n", logErr)
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

	// Log activity (skip for autosave operations)
	if req.IsAutosave == nil || !*req.IsAutosave {
		activityReq := models.ActivityLogRequest{
			Action:       "document_updated",
			Description:  fmt.Sprintf("Updated document '%s' (%s)", document.Title, document.Reference),
			ResourceType: "document",
			ResourceID:   &document.ID,
			Success:      true,
			Details: map[string]interface{}{
				"documentId": document.ID.Hex(),
				"reference":  document.Reference,
				"title":      document.Title,
				"version":    document.Version,
				"status":     string(document.Status),
			},
		}
		if logErr := h.activityLogService.LogActivity(ctx, activityReq, c); logErr != nil {
			fmt.Printf("Failed to log activity: %v\n", logErr)
		}
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

	// Get document details before deleting for activity log
	document, err := h.documentService.GetByID(ctx, id)
	if err != nil {
		if err.Error() == "document not found" {
			helpers.SendNotFound(c, "Document not found")
			return
		}
		helpers.SendInternalError(c, err)
		return
	}

	err = h.documentService.Delete(ctx, id)
	if err != nil {
		if err.Error() == "document not found" {
			helpers.SendNotFound(c, "Document not found")
			return
		}
		helpers.SendInternalError(c, err)
		return
	}

	// Log activity
	activityReq := models.ActivityLogRequest{
		Action:       "document_deleted",
		Description:  fmt.Sprintf("Deleted document '%s' (%s)", document.Title, document.Reference),
		ResourceType: "document",
		ResourceID:   &document.ID,
		Success:      true,
		Details: map[string]interface{}{
			"documentId":   document.ID.Hex(),
			"reference":    document.Reference,
			"title":        document.Title,
			"version":      document.Version,
		},
	}
	if logErr := h.activityLogService.LogActivity(ctx, activityReq, c); logErr != nil {
		fmt.Printf("Failed to log activity: %v\n", logErr)
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

// PublishDocument publishes a document for signature
// POST /api/documents/:id/publish
func (h *DocumentHandler) PublishDocument(c *gin.Context) {
	idParam := c.Param("id")
	id, err := primitive.ObjectIDFromHex(idParam)
	if err != nil {
		helpers.SendBadRequest(c, "Invalid document ID format")
		return
	}

	ctx := c.Request.Context()
	document, err := h.documentService.Publish(ctx, id)
	if err != nil {
		if err.Error() == "document not found" {
			helpers.SendNotFound(c, "Document not found")
			return
		}
		if err.Error() == "only draft documents can be published" {
			helpers.SendBadRequest(c, err.Error())
			return
		}
		helpers.SendInternalError(c, err)
		return
	}

	// Log activity
	activityReq := models.ActivityLogRequest{
		Action:       "document_published",
		Description:  fmt.Sprintf("Published document '%s' (%s) for signature", document.Title, document.Reference),
		ResourceType: "document",
		ResourceID:   &document.ID,
		Success:      true,
		Details: map[string]interface{}{
			"documentId": document.ID.Hex(),
			"reference":  document.Reference,
			"title":      document.Title,
			"status":     string(document.Status),
		},
	}
	if logErr := h.activityLogService.LogActivity(ctx, activityReq, c); logErr != nil {
		fmt.Printf("Failed to log activity: %v\n", logErr)
	}

	helpers.SendSuccess(c, "Document published successfully", document.ToResponse())
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

// UpdateMetadata updates document metadata
// PATCH /api/documents/:id/metadata
func (h *DocumentHandler) UpdateMetadata(c *gin.Context) {
	idParam := c.Param("id")
	id, err := primitive.ObjectIDFromHex(idParam)
	if err != nil {
		helpers.SendBadRequest(c, "Invalid document ID format")
		return
	}

	var req models.UpdateMetadataRequest
	if err := helpers.BindAndValidate(c, &req); err != nil {
		helpers.SendValidationErrors(c, err)
		return
	}

	// Get current user
	_, exists := middleware.GetCurrentUser(c)
	if !exists {
		helpers.SendUnauthorized(c, "User not found in context", "UNAUTHORIZED")
		return
	}

	ctx := c.Request.Context()

	fmt.Printf("📝 [DOCUMENT] Updating metadata for document ID: %s\n", id.Hex())

	document, err := h.documentService.UpdateMetadata(ctx, id, &req)
	if err != nil {
		fmt.Printf("❌ [DOCUMENT] Failed to update metadata: %v\n", err)
		if err.Error() == "document not found" {
			helpers.SendNotFound(c, "Document not found")
			return
		}
		helpers.SendInternalError(c, err)
		return
	}

	fmt.Printf("✅ [DOCUMENT] Metadata updated successfully\n")

	// Log activity
	activityReq := models.ActivityLogRequest{
		Action:       "metadata_updated",
		Description:  fmt.Sprintf("Updated metadata for document '%s'", document.Title),
		ResourceType: "document",
		ResourceID:   &document.ID,
		Success:      true,
		Details: map[string]interface{}{
			"documentId": document.ID.Hex(),
			"reference":  document.Reference,
			"title":      document.Title,
		},
	}
	if logErr := h.activityLogService.LogActivity(ctx, activityReq, c); logErr != nil {
		fmt.Printf("Failed to log activity: %v\n", logErr)
	}

	helpers.SendSuccess(c, "Metadata updated successfully", document.ToResponse())
}

// CreateAnnex creates a new annex for a document
// POST /api/documents/:id/annexes
func (h *DocumentHandler) CreateAnnex(c *gin.Context) {
	idParam := c.Param("id")
	id, err := primitive.ObjectIDFromHex(idParam)
	if err != nil {
		helpers.SendBadRequest(c, "Invalid document ID format")
		return
	}

	var req models.CreateAnnexRequest
	if err := helpers.BindAndValidate(c, &req); err != nil {
		helpers.SendValidationErrors(c, err)
		return
	}

	// Get current user
	_, exists := middleware.GetCurrentUser(c)
	if !exists {
		helpers.SendUnauthorized(c, "User not found in context", "UNAUTHORIZED")
		return
	}

	ctx := c.Request.Context()

	fmt.Printf("📎 [DOCUMENT] Creating annex for document ID: %s\n", id.Hex())
	fmt.Printf("   - Title: %s\n", req.Title)
	fmt.Printf("   - Type: %s\n", req.Type)

	annex, err := h.documentService.CreateAnnex(ctx, id, &req)
	if err != nil {
		fmt.Printf("❌ [DOCUMENT] Failed to create annex: %v\n", err)
		if err.Error() == "document not found" {
			helpers.SendNotFound(c, "Document not found")
			return
		}
		helpers.SendInternalError(c, err)
		return
	}

	fmt.Printf("✅ [DOCUMENT] Annex created successfully - ID: %s\n", annex.ID)

	// Log activity
	document, _ := h.documentService.GetByID(ctx, id)
	activityReq := models.ActivityLogRequest{
		Action:       "annex_created",
		Description:  fmt.Sprintf("Created annex '%s' for document '%s'", annex.Title, document.Title),
		ResourceType: "document",
		ResourceID:   &id,
		Success:      true,
		Details: map[string]interface{}{
			"documentId": id.Hex(),
			"annexId":    annex.ID,
			"annexTitle": annex.Title,
			"annexType":  string(annex.Type),
		},
	}
	if logErr := h.activityLogService.LogActivity(ctx, activityReq, c); logErr != nil {
		fmt.Printf("Failed to log activity: %v\n", logErr)
	}

	helpers.SendSuccess(c, "Annex created successfully", annex)
}

// UpdateAnnex updates an existing annex
// PATCH /api/documents/:id/annexes/:annexId
func (h *DocumentHandler) UpdateAnnex(c *gin.Context) {
	idParam := c.Param("id")
	id, err := primitive.ObjectIDFromHex(idParam)
	if err != nil {
		helpers.SendBadRequest(c, "Invalid document ID format")
		return
	}

	annexID := c.Param("annexId")

	var req models.UpdateAnnexRequest
	if err := helpers.BindAndValidate(c, &req); err != nil {
		helpers.SendValidationErrors(c, err)
		return
	}

	// Get current user
	_, exists := middleware.GetCurrentUser(c)
	if !exists {
		helpers.SendUnauthorized(c, "User not found in context", "UNAUTHORIZED")
		return
	}

	ctx := c.Request.Context()

	fmt.Printf("📝 [DOCUMENT] Updating annex %s for document ID: %s\n", annexID, id.Hex())

	annex, err := h.documentService.UpdateAnnex(ctx, id, annexID, &req)
	if err != nil {
		fmt.Printf("❌ [DOCUMENT] Failed to update annex: %v\n", err)
		if err.Error() == "document not found" || err.Error() == "annex not found" {
			helpers.SendNotFound(c, err.Error())
			return
		}
		helpers.SendInternalError(c, err)
		return
	}

	fmt.Printf("✅ [DOCUMENT] Annex updated successfully\n")

	// Log activity
	document, _ := h.documentService.GetByID(ctx, id)
	activityReq := models.ActivityLogRequest{
		Action:       "annex_updated",
		Description:  fmt.Sprintf("Updated annex '%s' for document '%s'", annex.Title, document.Title),
		ResourceType: "document",
		ResourceID:   &id,
		Success:      true,
		Details: map[string]interface{}{
			"documentId": id.Hex(),
			"annexId":    annex.ID,
			"annexTitle": annex.Title,
		},
	}
	if logErr := h.activityLogService.LogActivity(ctx, activityReq, c); logErr != nil {
		fmt.Printf("Failed to log activity: %v\n", logErr)
	}

	helpers.SendSuccess(c, "Annex updated successfully", annex)
}

// DeleteAnnex deletes an annex from a document
// DELETE /api/documents/:id/annexes/:annexId
func (h *DocumentHandler) DeleteAnnex(c *gin.Context) {
	idParam := c.Param("id")
	id, err := primitive.ObjectIDFromHex(idParam)
	if err != nil {
		helpers.SendBadRequest(c, "Invalid document ID format")
		return
	}

	annexID := c.Param("annexId")

	// Get current user
	_, exists := middleware.GetCurrentUser(c)
	if !exists {
		helpers.SendUnauthorized(c, "User not found in context", "UNAUTHORIZED")
		return
	}

	ctx := c.Request.Context()

	// Get annex title before deleting
	document, err := h.documentService.GetByID(ctx, id)
	if err != nil {
		helpers.SendNotFound(c, "Document not found")
		return
	}

	var annexTitle string
	for _, annex := range document.Annexes {
		if annex.ID == annexID {
			annexTitle = annex.Title
			break
		}
	}

	fmt.Printf("🗑️ [DOCUMENT] Deleting annex %s from document ID: %s\n", annexID, id.Hex())

	err = h.documentService.DeleteAnnex(ctx, id, annexID)
	if err != nil {
		fmt.Printf("❌ [DOCUMENT] Failed to delete annex: %v\n", err)
		if err.Error() == "document not found" || err.Error() == "annex not found" {
			helpers.SendNotFound(c, err.Error())
			return
		}
		helpers.SendInternalError(c, err)
		return
	}

	fmt.Printf("✅ [DOCUMENT] Annex deleted successfully\n")

	// Log activity
	activityReq := models.ActivityLogRequest{
		Action:       "annex_deleted",
		Description:  fmt.Sprintf("Deleted annex '%s' from document '%s'", annexTitle, document.Title),
		ResourceType: "document",
		ResourceID:   &id,
		Success:      true,
		Details: map[string]interface{}{
			"documentId": id.Hex(),
			"annexId":    annexID,
			"annexTitle": annexTitle,
		},
	}
	if logErr := h.activityLogService.LogActivity(ctx, activityReq, c); logErr != nil {
		fmt.Printf("Failed to log activity: %v\n", logErr)
	}

	helpers.SendSuccess(c, "Annex deleted successfully", nil)
}

// UploadAnnexFiles handles file uploads for an annex
// POST /api/documents/:id/annexes/:annexId/files
func (h *DocumentHandler) UploadAnnexFiles(c *gin.Context) {
	idParam := c.Param("id")
	id, err := primitive.ObjectIDFromHex(idParam)
	if err != nil {
		helpers.SendBadRequest(c, "Invalid document ID format")
		return
	}

	annexID := c.Param("annexId")

	// Get current user
	_, exists := middleware.GetCurrentUser(c)
	if !exists {
		helpers.SendUnauthorized(c, "User not found in context", "UNAUTHORIZED")
		return
	}

	ctx := c.Request.Context()

	// Get the multipart form
	form, err := c.MultipartForm()
	if err != nil {
		helpers.SendBadRequest(c, "Failed to parse multipart form")
		return
	}

	files := form.File["files"]
	if len(files) == 0 {
		helpers.SendBadRequest(c, "No files uploaded")
		return
	}

	fmt.Printf("📎 [UPLOAD] Uploading %d files for annex %s\n", len(files), annexID)

	uploadedFiles := []map[string]interface{}{}

	for _, fileHeader := range files {
		// TODO: Implement actual file upload to MinIO
		// For now, return mock data
		uploadedFile := map[string]interface{}{
			"id":         primitive.NewObjectID().Hex(),
			"name":       fileHeader.Filename,
			"type":       fileHeader.Header.Get("Content-Type"),
			"size":       fileHeader.Size,
			"url":        fmt.Sprintf("/uploads/%s/%s", id.Hex(), fileHeader.Filename),
			"uploadedAt": time.Now().Format(time.RFC3339),
		}
		uploadedFiles = append(uploadedFiles, uploadedFile)
	}

	// Get current annex content
	document, err := h.documentService.GetByID(ctx, id)
	if err != nil {
		helpers.SendNotFound(c, "Document not found")
		return
	}

	// Find the annex and update its files
	var annexFound bool
	for i, annex := range document.Annexes {
		if annex.ID == annexID {
			annexFound = true

			// Get existing files or initialize empty array
			existingFiles, ok := annex.Content["files"].([]interface{})
			if !ok {
				existingFiles = []interface{}{}
			}

			// Append new files
			for _, file := range uploadedFiles {
				existingFiles = append(existingFiles, file)
			}

			// Update annex content
			document.Annexes[i].Content["files"] = existingFiles
			break
		}
	}

	if !annexFound {
		helpers.SendNotFound(c, "Annex not found")
		return
	}

	// Update the document with new files
	_, err = h.documentService.UpdateAnnex(ctx, id, annexID, &models.UpdateAnnexRequest{
		Content: &document.Annexes[0].Content,
	})
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	fmt.Printf("✅ [UPLOAD] Files uploaded successfully\n")

	c.JSON(http.StatusOK, uploadedFiles)
}

// DeleteAnnexFile handles file deletion from an annex
// DELETE /api/documents/:id/annexes/:annexId/files/:fileId
func (h *DocumentHandler) DeleteAnnexFile(c *gin.Context) {
	idParam := c.Param("id")
	id, err := primitive.ObjectIDFromHex(idParam)
	if err != nil {
		helpers.SendBadRequest(c, "Invalid document ID format")
		return
	}

	annexID := c.Param("annexId")
	fileID := c.Param("fileId")

	// Get current user
	_, exists := middleware.GetCurrentUser(c)
	if !exists {
		helpers.SendUnauthorized(c, "User not found in context", "UNAUTHORIZED")
		return
	}

	ctx := c.Request.Context()

	fmt.Printf("🗑️ [DELETE] Deleting file %s from annex %s\n", fileID, annexID)

	// Get current document
	document, err := h.documentService.GetByID(ctx, id)
	if err != nil {
		helpers.SendNotFound(c, "Document not found")
		return
	}

	// Find the annex and remove the file
	var annexFound bool
	for i, annex := range document.Annexes {
		if annex.ID == annexID {
			annexFound = true

			// Get existing files
			existingFiles, ok := annex.Content["files"].([]interface{})
			if !ok {
				existingFiles = []interface{}{}
			}

			// Remove the file with matching ID
			updatedFiles := []interface{}{}
			for _, file := range existingFiles {
				fileMap, ok := file.(map[string]interface{})
				if !ok {
					continue
				}
				if fileMap["id"] != fileID {
					updatedFiles = append(updatedFiles, file)
				}
			}

			// Update annex content
			document.Annexes[i].Content["files"] = updatedFiles
			break
		}
	}

	if !annexFound {
		helpers.SendNotFound(c, "Annex not found")
		return
	}

	// Update the document
	_, err = h.documentService.UpdateAnnex(ctx, id, annexID, &models.UpdateAnnexRequest{
		Content: &document.Annexes[0].Content,
	})
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	fmt.Printf("✅ [DELETE] File deleted successfully\n")

	helpers.SendSuccess(c, "File deleted successfully", nil)
}
