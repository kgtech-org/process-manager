package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/kodesonik/process-manager/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type DocumentService struct {
	collection           *mongo.Collection
	versionCollection    *mongo.Collection
	invitationCollection *mongo.Collection
	userService          *UserService
}

func NewDocumentService(db *mongo.Database, userService *UserService) *DocumentService {
	return &DocumentService{
		collection:           db.Collection("documents"),
		versionCollection:    db.Collection("document_versions"),
		invitationCollection: db.Collection("invitations"),
		userService:          userService,
	}
}

// Create creates a new document
func (s *DocumentService) Create(ctx context.Context, req *models.CreateDocumentRequest, userID primitive.ObjectID) (*models.Document, error) {
	// Check if reference already exists
	exists, err := s.referenceExists(ctx, req.Reference)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, errors.New("document reference already exists")
	}

	// Get user details to add as author
	user, err := s.userService.GetUserByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user details: %w", err)
	}

	// Initialize empty arrays if nil
	if req.Contributors.Authors == nil {
		req.Contributors.Authors = make([]models.Contributor, 0)
	}
	if req.Contributors.Verifiers == nil {
		req.Contributors.Verifiers = make([]models.Contributor, 0)
	}
	if req.Contributors.Validators == nil {
		req.Contributors.Validators = make([]models.Contributor, 0)
	}

	// Add the document owner as an author with 'joined' status
	now := time.Now()
	ownerContributor := models.Contributor{
		UserID:     userID,
		Name:       fmt.Sprintf("%s %s", user.FirstName, user.LastName),
		Title:      "", // Will be populated from job position if needed
		Department: "", // Will be populated from department if needed
		Team:       models.ContributorTeamAuthors,
		Status:     models.SignatureStatusJoined,
		InvitedAt:  now,
	}
	req.Contributors.Authors = append(req.Contributors.Authors, ownerContributor)
	if req.Metadata.Objectives == nil {
		req.Metadata.Objectives = make([]string, 0)
	}
	if req.Metadata.ImplicatedActors == nil {
		req.Metadata.ImplicatedActors = make([]string, 0)
	}
	if req.Metadata.ManagementRules == nil {
		req.Metadata.ManagementRules = make([]string, 0)
	}
	if req.Metadata.Terminology == nil {
		req.Metadata.Terminology = make([]string, 0)
	}
	if req.Metadata.ChangeHistory == nil {
		req.Metadata.ChangeHistory = make([]models.ChangeHistoryEntry, 0)
	}
	if req.ProcessGroups == nil {
		req.ProcessGroups = make([]models.ProcessGroup, 0)
	}
	if req.Annexes == nil {
		req.Annexes = make([]models.Annex, 0)
	}

	document := &models.Document{
		ID:            primitive.NewObjectID(),
		Reference:     req.Reference,
		Title:         req.Title,
		Version:       req.Version,
		Status:        models.DocumentStatusDraft,
		CreatedBy:     userID,
		Contributors:  req.Contributors,
		Metadata:      req.Metadata,
		ProcessGroups: req.ProcessGroups,
		Annexes:       req.Annexes,
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	_, err = s.collection.InsertOne(ctx, document)
	if err != nil {
		return nil, fmt.Errorf("failed to create document: %w", err)
	}

	// Create initial version
	err = s.createVersion(ctx, document, userID, "Initial version")
	if err != nil {
		// Log error but don't fail the creation
		fmt.Printf("Failed to create initial version: %v\n", err)
	}

	return document, nil
}

// GetByID retrieves a document by ID
func (s *DocumentService) GetByID(ctx context.Context, id primitive.ObjectID) (*models.Document, error) {
	var document models.Document
	err := s.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&document)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, errors.New("document not found")
		}
		return nil, fmt.Errorf("failed to get document: %w", err)
	}

	return &document, nil
}

// GetByReference retrieves a document by reference
func (s *DocumentService) GetByReference(ctx context.Context, reference string) (*models.Document, error) {
	var document models.Document
	err := s.collection.FindOne(ctx, bson.M{"reference": reference}).Decode(&document)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, errors.New("document not found")
		}
		return nil, fmt.Errorf("failed to get document: %w", err)
	}

	return &document, nil
}

// List retrieves documents with filtering and pagination
func (s *DocumentService) List(ctx context.Context, filter *models.DocumentFilter) ([]*models.Document, int64, error) {
	// Build filter
	query := bson.M{}

	if filter.Status != nil {
		query["status"] = *filter.Status
	}

	if filter.CreatedBy != nil {
		createdByID, err := primitive.ObjectIDFromHex(*filter.CreatedBy)
		if err != nil {
			return nil, 0, errors.New("invalid createdBy ID")
		}
		query["created_by"] = createdByID
	}

	if filter.Search != nil && *filter.Search != "" {
		query["$or"] = []bson.M{
			{"title": bson.M{"$regex": *filter.Search, "$options": "i"}},
			{"reference": bson.M{"$regex": *filter.Search, "$options": "i"}},
		}
	}

	// Count total documents
	total, err := s.collection.CountDocuments(ctx, query)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count documents: %w", err)
	}

	// Set pagination defaults
	page := filter.Page
	if page < 1 {
		page = 1
	}
	limit := filter.Limit
	if limit < 1 {
		limit = 20
	}
	skip := (page - 1) * limit

	// Find documents
	findOptions := options.Find().
		SetSort(bson.D{{Key: "created_at", Value: -1}}).
		SetSkip(int64(skip)).
		SetLimit(int64(limit))

	cursor, err := s.collection.Find(ctx, query, findOptions)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to find documents: %w", err)
	}
	defer cursor.Close(ctx)

	documents := make([]*models.Document, 0)
	if err = cursor.All(ctx, &documents); err != nil {
		return nil, 0, fmt.Errorf("failed to decode documents: %w", err)
	}

	return documents, total, nil
}

// ListUserAccessible retrieves documents that a user has access to
// Users can access documents if they are:
// 1. The document creator
// 2. A contributor (author, verifier, validator)
// 3. Have an accepted invitation
// Note: Admins should be handled at the handler level
func (s *DocumentService) ListUserAccessible(ctx context.Context, userID primitive.ObjectID, userRole models.UserRole, filter *models.DocumentFilter) ([]*models.Document, int64, error) {
	// Admin users can see all documents
	if userRole == models.RoleAdmin {
		return s.List(ctx, filter)
	}

	// Build base filter
	baseQuery := bson.M{}

	if filter.Status != nil {
		baseQuery["status"] = *filter.Status
	}

	if filter.CreatedBy != nil {
		createdByID, err := primitive.ObjectIDFromHex(*filter.CreatedBy)
		if err != nil {
			return nil, 0, errors.New("invalid createdBy ID")
		}
		baseQuery["created_by"] = createdByID
	}

	if filter.Search != nil && *filter.Search != "" {
		baseQuery["$or"] = []bson.M{
			{"title": bson.M{"$regex": *filter.Search, "$options": "i"}},
			{"reference": bson.M{"$regex": *filter.Search, "$options": "i"}},
		}
	}

	// Get documents where user has accepted invitations
	invitedDocIDs := []primitive.ObjectID{}
	invCursor, err := s.invitationCollection.Find(ctx, bson.M{
		"invited_user_id": userID,
		"status":          models.InvitationStatusAccepted,
	})
	if err == nil {
		defer invCursor.Close(ctx)
		for invCursor.Next(ctx) {
			var inv models.Invitation
			if err := invCursor.Decode(&inv); err == nil {
				invitedDocIDs = append(invitedDocIDs, inv.DocumentID)
			}
		}
	}

	// Build access query: user is creator OR contributor OR has invitation
	accessQuery := bson.M{
		"$or": []bson.M{
			{"created_by": userID}, // User is creator
			{"contributors.authors.user_id": userID},    // User is author
			{"contributors.verifiers.user_id": userID},  // User is verifier
			{"contributors.validators.user_id": userID}, // User is validator
		},
	}

	// Add invited documents if any
	if len(invitedDocIDs) > 0 {
		accessQuery["$or"] = append(accessQuery["$or"].([]bson.M), bson.M{
			"_id": bson.M{"$in": invitedDocIDs},
		})
	}

	// Combine base filter with access query
	finalQuery := bson.M{
		"$and": []bson.M{
			baseQuery,
			accessQuery,
		},
	}

	// Count total accessible documents
	total, err := s.collection.CountDocuments(ctx, finalQuery)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count documents: %w", err)
	}

	// Set pagination defaults
	page := filter.Page
	if page < 1 {
		page = 1
	}
	limit := filter.Limit
	if limit < 1 {
		limit = 20
	}
	skip := (page - 1) * limit

	// Find documents
	findOptions := options.Find().
		SetSort(bson.D{{Key: "created_at", Value: -1}}).
		SetSkip(int64(skip)).
		SetLimit(int64(limit))

	cursor, err := s.collection.Find(ctx, finalQuery, findOptions)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to find documents: %w", err)
	}
	defer cursor.Close(ctx)

	documents := make([]*models.Document, 0)
	if err = cursor.All(ctx, &documents); err != nil {
		return nil, 0, fmt.Errorf("failed to decode documents: %w", err)
	}

	return documents, total, nil
}

// Update updates a document
func (s *DocumentService) Update(ctx context.Context, id primitive.ObjectID, req *models.UpdateDocumentRequest, userID primitive.ObjectID) (*models.Document, error) {
	// Get existing document
	document, err := s.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Build update fields
	update := bson.M{
		"updated_at": time.Now(),
	}

	if req.Title != nil {
		update["title"] = *req.Title
	}
	if req.Version != nil {
		update["version"] = *req.Version
	}
	if req.Status != nil {
		update["status"] = *req.Status
		// Set approved_at when status changes to approved
		if *req.Status == models.DocumentStatusApproved {
			now := time.Now()
			update["approved_at"] = now
		}
	}
	if req.Contributors != nil {
		update["contributors"] = *req.Contributors
	}
	if req.Metadata != nil {
		update["metadata"] = *req.Metadata
	}
	if req.ProcessGroups != nil {
		update["process_groups"] = *req.ProcessGroups
	}
	if req.Annexes != nil {
		update["annexes"] = *req.Annexes
	}

	// Update document
	result := s.collection.FindOneAndUpdate(
		ctx,
		bson.M{"_id": id},
		bson.M{"$set": update},
		options.FindOneAndUpdate().SetReturnDocument(options.After),
	)

	var updatedDocument models.Document
	if err := result.Decode(&updatedDocument); err != nil {
		return nil, fmt.Errorf("failed to update document: %w", err)
	}

	// Create version if version number changed
	if req.Version != nil && *req.Version != document.Version {
		changeNote := fmt.Sprintf("Updated to version %s", *req.Version)
		err = s.createVersion(ctx, &updatedDocument, userID, changeNote)
		if err != nil {
			fmt.Printf("Failed to create version: %v\n", err)
		}
	}

	return &updatedDocument, nil
}

// Publish publishes a document for signature
// Sets all contributors with 'joined' status to 'pending' signature
// Changes document status to 'author_review'
func (s *DocumentService) Publish(ctx context.Context, id primitive.ObjectID) (*models.Document, error) {
	// Get existing document
	document, err := s.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Check if document is in draft status
	if document.Status != models.DocumentStatusDraft {
		return nil, errors.New("only draft documents can be published")
	}

	// Update all contributors with 'joined' status to 'pending'
	now := time.Now()

	// Update authors
	for i := range document.Contributors.Authors {
		if document.Contributors.Authors[i].Status == models.SignatureStatusJoined {
			document.Contributors.Authors[i].Status = models.SignatureStatusPending
		}
	}

	// Update verifiers
	for i := range document.Contributors.Verifiers {
		if document.Contributors.Verifiers[i].Status == models.SignatureStatusJoined {
			document.Contributors.Verifiers[i].Status = models.SignatureStatusPending
		}
	}

	// Update validators
	for i := range document.Contributors.Validators {
		if document.Contributors.Validators[i].Status == models.SignatureStatusJoined {
			document.Contributors.Validators[i].Status = models.SignatureStatusPending
		}
	}

	// Update document
	update := bson.M{
		"$set": bson.M{
			"contributors": document.Contributors,
			"status":       models.DocumentStatusAuthorReview,
			"updated_at":   now,
		},
	}

	result := s.collection.FindOneAndUpdate(
		ctx,
		bson.M{"_id": id},
		update,
		options.FindOneAndUpdate().SetReturnDocument(options.After),
	)

	var updatedDocument models.Document
	if err := result.Decode(&updatedDocument); err != nil {
		return nil, fmt.Errorf("failed to publish document: %w", err)
	}

	return &updatedDocument, nil
}

// Delete deletes a document
func (s *DocumentService) Delete(ctx context.Context, id primitive.ObjectID) error {
	result, err := s.collection.DeleteOne(ctx, bson.M{"_id": id})
	if err != nil {
		return fmt.Errorf("failed to delete document: %w", err)
	}

	if result.DeletedCount == 0 {
		return errors.New("document not found")
	}

	return nil
}

// Duplicate creates a copy of a document
func (s *DocumentService) Duplicate(ctx context.Context, id primitive.ObjectID, userID primitive.ObjectID) (*models.Document, error) {
	// Get original document
	original, err := s.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Create new document with modified reference
	now := time.Now()
	newDocument := &models.Document{
		ID:            primitive.NewObjectID(),
		Reference:     fmt.Sprintf("%s-COPY", original.Reference),
		Title:         fmt.Sprintf("%s (Copy)", original.Title),
		Version:       "1.0",
		Status:        models.DocumentStatusDraft,
		CreatedBy:     userID,
		Contributors:  original.Contributors,
		Metadata:      original.Metadata,
		ProcessGroups: original.ProcessGroups,
		Annexes:       original.Annexes,
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	_, err = s.collection.InsertOne(ctx, newDocument)
	if err != nil {
		return nil, fmt.Errorf("failed to duplicate document: %w", err)
	}

	return newDocument, nil
}

// GetVersions retrieves all versions of a document
func (s *DocumentService) GetVersions(ctx context.Context, documentID primitive.ObjectID) ([]*models.DocumentVersion, error) {
	findOptions := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})

	cursor, err := s.versionCollection.Find(ctx, bson.M{"document_id": documentID}, findOptions)
	if err != nil {
		return nil, fmt.Errorf("failed to find versions: %w", err)
	}
	defer cursor.Close(ctx)

	versions := make([]*models.DocumentVersion, 0)
	if err = cursor.All(ctx, &versions); err != nil {
		return nil, fmt.Errorf("failed to decode versions: %w", err)
	}

	return versions, nil
}

// Helper functions

// referenceExists checks if a document reference already exists
func (s *DocumentService) referenceExists(ctx context.Context, reference string) (bool, error) {
	count, err := s.collection.CountDocuments(ctx, bson.M{"reference": reference})
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// createVersion creates a version snapshot of a document
func (s *DocumentService) createVersion(ctx context.Context, document *models.Document, userID primitive.ObjectID, changeNote string) error {
	version := &models.DocumentVersion{
		ID:         primitive.NewObjectID(),
		DocumentID: document.ID,
		Version:    document.Version,
		Data:       *document,
		CreatedBy:  userID,
		CreatedAt:  time.Now(),
		ChangeNote: changeNote,
	}

	_, err := s.versionCollection.InsertOne(ctx, version)
	if err != nil {
		return fmt.Errorf("failed to create version: %w", err)
	}

	return nil
}
