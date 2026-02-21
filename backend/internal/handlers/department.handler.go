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

// DepartmentHandler handles department-related HTTP requests
type DepartmentHandler struct {
	db *services.DatabaseService
}

// NewDepartmentHandler creates a new department handler instance
func NewDepartmentHandler(db *services.DatabaseService) *DepartmentHandler {
	return &DepartmentHandler{
		db: db,
	}
}

// GetDepartments returns all departments with optional filtering
// GET /api/departments
func (h *DepartmentHandler) GetDepartments(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	// Build filter based on query parameters
	filter := bson.M{}

	// Filter by active status
	if active := c.Query("active"); active != "" {
		if active == "true" {
			filter["active"] = true
		} else if active == "false" {
			filter["active"] = false
		}
	}

	// Filter by parent department
	if parentID := c.Query("parent_id"); parentID != "" {
		if parentID == "null" || parentID == "" {
			filter["parent_id"] = nil
		} else {
			objID, err := primitive.ObjectIDFromHex(parentID)
			if err != nil {
				helpers.SendBadRequest(c, "Invalid parent_id format")
				return
			}
			filter["parent_id"] = objID
		}
	}

	// Get departments from database
	collection := h.db.Collection("departments")
	cursor, err := collection.Find(ctx, filter)
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}
	defer cursor.Close(ctx)

	var departments []models.Department
	if err = cursor.All(ctx, &departments); err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	// Convert to response format
	responses := make([]models.DepartmentResponse, len(departments))
	for i, dept := range departments {
		responses[i] = dept.ToResponse()
	}

	helpers.SendSuccess(c, "Departments retrieved successfully", responses)
}

// GetDepartment returns a specific department by ID
// GET /api/departments/:id
func (h *DepartmentHandler) GetDepartment(c *gin.Context) {
	departmentID := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(departmentID)
	if err != nil {
		helpers.SendBadRequest(c, "Invalid department ID format")
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	collection := h.db.Collection("departments")
	var department models.Department
	err = collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&department)
	if err != nil {
		helpers.SendError(c, models.ErrUserNotFound) // Reuse error for "not found"
		return
	}

	helpers.SendSuccess(c, "Department retrieved successfully", department.ToResponse())
}

// CreateDepartment creates a new department
// POST /api/departments
func (h *DepartmentHandler) CreateDepartment(c *gin.Context) {
	var req models.CreateDepartmentRequest
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

	// Check if department code already exists
	collection := h.db.Collection("departments")
	count, err := collection.CountDocuments(ctx, bson.M{"code": req.Code})
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}
	if count > 0 {
		helpers.SendError(c, models.ErrEmailExists) // Reuse for "already exists"
		return
	}

	// Create department object
	department := models.Department{
		ID:          primitive.NewObjectID(),
		Name:        req.Name,
		Code:        req.Code,
		Description: req.Description,
		Active:      true,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
		CreatedBy:   userID,
	}

	// Handle parent department
	if req.ParentID != "" {
		parentObjID, err := primitive.ObjectIDFromHex(req.ParentID)
		if err != nil {
			helpers.SendBadRequest(c, "Invalid parent_id format")
			return
		}
		department.ParentID = &parentObjID
	}

	// Handle domain
	if req.DomainID != "" {
		domainObjID, err := primitive.ObjectIDFromHex(req.DomainID)
		if err != nil {
			helpers.SendBadRequest(c, "Invalid domain_id format")
			return
		}
		department.DomainID = &domainObjID
	}

	// Handle manager
	if req.ManagerID != "" {
		managerObjID, err := primitive.ObjectIDFromHex(req.ManagerID)
		if err != nil {
			helpers.SendBadRequest(c, "Invalid manager_id format")
			return
		}
		department.ManagerID = &managerObjID
	}

	// Insert department
	_, err = collection.InsertOne(ctx, department)
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	helpers.SendCreated(c, "Department created successfully", department.ToResponse())
}

// UpdateDepartment updates an existing department
// PUT /api/departments/:id
func (h *DepartmentHandler) UpdateDepartment(c *gin.Context) {
	departmentID := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(departmentID)
	if err != nil {
		helpers.SendBadRequest(c, "Invalid department ID format")
		return
	}

	var req models.UpdateDepartmentRequest
	if err := helpers.BindAndValidate(c, &req); err != nil {
		helpers.SendValidationErrors(c, err)
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	collection := h.db.Collection("departments")

	// Check if department exists
	var existingDept models.Department
	err = collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&existingDept)
	if err != nil {
		helpers.SendError(c, models.ErrUserNotFound) // Reuse for "not found"
		return
	}

	// Build update document
	updateDoc := bson.M{
		"updated_at": time.Now(),
	}

	// Update fields if provided
	if req.Name != "" {
		updateDoc["name"] = req.Name
	}
	if req.Code != "" {
		// Check if new code conflicts with existing departments
		count, err := collection.CountDocuments(ctx, bson.M{
			"code": req.Code,
			"_id":  bson.M{"$ne": objID},
		})
		if err != nil {
			helpers.SendInternalError(c, err)
			return
		}
		if count > 0 {
			helpers.SendError(c, models.ErrEmailExists) // Reuse for "already exists"
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
	if req.ParentID != "" {
		if req.ParentID == "null" {
			updateDoc["parent_id"] = nil
		} else {
			parentObjID, err := primitive.ObjectIDFromHex(req.ParentID)
			if err != nil {
				helpers.SendBadRequest(c, "Invalid parent_id format")
				return
			}
			updateDoc["parent_id"] = parentObjID
		}
	}
	if req.ManagerID != "" {
		if req.ManagerID == "null" {
			updateDoc["manager_id"] = nil
		} else {
			managerObjID, err := primitive.ObjectIDFromHex(req.ManagerID)
			if err != nil {
				helpers.SendBadRequest(c, "Invalid manager_id format")
				return
			}
			updateDoc["manager_id"] = managerObjID
		}
	}
	if req.DomainID != "" {
		if req.DomainID == "null" {
			updateDoc["domain_id"] = nil
		} else {
			domainObjID, err := primitive.ObjectIDFromHex(req.DomainID)
			if err != nil {
				helpers.SendBadRequest(c, "Invalid domain_id format")
				return
			}
			updateDoc["domain_id"] = domainObjID
		}
	}

	// Perform update
	_, err = collection.UpdateOne(ctx, bson.M{"_id": objID}, bson.M{"$set": updateDoc})
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	// Return updated department
	var updatedDept models.Department
	err = collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&updatedDept)
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	helpers.SendSuccess(c, "Department updated successfully", updatedDept.ToResponse())
}

// DeleteDepartment deletes a department
// DELETE /api/departments/:id
func (h *DepartmentHandler) DeleteDepartment(c *gin.Context) {
	departmentID := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(departmentID)
	if err != nil {
		helpers.SendBadRequest(c, "Invalid department ID format")
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	collection := h.db.Collection("departments")

	// Check if department has sub-departments
	subDeptCount, err := collection.CountDocuments(ctx, bson.M{"parent_id": objID})
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}
	if subDeptCount > 0 {
		helpers.SendBadRequest(c, "Cannot delete department with sub-departments")
		return
	}

	// Check if department has job positions
	jobPositionsCollection := h.db.Collection("job_positions")
	jobCount, err := jobPositionsCollection.CountDocuments(ctx, bson.M{"department_id": objID})
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}
	if jobCount > 0 {
		helpers.SendBadRequest(c, "Cannot delete department with job positions")
		return
	}

	// Check if department has users
	usersCollection := h.db.Collection("users")
	userCount, err := usersCollection.CountDocuments(ctx, bson.M{"department_id": objID})
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}
	if userCount > 0 {
		helpers.SendBadRequest(c, "Cannot delete department with users")
		return
	}

	// Delete department
	result, err := collection.DeleteOne(ctx, bson.M{"_id": objID})
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}
	if result.DeletedCount == 0 {
		helpers.SendError(c, models.ErrUserNotFound) // Reuse for "not found"
		return
	}

	helpers.SendSuccess(c, "Department deleted successfully", gin.H{"deleted_id": departmentID})
}
