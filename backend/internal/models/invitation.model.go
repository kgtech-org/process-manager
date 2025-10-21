package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// InvitationStatus represents the status of an invitation
type InvitationStatus string

const (
	InvitationStatusPending  InvitationStatus = "pending"
	InvitationStatusAccepted InvitationStatus = "accepted"
	InvitationStatusDeclined InvitationStatus = "declined"
	InvitationStatusExpired  InvitationStatus = "expired"
)

// InvitationType represents the type of invitation
type InvitationType string

const (
	InvitationTypeCollaborator InvitationType = "collaborator"
	InvitationTypeReviewer     InvitationType = "reviewer"
)

// Invitation represents an invitation to collaborate on a document
type Invitation struct {
	ID             primitive.ObjectID  `bson:"_id,omitempty" json:"id,omitempty"`
	DocumentID     primitive.ObjectID  `bson:"document_id" json:"documentId"`
	InvitedBy      primitive.ObjectID  `bson:"inviter_id" json:"invitedBy"`
	InvitedEmail   string              `bson:"invitee_email" json:"invitedEmail"`
	InvitedUserID  *primitive.ObjectID `bson:"invited_user_id,omitempty" json:"invitedUserId,omitempty"`
	Token          string              `bson:"token" json:"-"` // Never expose token in JSON
	Type           InvitationType      `bson:"type,omitempty" json:"type,omitempty"` // Deprecated, kept for backwards compatibility
	Team           ContributorTeam     `bson:"team" json:"team"` // authors, verifiers, validators
	Status         InvitationStatus    `bson:"status" json:"status"`
	Message        string              `bson:"message,omitempty" json:"message,omitempty"`
	ExpiresAt      time.Time           `bson:"expires_at" json:"expiresAt"`
	SentAt         time.Time           `bson:"sent_at" json:"sentAt"`
	AcceptedAt     *time.Time          `bson:"accepted_at,omitempty" json:"acceptedAt,omitempty"`
	DeclinedAt     *time.Time          `bson:"declined_at,omitempty" json:"declinedAt,omitempty"`
	DeclineReason  string              `bson:"decline_reason,omitempty" json:"declineReason,omitempty"`
	CreatedAt      time.Time           `bson:"created_at" json:"createdAt"`
	UpdatedAt      time.Time           `bson:"updated_at" json:"updatedAt"`
}

// InvitationResponse represents the API response for an invitation
type InvitationResponse struct {
	ID            string             `json:"id"`
	DocumentID    string             `json:"documentId"`
	DocumentTitle string             `json:"documentTitle,omitempty"`
	InvitedBy     string             `json:"invitedBy"`
	InvitedByName string             `json:"invitedByName,omitempty"`
	InvitedEmail  string             `json:"invitedEmail"`
	InvitedUserID *string            `json:"invitedUserId,omitempty"`
	Type          InvitationType     `json:"type,omitempty"` // Deprecated
	Team          ContributorTeam    `json:"team"`
	Status        InvitationStatus   `json:"status"`
	Message       string             `json:"message,omitempty"`
	ExpiresAt     time.Time          `json:"expiresAt"`
	AcceptedAt    *time.Time         `json:"acceptedAt,omitempty"`
	DeclinedAt    *time.Time         `json:"declinedAt,omitempty"`
	DeclineReason string             `json:"declineReason,omitempty"`
	CreatedAt     time.Time          `json:"createdAt"`
	UpdatedAt     time.Time          `json:"updatedAt"`
}

// CreateInvitationRequest represents the request to create an invitation
type CreateInvitationRequest struct {
	DocumentID   string          `json:"documentId" binding:"required"`
	InvitedEmail string          `json:"invitedEmail" binding:"required,email"`
	Team         ContributorTeam `json:"team" binding:"required"`
	Message      string          `json:"message"`
}

// AcceptInvitationRequest represents the request to accept an invitation
type AcceptInvitationRequest struct {
	Token string `json:"token" binding:"required"`
}

// DeclineInvitationRequest represents the request to decline an invitation
type DeclineInvitationRequest struct {
	Token  string `json:"token" binding:"required"`
	Reason string `json:"reason"`
}

// InvitationFilter represents filtering options for invitations
type InvitationFilter struct {
	DocumentID   *string           `json:"documentId"`
	InvitedEmail *string           `json:"invitedEmail"`
	Status       *InvitationStatus `json:"status"`
	Page         int               `json:"page"`
	Limit        int               `json:"limit"`
}

// ToResponse converts an Invitation to InvitationResponse
func (i *Invitation) ToResponse() InvitationResponse {
	response := InvitationResponse{
		ID:            i.ID.Hex(),
		DocumentID:    i.DocumentID.Hex(),
		InvitedBy:     i.InvitedBy.Hex(),
		InvitedEmail:  i.InvitedEmail,
		Type:          i.Type,
		Team:          i.Team,
		Status:        i.Status,
		Message:       i.Message,
		ExpiresAt:     i.ExpiresAt,
		AcceptedAt:    i.AcceptedAt,
		DeclinedAt:    i.DeclinedAt,
		DeclineReason: i.DeclineReason,
		CreatedAt:     i.CreatedAt,
		UpdatedAt:     i.UpdatedAt,
	}

	if i.InvitedUserID != nil {
		userID := i.InvitedUserID.Hex()
		response.InvitedUserID = &userID
	}

	return response
}

// IsExpired checks if the invitation has expired
func (i *Invitation) IsExpired() bool {
	return time.Now().After(i.ExpiresAt)
}

// CanAccept checks if the invitation can be accepted
func (i *Invitation) CanAccept() bool {
	return i.Status == InvitationStatusPending && !i.IsExpired()
}

// CanDecline checks if the invitation can be declined
func (i *Invitation) CanDecline() bool {
	return i.Status == InvitationStatusPending && !i.IsExpired()
}

// IsValidType checks if the invitation type is valid
func IsValidInvitationType(invType InvitationType) bool {
	switch invType {
	case InvitationTypeCollaborator, InvitationTypeReviewer:
		return true
	default:
		return false
	}
}

// IsValidTeam checks if the team is valid
func IsValidTeam(team ContributorTeam) bool {
	switch team {
	case ContributorTeamAuthors, ContributorTeamVerifiers, ContributorTeamValidators:
		return true
	default:
		return false
	}
}

// BeforeCreate sets timestamps before creating an invitation
func (i *Invitation) BeforeCreate() {
	now := time.Now()
	i.CreatedAt = now
	i.UpdatedAt = now
	i.SentAt = now
	i.Status = InvitationStatusPending

	// Set expiration to 7 days from now
	if i.ExpiresAt.IsZero() {
		i.ExpiresAt = now.Add(7 * 24 * time.Hour)
	}
}

// BeforeUpdate sets the updated timestamp
func (i *Invitation) BeforeUpdate() {
	i.UpdatedAt = time.Now()
}
