package models

// ============================================
// Email Domain Models
// ============================================

// EmailTemplate represents an email template
type EmailTemplate struct {
	Subject  string
	HTMLBody string
	TextBody string
}

// EmailData represents data for email templates
type EmailData struct {
	UserName        string
	UserEmail       string
	OTP             string
	Token           string
	ResetLink       string
	VerificationURL string
	AppName         string
	AppURL          string
	SupportEmail    string
	Year            int
	RejectionReason string
}

// EmailConfig represents email service configuration
type EmailConfig struct {
	SMTPHost     string
	SMTPPort     int
	SMTPUser     string
	SMTPPassword string
	FromEmail    string
	FromName     string
	AppURL       string
}
