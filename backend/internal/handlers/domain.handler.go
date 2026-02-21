package handlers

import (
	"context"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kodesonik/process-manager/internal/helpers"
	"github.com/kodesonik/process-manager/internal/middleware"
	"github.com/kodesonik/process-manager/internal/models"
	"github.com/kodesonik/process-manager/internal/services"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// DomainHandler handles domain-related HTTP requests
type DomainHandler struct {
	db *services.DatabaseService
}

// NewDomainHandler creates a new domain handler instance
func NewDomainHandler(db *services.DatabaseService) *DomainHandler {
	return &DomainHandler{
		db: db,
	}
}

// GetDomains returns all domains with optional filtering
// GET /api/domains
func (h *DomainHandler) GetDomains(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	filter := bson.M{}

	if active := c.Query("active"); active != "" {
		if active == "true" {
			filter["active"] = true
		} else if active == "false" {
			filter["active"] = false
		}
	}

	collection := h.db.Collection("domains")
	cursor, err := collection.Find(ctx, filter)
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}
	defer cursor.Close(ctx)

	var domains []models.Domain
	if err = cursor.All(ctx, &domains); err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	responses := make([]models.DomainResponse, len(domains))
	for i, domain := range domains {
		responses[i] = domain.ToResponse()
	}

	helpers.SendSuccess(c, "Domains retrieved successfully", responses)
}

// GetDomain returns a specific domain by ID
// GET /api/domains/:id
func (h *DomainHandler) GetDomain(c *gin.Context) {
	domainID := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(domainID)
	if err != nil {
		helpers.SendBadRequest(c, "Invalid domain ID format")
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	collection := h.db.Collection("domains")
	var domain models.Domain
	err = collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&domain)
	if err != nil {
		helpers.SendError(c, models.ErrUserNotFound)
		return
	}

	helpers.SendSuccess(c, "Domain retrieved successfully", domain.ToResponse())
}

// CreateDomain creates a new domain
// POST /api/domains
func (h *DomainHandler) CreateDomain(c *gin.Context) {
	var req models.CreateDomainRequest
	if err := helpers.BindAndValidate(c, &req); err != nil {
		helpers.SendValidationErrors(c, err)
		return
	}

	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		helpers.SendInternalError(c, models.ErrUserNotFound)
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	// Check if domain code already exists
	collection := h.db.Collection("domains")
	count, err := collection.CountDocuments(ctx, bson.M{"code": req.Code})
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}
	if count > 0 {
		helpers.SendBadRequest(c, "Domain code already exists")
		return
	}

	domain := models.Domain{
		ID:          primitive.NewObjectID(),
		Name:        req.Name,
		Code:        req.Code,
		Description: req.Description,
		Active:      true,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
		CreatedBy:   userID,
	}

	_, err = collection.InsertOne(ctx, domain)
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	helpers.SendCreated(c, "Domain created successfully", domain.ToResponse())
}

// UpdateDomain updates an existing domain
// PUT /api/domains/:id
func (h *DomainHandler) UpdateDomain(c *gin.Context) {
	domainID := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(domainID)
	if err != nil {
		helpers.SendBadRequest(c, "Invalid domain ID format")
		return
	}

	var req models.UpdateDomainRequest
	if err := helpers.BindAndValidate(c, &req); err != nil {
		helpers.SendValidationErrors(c, err)
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	collection := h.db.Collection("domains")

	// Check if domain exists
	var existingDomain models.Domain
	err = collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&existingDomain)
	if err != nil {
		helpers.SendError(c, models.ErrUserNotFound)
		return
	}

	updateDoc := bson.M{
		"updated_at": time.Now(),
	}

	if req.Name != "" {
		updateDoc["name"] = req.Name
	}
	if req.Code != "" {
		count, err := collection.CountDocuments(ctx, bson.M{
			"code": req.Code,
			"_id":  bson.M{"$ne": objID},
		})
		if err != nil {
			helpers.SendInternalError(c, err)
			return
		}
		if count > 0 {
			helpers.SendBadRequest(c, "Domain code already exists")
			return
		}
		updateDoc["code"] = req.Code
	}
	if req.Description != "" {
		updateDoc["description"] = req.Description
	}
	if req.Active != nil {
		updateDoc["active"] = *req.Active
	}

	_, err = collection.UpdateOne(ctx, bson.M{"_id": objID}, bson.M{"$set": updateDoc})
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	var updatedDomain models.Domain
	err = collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&updatedDomain)
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	helpers.SendSuccess(c, "Domain updated successfully", updatedDomain.ToResponse())
}

// DeleteDomain deletes a domain
// DELETE /api/domains/:id
func (h *DomainHandler) DeleteDomain(c *gin.Context) {
	domainID := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(domainID)
	if err != nil {
		helpers.SendBadRequest(c, "Invalid domain ID format")
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	// Check if domain has departments
	deptCollection := h.db.Collection("departments")
	deptCount, err := deptCollection.CountDocuments(ctx, bson.M{"domain_id": objID})
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}
	if deptCount > 0 {
		helpers.SendBadRequest(c, "Cannot delete domain with departments")
		return
	}

	collection := h.db.Collection("domains")
	result, err := collection.DeleteOne(ctx, bson.M{"_id": objID})
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}
	if result.DeletedCount == 0 {
		helpers.SendError(c, models.ErrUserNotFound)
		return
	}

	helpers.SendSuccess(c, "Domain deleted successfully", gin.H{"deleted_id": domainID})
}
