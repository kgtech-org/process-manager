package handlers

import (
	"context"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kodesonik/process-manager/internal/helpers"
	"github.com/kodesonik/process-manager/internal/models"
	"github.com/kodesonik/process-manager/internal/services"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// JobPositionHandler handles job position-related HTTP requests
type JobPositionHandler struct {
	db *services.DatabaseService
}

// NewJobPositionHandler creates a new job position handler instance
func NewJobPositionHandler(db *services.DatabaseService) *JobPositionHandler {
	return &JobPositionHandler{
		db: db,
	}
}

// GetJobPositions returns all job positions with optional filtering
// GET /api/job-positions
func (h *JobPositionHandler) GetJobPositions(c *gin.Context) {
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

	// Filter by department (support both camelCase and snake_case)
	departmentID := c.Query("departmentId")
	if departmentID == "" {
		departmentID = c.Query("department_id")
	}
	if departmentID != "" {
		objID, err := primitive.ObjectIDFromHex(departmentID)
		if err != nil {
			helpers.SendBadRequest(c, "Invalid departmentId format")
			return
		}
		filter["department_id"] = objID
	}

	// Filter by level
	if level := c.Query("level"); level != "" {
		filter["level"] = level
	}

	// Get job positions from database
	collection := h.db.Collection("job_positions")
	cursor, err := collection.Find(ctx, filter)
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}
	defer cursor.Close(ctx)

	var jobPositions []models.JobPosition
	if err = cursor.All(ctx, &jobPositions); err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	// Convert to response format
	responses := make([]models.JobPositionResponse, len(jobPositions))
	for i, pos := range jobPositions {
		responses[i] = pos.ToResponse()
	}

	helpers.SendSuccess(c, "Job positions retrieved successfully", responses)
}

// GetJobPosition returns a specific job position by ID
// GET /api/job-positions/:id
func (h *JobPositionHandler) GetJobPosition(c *gin.Context) {
	positionID := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(positionID)
	if err != nil {
		helpers.SendBadRequest(c, "Invalid job position ID format")
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	collection := h.db.Collection("job_positions")
	var jobPosition models.JobPosition
	err = collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&jobPosition)
	if err != nil {
		helpers.SendError(c, models.ErrUserNotFound) // Reuse error for "not found"
		return
	}

	helpers.SendSuccess(c, "Job position retrieved successfully", jobPosition.ToResponse())
}

// CreateJobPosition creates a new job position
// POST /api/job-positions
func (h *JobPositionHandler) CreateJobPosition(c *gin.Context) {
	var req models.CreateJobPositionRequest
	if err := helpers.BindAndValidate(c, &req); err != nil {
		helpers.SendValidationErrors(c, err)
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	// Verify department exists
	departmentObjID, err := primitive.ObjectIDFromHex(req.DepartmentID)
	if err != nil {
		helpers.SendBadRequest(c, "Invalid department_id format")
		return
	}

	deptCollection := h.db.Collection("departments")
	deptCount, err := deptCollection.CountDocuments(ctx, bson.M{"_id": departmentObjID, "active": true})
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}
	if deptCount == 0 {
		helpers.SendBadRequest(c, "Department not found or inactive")
		return
	}

	// Check if job position code already exists
	collection := h.db.Collection("job_positions")
	count, err := collection.CountDocuments(ctx, bson.M{"code": req.Code})
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}
	if count > 0 {
		helpers.SendError(c, models.ErrEmailExists) // Reuse for "already exists"
		return
	}

	// Create job position object
	jobPosition := models.JobPosition{
		ID:             primitive.NewObjectID(),
		Title:          req.Title,
		Code:           req.Code,
		Description:    req.Description,
		DepartmentID:   departmentObjID,
		Level:          req.Level,
		RequiredSkills: req.RequiredSkills,
		Active:         true,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	// Insert job position
	_, err = collection.InsertOne(ctx, jobPosition)
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	helpers.SendCreated(c, "Job position created successfully", jobPosition.ToResponse())
}

// UpdateJobPosition updates an existing job position
// PUT /api/job-positions/:id
func (h *JobPositionHandler) UpdateJobPosition(c *gin.Context) {
	positionID := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(positionID)
	if err != nil {
		helpers.SendBadRequest(c, "Invalid job position ID format")
		return
	}

	var req models.UpdateJobPositionRequest
	if err := helpers.BindAndValidate(c, &req); err != nil {
		helpers.SendValidationErrors(c, err)
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	collection := h.db.Collection("job_positions")

	// Check if job position exists
	var existingPos models.JobPosition
	err = collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&existingPos)
	if err != nil {
		helpers.SendError(c, models.ErrUserNotFound) // Reuse for "not found"
		return
	}

	// Build update document
	updateDoc := bson.M{
		"updated_at": time.Now(),
	}

	// Update fields if provided
	if req.Title != "" {
		updateDoc["title"] = req.Title
	}
	if req.Code != "" {
		// Check if new code conflicts with existing job positions
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
	if req.DepartmentID != "" {
		// Verify department exists
		departmentObjID, err := primitive.ObjectIDFromHex(req.DepartmentID)
		if err != nil {
			helpers.SendBadRequest(c, "Invalid department_id format")
			return
		}

		deptCollection := h.db.Collection("departments")
		deptCount, err := deptCollection.CountDocuments(ctx, bson.M{"_id": departmentObjID, "active": true})
		if err != nil {
			helpers.SendInternalError(c, err)
			return
		}
		if deptCount == 0 {
			helpers.SendBadRequest(c, "Department not found or inactive")
			return
		}
		updateDoc["department_id"] = departmentObjID
	}
	if req.Level != "" {
		updateDoc["level"] = req.Level
	}
	if req.RequiredSkills != nil {
		updateDoc["required_skills"] = req.RequiredSkills
	}
	if req.Active != nil {
		updateDoc["active"] = *req.Active
	}

	// Perform update
	_, err = collection.UpdateOne(ctx, bson.M{"_id": objID}, bson.M{"$set": updateDoc})
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	// Return updated job position
	var updatedPos models.JobPosition
	err = collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&updatedPos)
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}

	helpers.SendSuccess(c, "Job position updated successfully", updatedPos.ToResponse())
}

// DeleteJobPosition deletes a job position
// DELETE /api/job-positions/:id
func (h *JobPositionHandler) DeleteJobPosition(c *gin.Context) {
	positionID := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(positionID)
	if err != nil {
		helpers.SendBadRequest(c, "Invalid job position ID format")
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	collection := h.db.Collection("job_positions")

	// Check if job position has users
	usersCollection := h.db.Collection("users")
	userCount, err := usersCollection.CountDocuments(ctx, bson.M{"job_position_id": objID})
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}
	if userCount > 0 {
		helpers.SendBadRequest(c, "Cannot delete job position with users")
		return
	}

	// Delete job position
	result, err := collection.DeleteOne(ctx, bson.M{"_id": objID})
	if err != nil {
		helpers.SendInternalError(c, err)
		return
	}
	if result.DeletedCount == 0 {
		helpers.SendError(c, models.ErrUserNotFound) // Reuse for "not found"
		return
	}

	helpers.SendSuccess(c, "Job position deleted successfully", gin.H{"deleted_id": positionID})
}