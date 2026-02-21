package handlers

import (
	"context"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kodesonik/process-manager/internal/helpers"
	"github.com/kodesonik/process-manager/internal/middleware"
	"github.com/kodesonik/process-manager/internal/models"
	"github.com/kodesonik/process-manager/internal/services"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// MacroHandler handles macro-related HTTP requests
type MacroHandler struct {
	macroService *services.MacroService
}

// NewMacroHandler creates a new macro handler instance
func NewMacroHandler(macroService *services.MacroService) *MacroHandler {
	return &MacroHandler{
		macroService: macroService,
	}
}

// GetMacros returns all macros with optional filtering and pagination
// GET /api/macros?search=&page=1&limit=20
func (h *MacroHandler) GetMacros(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	// Build filter from query parameters
	filter := &models.MacroFilter{
		Page:  1,
		Limit: 20,
	}

	// Parse pagination
	if page := c.Query("page"); page != "" {
		if p, err := strconv.Atoi(page); err == nil && p > 0 {
			filter.Page = p
		}
	}
	if limit := c.Query("limit"); limit != "" {
		if l, err := strconv.Atoi(limit); err == nil && l > 0 {
			filter.Limit = l
		}
	}

	// Parse search
	if search := c.Query("search"); search != "" {
		filter.Search = &search
	}
	// Check user role for filtering
	userRole, _ := middleware.GetCurrentUserRole(c)
	if userRole != models.RoleAdmin {
		isActive := true
		filter.IsActive = &isActive
	} else {
		// For admins, allow filtering by status
		if isActiveStr := c.Query("isActive"); isActiveStr != "" {
			if isActive, err := strconv.ParseBool(isActiveStr); err == nil {
				filter.IsActive = &isActive
			}
		}
	}

	// Parse sorting
	if sortBy := c.Query("sortBy"); sortBy != "" {
		filter.SortBy = sortBy
	}
	if order := c.Query("order"); order != "" {
		filter.SortOrder = order
	}

	// Parse domain filter
	if domainID := c.Query("domainId"); domainID != "" {
		filter.DomainID = &domainID
	}

	// Get macros
	macros, total, err := h.macroService.GetAllMacros(ctx, filter)
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	// Calculate pagination info
	totalPages := (int(total) + filter.Limit - 1) / filter.Limit

	helpers.SendSuccessWithPagination(c, "Macros retrieved successfully", macros, helpers.PaginationInfo{
		Page:       filter.Page,
		Limit:      filter.Limit,
		Total:      int(total),
		TotalPages: totalPages,
	})
}

// GetMacro returns a specific macro by ID
// GET /api/macros/:id
func (h *MacroHandler) GetMacro(c *gin.Context) {
	macroID := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(macroID)
	if err != nil {
		helpers.SendBadRequest(c, "Invalid macro ID format")
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	macro, err := h.macroService.GetMacroByID(ctx, objID)
	if err != nil {
		helpers.SendError(c, models.ErrUserNotFound) // Reuse for "not found"
		return
	}

	// Get process count
	processCount, err := h.macroService.GetProcessCountByMacroID(ctx, macro.ID)
	if err == nil {
		response := macro.ToResponse()
		response.ProcessCount = int(processCount)
		helpers.SendSuccess(c, "Macro retrieved successfully", response)
		return
	}

	helpers.SendSuccess(c, "Macro retrieved successfully", macro.ToResponse())
}

// CreateMacro creates a new macro
// POST /api/macros
func (h *MacroHandler) CreateMacro(c *gin.Context) {
	var req models.CreateMacroRequest
	if err := helpers.BindAndValidate(c, &req); err != nil {
		helpers.SendValidationErrors(c, err)
		return
	}

	// Get current user for audit trail
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		helpers.SendInternalError(c, models.ErrUserNotFound)
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	// Create macro
	macro, err := h.macroService.CreateMacro(ctx, &req, userID)
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	helpers.SendCreated(c, "Macro created successfully", macro.ToResponse())
}

// UpdateMacro updates an existing macro
// PUT /api/macros/:id
func (h *MacroHandler) UpdateMacro(c *gin.Context) {
	macroID := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(macroID)
	if err != nil {
		helpers.SendBadRequest(c, "Invalid macro ID format")
		return
	}

	var req models.UpdateMacroRequest
	if err := helpers.BindAndValidate(c, &req); err != nil {
		helpers.SendValidationErrors(c, err)
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	// Update macro
	macro, err := h.macroService.UpdateMacro(ctx, objID, &req)
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	helpers.SendSuccess(c, "Macro updated successfully", macro.ToResponse())
}

// DeleteMacro deletes a macro by ID
// DELETE /api/macros/:id
func (h *MacroHandler) DeleteMacro(c *gin.Context) {
	macroID := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(macroID)
	if err != nil {
		helpers.SendBadRequest(c, "Invalid macro ID format")
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	// Delete macro
	err = h.macroService.DeleteMacro(ctx, objID)
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	helpers.SendSuccess(c, "Macro deleted successfully", nil)
}

// GetMacroProcesses returns all processes belonging to a macro
// GET /api/macros/:id/processes?page=1&limit=20
func (h *MacroHandler) GetMacroProcesses(c *gin.Context) {
	macroID := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(macroID)
	if err != nil {
		helpers.SendBadRequest(c, "Invalid macro ID format")
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	// Verify macro exists
	_, err = h.macroService.GetMacroByID(ctx, objID)
	if err != nil {
		helpers.SendError(c, models.ErrUserNotFound) // Reuse for "not found"
		return
	}

	// Parse pagination
	page := 1
	limit := 20
	if p := c.Query("page"); p != "" {
		if parsed, err := strconv.Atoi(p); err == nil && parsed > 0 {
			page = parsed
		}
	}
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	// Check user role for filtering
	var isActive *bool
	userRole, _ := middleware.GetCurrentUserRole(c)
	if userRole != models.RoleAdmin {
		active := true
		isActive = &active
	}

	// Get processes
	processes, total, err := h.macroService.GetProcessesByMacroID(ctx, objID, limit, page, isActive)
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	// Calculate pagination info
	totalPages := (int(total) + limit - 1) / limit

	helpers.SendSuccessWithPagination(c, "Processes retrieved successfully", processes, helpers.PaginationInfo{
		Page:       page,
		Limit:      limit,
		Total:      int(total),
		TotalPages: totalPages,
	})
}

// ReorderProcesses reorders processes in a macro
// PUT /api/macros/:id/reorder-processes
func (h *MacroHandler) ReorderProcesses(c *gin.Context) {
	macroID := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(macroID)
	if err != nil {
		helpers.SendBadRequest(c, "Invalid macro ID format")
		return
	}

	var req models.ReorderProcessesRequest
	if err := helpers.BindAndValidate(c, &req); err != nil {
		helpers.SendValidationErrors(c, err)
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	err = h.macroService.ReorderProcesses(ctx, objID, req.ProcessIDs)
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	helpers.SendSuccess(c, "Processes reordered successfully", nil)
}

// ExportPDF exports macro as PDF
// GET /api/macros/:id/export-pdf
func (h *MacroHandler) ExportPDF(c *gin.Context) {
	macroID := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(macroID)
	if err != nil {
		helpers.SendBadRequest(c, "Invalid macro ID format")
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 60*time.Second) // Longer timeout for PDF generation
	defer cancel()

	// Export PDF
	pdfURL, err := h.macroService.ExportPDF(ctx, objID)
	if err != nil {
		if err.Error() == "macro not found" {
			helpers.SendNotFound(c, "Macro not found")
			return
		}
		helpers.SendInternalError(c, err)
		return
	}

	helpers.SendSuccess(c, "PDF exported successfully", gin.H{
		"pdfUrl": pdfURL,
	})
}
