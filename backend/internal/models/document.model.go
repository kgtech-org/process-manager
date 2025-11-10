package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// DocumentStatus represents the status of a document
type DocumentStatus string

const (
	DocumentStatusDraft          DocumentStatus = "draft"
	DocumentStatusAuthorReview   DocumentStatus = "author_review"
	DocumentStatusAuthorSigned   DocumentStatus = "author_signed"
	DocumentStatusVerifierReview DocumentStatus = "verifier_review"
	DocumentStatusVerifierSigned DocumentStatus = "verifier_signed"
	DocumentStatusValidatorReview DocumentStatus = "validator_review"
	DocumentStatusApproved       DocumentStatus = "approved"
	DocumentStatusArchived       DocumentStatus = "archived"
)

// ContributorTeam represents the team a contributor belongs to
type ContributorTeam string

const (
	ContributorTeamAuthors    ContributorTeam = "authors"
	ContributorTeamVerifiers  ContributorTeam = "verifiers"
	ContributorTeamValidators ContributorTeam = "validators"
)

// SignatureStatus represents the signature status of a contributor
type SignatureStatus string

const (
	SignatureStatusJoined   SignatureStatus = "joined"   // Contributor has joined but document not published yet
	SignatureStatusPending  SignatureStatus = "pending"  // Document published, waiting for signature
	SignatureStatusSigned   SignatureStatus = "signed"   // Contributor has signed
	SignatureStatusRejected SignatureStatus = "rejected" // Contributor rejected
)

// AnnexType represents the type of annex
type AnnexType string

const (
	AnnexTypeDiagram AnnexType = "diagram"
	AnnexTypeTable   AnnexType = "table"
	AnnexTypeText    AnnexType = "text"
	AnnexTypeFile    AnnexType = "file"
)

// Contributor represents a document contributor
type Contributor struct {
	UserID        primitive.ObjectID `json:"userId" bson:"user_id"`
	Name          string             `json:"name" bson:"name"`
	Title         string             `json:"title" bson:"title"`
	Department    string             `json:"department" bson:"department"`
	Team          ContributorTeam    `json:"team" bson:"team"`
	Status        SignatureStatus    `json:"status" bson:"status"`
	SignatureDate *time.Time         `json:"signatureDate,omitempty" bson:"signature_date,omitempty"`
	InvitedAt     time.Time          `json:"invitedAt" bson:"invited_at"`
}

// Contributors represents all contributors of a document
type Contributors struct {
	Authors    []Contributor `json:"authors" bson:"authors"`
	Verifiers  []Contributor `json:"verifiers" bson:"verifiers"`
	Validators []Contributor `json:"validators" bson:"validators"`
}

// ProcessDescription represents a single description within a process step
type ProcessDescription struct {
	Title         string   `json:"title" bson:"title"`
	Instructions  []string `json:"instructions" bson:"instructions"`
	Order         int      `json:"order" bson:"order"`
	OutputIndex   int      `json:"outputIndex" bson:"output_index"`
	DurationIndex int      `json:"durationIndex" bson:"duration_index"`
}

// ProcessStep represents a step within a process group
type ProcessStep struct {
	ID           string               `json:"id" bson:"id"`
	Title        string               `json:"title" bson:"title"`
	Order        int                  `json:"order" bson:"order"`
	Outputs      []string             `json:"outputs" bson:"outputs"`
	Durations    []string             `json:"durations" bson:"durations"`
	Responsible  string               `json:"responsible" bson:"responsible"`
	Descriptions []ProcessDescription `json:"descriptions" bson:"descriptions"`
}

// ProcessGroup represents a major group of process steps
type ProcessGroup struct {
	ID           string        `json:"id" bson:"id"`
	Title        string        `json:"title" bson:"title"`
	Order        int           `json:"order" bson:"order"`
	ProcessSteps []ProcessStep `json:"processSteps" bson:"process_steps"`
}

// FileAttachment represents an attached file
type FileAttachment struct {
	ID              primitive.ObjectID `json:"id" bson:"_id"`
	FileName        string             `json:"fileName" bson:"file_name"`
	OriginalName    string             `json:"originalName" bson:"original_name"`
	ContentType     string             `json:"contentType" bson:"content_type"`
	FileSize        int64              `json:"fileSize" bson:"file_size"`
	MinioObjectName string             `json:"minioObjectName" bson:"minio_object_name"`
	UploadedBy      primitive.ObjectID `json:"uploadedBy" bson:"uploaded_by"`
	UploadedAt      time.Time          `json:"uploadedAt" bson:"uploaded_at"`
}

// Annex represents an annex section
type Annex struct {
	ID      string                 `json:"id" bson:"id"`
	Title   string                 `json:"title" bson:"title"`
	Type    AnnexType              `json:"type" bson:"type"`
	Content map[string]interface{} `json:"content" bson:"content"`
	Order   int                    `json:"order" bson:"order"`
	Files   []FileAttachment       `json:"files,omitempty" bson:"files,omitempty"`
}

// ChangeHistoryEntry represents a single change in the document history
type ChangeHistoryEntry struct {
	Version     string    `json:"version" bson:"version"`
	Date        time.Time `json:"date" bson:"date"`
	Author      string    `json:"author" bson:"author"`
	Description string    `json:"description" bson:"description"`
}

// DocumentMetadata represents the metadata section of a document
type DocumentMetadata struct {
	Objectives        []string             `json:"objectives" bson:"objectives"`
	ImplicatedActors  []string             `json:"implicatedActors" bson:"implicated_actors"`
	ManagementRules   []string             `json:"managementRules" bson:"management_rules"`
	Terminology       []string             `json:"terminology" bson:"terminology"`
	ChangeHistory     []ChangeHistoryEntry `json:"changeHistory" bson:"change_history"`
}

// Document represents a process document (Micro-processus)
type Document struct {
	ID               primitive.ObjectID  `json:"id" bson:"_id,omitempty"`
	MacroID          *primitive.ObjectID `json:"macroId,omitempty" bson:"macro_id,omitempty"`       // Link to Macro (M1, M2, etc.)
	ProcessCode      string              `json:"processCode,omitempty" bson:"process_code,omitempty"` // New format: M1_P1, M2_P1, etc.
	Reference        string              `json:"reference" bson:"reference"`                          // Legacy reference
	Title            string              `json:"title" bson:"title"`
	ShortDescription string              `json:"shortDescription,omitempty" bson:"short_description,omitempty"` // Brief description
	Description      string              `json:"description,omitempty" bson:"description,omitempty"`           // Detailed description
	IsActive         bool                `json:"isActive" bson:"is_active"`                                   // Active status
	Version          string              `json:"version" bson:"version"`
	Status           DocumentStatus      `json:"status" bson:"status"`
	CreatedBy        primitive.ObjectID  `json:"createdBy" bson:"created_by"`
	Contributors     Contributors        `json:"contributors" bson:"contributors"`
	Metadata         DocumentMetadata    `json:"metadata" bson:"metadata"`
	ProcessGroups    []ProcessGroup      `json:"processGroups" bson:"process_groups"`
	Annexes          []Annex             `json:"annexes" bson:"annexes"`
	PdfUrl           string              `json:"pdfUrl,omitempty" bson:"pdf_url,omitempty"`
	CreatedAt        time.Time           `json:"createdAt" bson:"created_at"`
	UpdatedAt        time.Time           `json:"updatedAt" bson:"updated_at"`
	ApprovedAt       *time.Time          `json:"approvedAt,omitempty" bson:"approved_at,omitempty"`
}

// DocumentResponse represents the API response for a document
type DocumentResponse struct {
	ID               string           `json:"id"`
	MacroID          string           `json:"macroId,omitempty"`
	ProcessCode      string           `json:"processCode,omitempty"`
	Reference        string           `json:"reference"`
	Title            string           `json:"title"`
	ShortDescription string           `json:"shortDescription,omitempty"`
	Description      string           `json:"description,omitempty"`
	IsActive         bool             `json:"isActive"`
	Version          string           `json:"version"`
	Status           DocumentStatus   `json:"status"`
	CreatedBy        string           `json:"createdBy"`
	Contributors     Contributors     `json:"contributors"`
	Metadata         DocumentMetadata `json:"metadata"`
	ProcessGroups    []ProcessGroup   `json:"processGroups"`
	Annexes          []Annex          `json:"annexes"`
	PdfUrl           string           `json:"pdfUrl,omitempty"`
	CreatedAt        time.Time        `json:"createdAt"`
	UpdatedAt        time.Time        `json:"updatedAt"`
	ApprovedAt       *time.Time       `json:"approvedAt,omitempty"`
}

// ToResponse converts a Document to DocumentResponse
func (d *Document) ToResponse() DocumentResponse {
	resp := DocumentResponse{
		ID:               d.ID.Hex(),
		ProcessCode:      d.ProcessCode,
		Reference:        d.Reference,
		Title:            d.Title,
		ShortDescription: d.ShortDescription,
		Description:      d.Description,
		IsActive:         d.IsActive,
		Version:          d.Version,
		Status:           d.Status,
		CreatedBy:        d.CreatedBy.Hex(),
		Contributors:     d.Contributors,
		Metadata:         d.Metadata,
		ProcessGroups:    d.ProcessGroups,
		Annexes:          d.Annexes,
		PdfUrl:           d.PdfUrl,
		CreatedAt:        d.CreatedAt,
		UpdatedAt:        d.UpdatedAt,
		ApprovedAt:       d.ApprovedAt,
	}

	// Include MacroID if present
	if d.MacroID != nil {
		resp.MacroID = d.MacroID.Hex()
	}

	return resp
}

// CreateDocumentRequest represents the request to create a document
type CreateDocumentRequest struct {
	MacroID       *string          `json:"macroId"`        // Optional: Link to macro
	ProcessCode   string           `json:"processCode"`    // Optional: New format M1_P1, M2_P1
	Reference     string           `json:"reference" binding:"required"`
	Title         string           `json:"title" binding:"required"`
	Version       string           `json:"version" binding:"required"`
	Contributors  Contributors     `json:"contributors"`
	Metadata      DocumentMetadata `json:"metadata"`
	ProcessGroups []ProcessGroup   `json:"processGroups"`
	Annexes       []Annex          `json:"annexes"`
}

// UpdateDocumentRequest represents the request to update a document
type UpdateDocumentRequest struct {
	Title         *string           `json:"title"`
	Version       *string           `json:"version"`
	Status        *DocumentStatus   `json:"status"`
	Contributors  *Contributors     `json:"contributors"`
	Metadata      *DocumentMetadata `json:"metadata"`
	ProcessGroups *[]ProcessGroup   `json:"processGroups"`
	Annexes       *[]Annex          `json:"annexes"`
	IsAutosave    *bool             `json:"isAutosave"` // Skip activity logging for autosave operations
}

// DocumentFilter represents filtering options for documents
type DocumentFilter struct {
	Status    *DocumentStatus `json:"status"`
	CreatedBy *string         `json:"createdBy"`
	Search    *string         `json:"search"`
	Page      int             `json:"page"`
	Limit     int             `json:"limit"`
}

// UpdateMetadataRequest represents the request to update document metadata
type UpdateMetadataRequest struct {
	Objectives       *[]string `json:"objectives"`
	ImplicatedActors *[]string `json:"implicatedActors"`
	ManagementRules  *[]string `json:"managementRules"`
	Terminology      *[]string `json:"terminology"`
}

// CreateAnnexRequest represents the request to create an annex
type CreateAnnexRequest struct {
	Title   string                 `json:"title" binding:"required"`
	Type    AnnexType              `json:"type" binding:"required"`
	Content map[string]interface{} `json:"content"`
}

// UpdateAnnexRequest represents the request to update an annex
type UpdateAnnexRequest struct {
	Title   *string                 `json:"title"`
	Type    *AnnexType              `json:"type"`
	Content *map[string]interface{} `json:"content"`
	Order   *int                    `json:"order"`
}
