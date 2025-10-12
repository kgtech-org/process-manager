package services

import (
	"bytes"
	"crypto/tls"
	"fmt"
	"html/template"
	"net/smtp"
	"os"
	"strconv"
	"strings"
)

type EmailService struct {
	smtpHost     string
	smtpPort     int
	smtpUsername string
	smtpPassword string
	fromEmail    string
	fromName     string
	appURL       string
}

type EmailTemplate struct {
	Subject  string
	HTMLBody string
	TextBody string
}

type EmailData struct {
	UserName        string
	UserEmail       string
	AppName         string
	AppURL          string
	VerificationURL string
	ResetURL        string
	Token           string
	OTP             string
	OTPExpiry       string
	RejectionReason string
	SupportEmail    string
	CompanyName     string
	UnsubscribeURL  string
	// Invitation-specific fields
	InviterName     string
	DocumentTitle   string
	DocumentRef     string
	InvitationURL   string
	RoleName        string
	TeamName        string
}

func NewEmailService() *EmailService {
	smtpHost := os.Getenv("SMTP_HOST")
	if smtpHost == "" {
		smtpHost = "smtp.hostinger.com"
	}

	smtpPortStr := os.Getenv("SMTP_PORT")
	smtpPort := 465
	if smtpPortStr != "" {
		if port, err := strconv.Atoi(smtpPortStr); err == nil {
			smtpPort = port
		}
	}

	smtpUsername := os.Getenv("SMTP_USERNAME")
	smtpPassword := os.Getenv("SMTP_PASSWORD")

	fromEmail := os.Getenv("FROM_EMAIL")
	if fromEmail == "" {
		fromEmail = "noreply@process-manager.com"
	}

	fromName := os.Getenv("FROM_NAME")
	if fromName == "" {
		fromName = "Process Manager"
	}

	appURL := os.Getenv("APP_URL")
	if appURL == "" {
		appURL = "http://localhost:3000"
	}

	return &EmailService{
		smtpHost:     smtpHost,
		smtpPort:     smtpPort,
		smtpUsername: smtpUsername,
		smtpPassword: smtpPassword,
		fromEmail:    fromEmail,
		fromName:     fromName,
		appURL:       appURL,
	}
}

func (e *EmailService) SendWelcomeEmail(userEmail, userName string) error {
	data := EmailData{
		UserName:     userName,
		UserEmail:    userEmail,
		AppName:      "Process Manager",
		AppURL:       e.appURL,
		SupportEmail: "support@process-manager.com",
		CompanyName:  "Process Manager Team",
	}

	template := e.getWelcomeTemplate()
	return e.sendEmail(userEmail, userName, template, data)
}

func (e *EmailService) SendVerificationEmail(userEmail, userName, token string) error {
	verificationURL := fmt.Sprintf("%s/verify-email?token=%s", e.appURL, token)

	data := EmailData{
		UserName:        userName,
		UserEmail:       userEmail,
		AppName:         "Process Manager",
		AppURL:          e.appURL,
		VerificationURL: verificationURL,
		Token:           token,
		SupportEmail:    "support@process-manager.com",
		CompanyName:     "Process Manager Team",
	}

	template := e.getVerificationTemplate()
	return e.sendEmail(userEmail, userName, template, data)
}

// SendOTPEmail sends an OTP code via email
func (e *EmailService) SendOTPEmail(userEmail, userName, otp string) error {
	data := EmailData{
		UserName:     userName,
		UserEmail:    userEmail,
		AppName:      "Process Manager",
		AppURL:       e.appURL,
		OTP:          otp,
		OTPExpiry:    "5 minutes",
		SupportEmail: "support@process-manager.com",
		CompanyName:  "Process Manager Team",
	}

	template := e.getOTPTemplate()
	return e.sendEmail(userEmail, userName, template, data)
}

// SendRegistrationOTPEmail sends OTP email specifically for registration
func (e *EmailService) SendRegistrationOTPEmail(userEmail, otp string) error {
	data := EmailData{
		UserEmail:    userEmail,
		AppName:      "Process Manager",
		AppURL:       e.appURL,
		OTP:          otp,
		OTPExpiry:    "5 minutes",
		SupportEmail: "support@process-manager.com",
		CompanyName:  "Process Manager Team",
	}

	template := e.getRegistrationOTPTemplate()
	return e.sendEmail(userEmail, "", template, data)
}

// SendRegistrationPendingEmail sends confirmation that registration is pending admin approval
func (e *EmailService) SendRegistrationPendingEmail(userEmail, userName string) error {
	data := EmailData{
		UserName:     userName,
		UserEmail:    userEmail,
		AppName:      "Process Manager",
		AppURL:       e.appURL,
		SupportEmail: "support@process-manager.com",
		CompanyName:  "Process Manager Team",
	}

	template := e.getRegistrationPendingTemplate()
	return e.sendEmail(userEmail, userName, template, data)
}

// SendAccountApprovedEmail sends confirmation that account has been approved
func (e *EmailService) SendAccountApprovedEmail(userEmail, userName string) error {
	data := EmailData{
		UserName:     userName,
		UserEmail:    userEmail,
		AppName:      "Process Manager",
		AppURL:       e.appURL,
		SupportEmail: "support@process-manager.com",
		CompanyName:  "Process Manager Team",
	}

	template := e.getAccountApprovedTemplate()
	return e.sendEmail(userEmail, userName, template, data)
}

// SendAccountRejectedEmail sends notification that account registration was rejected
func (e *EmailService) SendAccountRejectedEmail(userEmail, userName, reason string) error {
	data := EmailData{
		UserName:        userName,
		UserEmail:       userEmail,
		AppName:         "Process Manager",
		AppURL:          e.appURL,
		RejectionReason: reason,
		SupportEmail:    "support@process-manager.com",
		CompanyName:     "Process Manager Team",
	}

	template := e.getAccountRejectedTemplate()
	return e.sendEmail(userEmail, userName, template, data)
}

// SendInvitationEmail sends a collaboration invitation email
func (e *EmailService) SendInvitationEmail(userEmail, userName, inviterName, documentTitle, documentRef, teamName, invitationToken string) error {
	fmt.Printf("📧 [EMAIL SERVICE] SendInvitationEmail called:\n")
	fmt.Printf("   - User Email: %s\n", userEmail)
	fmt.Printf("   - User Name: %s\n", userName)
	fmt.Printf("   - Inviter: %s\n", inviterName)
	fmt.Printf("   - Document: %s (%s)\n", documentTitle, documentRef)
	fmt.Printf("   - Team: %s\n", teamName)
	fmt.Printf("   - App URL: %s\n", e.appURL)

	invitationURL := fmt.Sprintf("%s/invitations/accept?token=%s", e.appURL, invitationToken)
	fmt.Printf("   - Invitation URL: %s\n", invitationURL)

	data := EmailData{
		UserName:      userName,
		UserEmail:     userEmail,
		AppName:       "Process Manager",
		AppURL:        e.appURL,
		InviterName:   inviterName,
		DocumentTitle: documentTitle,
		DocumentRef:   documentRef,
		InvitationURL: invitationURL,
		TeamName:      teamName,
		Token:         invitationToken,
		SupportEmail:  "support@process-manager.com",
		CompanyName:   "Process Manager Team",
	}

	template := e.getInvitationTemplate()
	fmt.Printf("   - Template Subject: %s\n", template.Subject)

	err := e.sendEmail(userEmail, userName, template, data)
	if err != nil {
		fmt.Printf("❌ [EMAIL SERVICE] sendEmail returned error: %v\n", err)
	} else {
		fmt.Printf("✅ [EMAIL SERVICE] sendEmail completed successfully\n")
	}
	return err
}

func (e *EmailService) sendEmail(toEmail, toName string, emailTemplate EmailTemplate, data EmailData) error {
	fmt.Printf("📧 [SEND EMAIL] Starting email send process\n")
	fmt.Printf("   - To: %s (%s)\n", toEmail, toName)
	fmt.Printf("   - From: %s (%s)\n", e.fromEmail, e.fromName)
	fmt.Printf("   - Subject: %s\n", emailTemplate.Subject)
	fmt.Printf("   - SMTP Host: %s:%d\n", e.smtpHost, e.smtpPort)
	fmt.Printf("   - SMTP Username: %s\n", e.smtpUsername)
	fmt.Printf("   - SMTP Configured: %v\n", e.smtpUsername != "" && e.smtpPassword != "")

	// Skip sending email if SMTP is not configured
	if e.smtpUsername == "" || e.smtpPassword == "" {
		fmt.Printf("⚠️ Email not sent (SMTP not configured): %s to %s\n", emailTemplate.Subject, toEmail)
		return nil
	}

	// Check if From email domain matches SMTP domain
	if e.fromEmail != "" && e.smtpUsername != "" {
		// Extract email from possible "Name <email>" format
		fromEmailAddr := e.fromEmail
		if strings.Contains(fromEmailAddr, "<") && strings.Contains(fromEmailAddr, ">") {
			start := strings.Index(fromEmailAddr, "<")
			end := strings.Index(fromEmailAddr, ">")
			fromEmailAddr = fromEmailAddr[start+1 : end]
		}

		// Extract domains
		fromAtIndex := strings.LastIndex(fromEmailAddr, "@")
		smtpAtIndex := strings.LastIndex(e.smtpUsername, "@")

		if fromAtIndex > 0 && smtpAtIndex > 0 {
			fromDomain := fromEmailAddr[fromAtIndex+1:]
			smtpDomain := e.smtpUsername[smtpAtIndex+1:]

			fmt.Printf("   - From Email Domain: %s\n", fromDomain)
			fmt.Printf("   - SMTP Domain: %s\n", smtpDomain)

			if fromDomain != smtpDomain {
				fmt.Printf("⚠️  WARNING: FROM_EMAIL domain (%s) doesn't match SMTP_USERNAME domain (%s)\n", fromDomain, smtpDomain)
				fmt.Printf("   This may cause emails to be rejected or marked as spam by Gmail/Outlook\n")
				fmt.Printf("   Recommendation: Set FROM_EMAIL=admin@%s (without angle brackets)\n", smtpDomain)
			}
		}
	}

	fmt.Printf("   - Parsing templates...\n")
	// Parse and execute template
	htmlTemplate, err := template.New("html").Parse(emailTemplate.HTMLBody)
	if err != nil {
		fmt.Printf("❌ [SEND EMAIL] Failed to parse HTML template: %v\n", err)
		return fmt.Errorf("failed to parse HTML template: %w", err)
	}

	textTemplate, err := template.New("text").Parse(emailTemplate.TextBody)
	if err != nil {
		return fmt.Errorf("failed to parse text template: %w", err)
	}

	var htmlBuffer, textBuffer bytes.Buffer

	if err := htmlTemplate.Execute(&htmlBuffer, data); err != nil {
		return fmt.Errorf("failed to execute HTML template: %w", err)
	}

	if err := textTemplate.Execute(&textBuffer, data); err != nil {
		return fmt.Errorf("failed to execute text template: %w", err)
	}

	// Prepare email message
	message := e.buildMimeMessage(toEmail, toName, emailTemplate.Subject, htmlBuffer.String(), textBuffer.String())

	// Send email
	auth := smtp.PlainAuth("", e.smtpUsername, e.smtpPassword, e.smtpHost)

	// Configure TLS
	tlsConfig := &tls.Config{
		InsecureSkipVerify: false,
		ServerName:         e.smtpHost,
	}

	address := fmt.Sprintf("%s:%d", e.smtpHost, e.smtpPort)

	// Connect to server
	conn, err := tls.Dial("tcp", address, tlsConfig)
	if err != nil {
		return fmt.Errorf("failed to connect to SMTP server: %w", err)
	}

	client, err := smtp.NewClient(conn, e.smtpHost)
	if err != nil {
		return fmt.Errorf("failed to create SMTP client: %w", err)
	}
	defer client.Quit()

	// Authenticate
	if err := client.Auth(auth); err != nil {
		return fmt.Errorf("failed to authenticate with SMTP server: %w", err)
	}

	// Set sender and recipient
	if err := client.Mail(e.fromEmail); err != nil {
		return fmt.Errorf("failed to set sender: %w", err)
	}

	if err := client.Rcpt(toEmail); err != nil {
		return fmt.Errorf("failed to set recipient: %w", err)
	}

	// Send message
	writer, err := client.Data()
	if err != nil {
		return fmt.Errorf("failed to get data writer: %w", err)
	}

	_, err = writer.Write([]byte(message))
	if err != nil {
		return fmt.Errorf("failed to write message: %w", err)
	}

	err = writer.Close()
	if err != nil {
		return fmt.Errorf("failed to close writer: %w", err)
	}

	fmt.Printf("✅ Email sent successfully: %s to %s\n", emailTemplate.Subject, toEmail)
	return nil
}

func (e *EmailService) buildMimeMessage(toEmail, toName, subject, htmlBody, textBody string) string {
	var message strings.Builder

	// Headers
	message.WriteString(fmt.Sprintf("From: %s <%s>\r\n", e.fromName, e.fromEmail))
	message.WriteString(fmt.Sprintf("To: %s <%s>\r\n", toName, toEmail))
	message.WriteString(fmt.Sprintf("Subject: %s\r\n", subject))
	message.WriteString("MIME-Version: 1.0\r\n")
	message.WriteString("Content-Type: multipart/alternative; boundary=\"boundary123\"\r\n")
	message.WriteString("\r\n")

	// Text part
	message.WriteString("--boundary123\r\n")
	message.WriteString("Content-Type: text/plain; charset=\"UTF-8\"\r\n")
	message.WriteString("Content-Transfer-Encoding: 7bit\r\n")
	message.WriteString("\r\n")
	message.WriteString(textBody)
	message.WriteString("\r\n")

	// HTML part
	message.WriteString("--boundary123\r\n")
	message.WriteString("Content-Type: text/html; charset=\"UTF-8\"\r\n")
	message.WriteString("Content-Transfer-Encoding: 7bit\r\n")
	message.WriteString("\r\n")
	message.WriteString(htmlBody)
	message.WriteString("\r\n")

	// End boundary
	message.WriteString("--boundary123--\r\n")

	return message.String()
}

func (e *EmailService) getRegistrationPendingTemplate() EmailTemplate {
	return EmailTemplate{
		Subject: "Registration Received - Awaiting Approval",
		HTMLBody: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Registration Received - {{.AppName}}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f4f4f4; padding: 20px; border-radius: 10px;">
        <h1 style="color: #f39c12; text-align: center;">Registration Received</h1>
        
        <p>Dear {{.UserName}},</p>
        
        <p>Thank you for registering with {{.AppName}}! We have received your registration request and it is currently being reviewed by our administrators.</p>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 12px; border-radius: 4px; margin: 20px 0;">
            <strong>⏳ Status:</strong> Your account is pending approval
        </div>
        
        <p><strong>What happens next?</strong></p>
        <ul>
            <li>Our administrators will review your registration details</li>
            <li>You will receive an email notification once your account is approved or if additional information is needed</li>
            <li>Once approved, you can start using {{.AppName}} with OTP-based login</li>
        </ul>
        
        <p><strong>Registration Details:</strong></p>
        <ul>
            <li>Email: {{.UserEmail}}</li>
            <li>Name: {{.UserName}}</li>
            <li>Submitted: Just now</li>
        </ul>
        
        <p>If you have any questions while waiting for approval, please contact our support team at <a href="mailto:{{.SupportEmail}}">{{.SupportEmail}}</a>.</p>
        
        <p>Best regards,<br>{{.CompanyName}}</p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        <p style="font-size: 12px; color: #666; text-align: center;">
            This email was sent to {{.UserEmail}}. If you didn't register for {{.AppName}}, please ignore this email.
        </p>
    </div>
</body>
</html>`,
		TextBody: `Registration Received - {{.AppName}}

Dear {{.UserName}},

Thank you for registering with {{.AppName}}! We have received your registration request and it is currently being reviewed by our administrators.

⏳ Status: Your account is pending approval

What happens next?
• Our administrators will review your registration details
• You will receive an email notification once your account is approved or if additional information is needed
• Once approved, you can start using {{.AppName}} with OTP-based login

Registration Details:
• Email: {{.UserEmail}}
• Name: {{.UserName}}
• Submitted: Just now

If you have any questions while waiting for approval, please contact our support team at {{.SupportEmail}}.

Best regards,
{{.CompanyName}}

---
This email was sent to {{.UserEmail}}. If you didn't register for {{.AppName}}, please ignore this email.`,
	}
}

func (e *EmailService) getAccountApprovedTemplate() EmailTemplate {
	return EmailTemplate{
		Subject: "Account Approved - Welcome to Process Manager!",
		HTMLBody: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Account Approved - {{.AppName}}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f4f4f4; padding: 20px; border-radius: 10px;">
        <h1 style="color: #27ae60; text-align: center;">🎉 Account Approved!</h1>
        
        <p>Dear {{.UserName}},</p>
        
        <p>Great news! Your {{.AppName}} account has been approved by our administrators. You can now access the platform and start managing telecommunications processes.</p>
        
        <div style="background-color: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 12px; border-radius: 4px; margin: 20px 0;">
            <strong>✅ Status:</strong> Your account is now active and ready to use!
        </div>
        
        <p><strong>Getting Started:</strong></p>
        <ul>
            <li>Visit the login page and enter your email address</li>
            <li>You'll receive a secure OTP code via email</li>
            <li>Enter the OTP to access your account</li>
            <li>Explore the platform and start creating processes</li>
        </ul>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{.AppURL}}/login" style="background-color: #27ae60; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Access Your Account</a>
        </div>
        
        <p><strong>What you can do with {{.AppName}}:</strong></p>
        <ul>
            <li>Create and manage digital processes collaboratively</li>
            <li>Handle multi-step form workflows</li>
            <li>Generate digital signatures and PDF exports</li>
            <li>Track monthly performance through incident reports</li>
        </ul>
        
        <p>If you need any assistance getting started, our support team is here to help at <a href="mailto:{{.SupportEmail}}">{{.SupportEmail}}</a>.</p>
        
        <p>Welcome aboard!<br>{{.CompanyName}}</p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        <p style="font-size: 12px; color: #666; text-align: center;">
            This email was sent to {{.UserEmail}}. For support, contact us at <a href="mailto:{{.SupportEmail}}">{{.SupportEmail}}</a>.
        </p>
    </div>
</body>
</html>`,
		TextBody: `Account Approved - {{.AppName}}

Dear {{.UserName}},

Great news! Your {{.AppName}} account has been approved by our administrators. You can now access the platform and start managing telecommunications processes.

✅ Status: Your account is now active and ready to use!

Getting Started:
• Visit the login page and enter your email address
• You'll receive a secure OTP code via email
• Enter the OTP to access your account
• Explore the platform and start creating processes

Access your account: {{.AppURL}}/login

What you can do with {{.AppName}}:
• Create and manage digital processes collaboratively
• Handle multi-step form workflows
• Generate digital signatures and PDF exports
• Track monthly performance through incident reports

If you need any assistance getting started, our support team is here to help at {{.SupportEmail}}.

Welcome aboard!
{{.CompanyName}}

---
This email was sent to {{.UserEmail}}. For support, contact us at {{.SupportEmail}}.`,
	}
}

func (e *EmailService) getAccountRejectedTemplate() EmailTemplate {
	return EmailTemplate{
		Subject: "Registration Update - Process Manager",
		HTMLBody: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Registration Update - {{.AppName}}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f4f4f4; padding: 20px; border-radius: 10px;">
        <h1 style="color: #e74c3c; text-align: center;">Registration Update</h1>
        
        <p>Dear {{.UserName}},</p>
        
        <p>Thank you for your interest in {{.AppName}}. After reviewing your registration, we are unable to approve your account at this time.</p>
        
        <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 12px; border-radius: 4px; margin: 20px 0;">
            <strong>❌ Status:</strong> Registration not approved
        </div>
        
        {{if .RejectionReason}}
        <p><strong>Reason:</strong></p>
        <p style="background-color: #f8f9fa; padding: 10px; border-left: 4px solid #e74c3c; margin: 15px 0;">{{.RejectionReason}}</p>
        {{end}}
        
        <p><strong>Next Steps:</strong></p>
        <ul>
            <li>If you believe this decision was made in error, please contact our support team</li>
            <li>You may reapply in the future if your circumstances change</li>
            <li>Our support team can provide guidance on meeting approval requirements</li>
        </ul>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="mailto:{{.SupportEmail}}" style="background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Contact Support</a>
        </div>
        
        <p>We appreciate your understanding and interest in {{.AppName}}.</p>
        
        <p>Best regards,<br>{{.CompanyName}}</p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        <p style="font-size: 12px; color: #666; text-align: center;">
            This email was sent to {{.UserEmail}}. For support, contact us at <a href="mailto:{{.SupportEmail}}">{{.SupportEmail}}</a>.
        </p>
    </div>
</body>
</html>`,
		TextBody: `Registration Update - {{.AppName}}

Dear {{.UserName}},

Thank you for your interest in {{.AppName}}. After reviewing your registration, we are unable to approve your account at this time.

❌ Status: Registration not approved

{{if .RejectionReason}}Reason: {{.RejectionReason}}{{end}}

Next Steps:
• If you believe this decision was made in error, please contact our support team
• You may reapply in the future if your circumstances change
• Our support team can provide guidance on meeting approval requirements

Contact Support: {{.SupportEmail}}

We appreciate your understanding and interest in {{.AppName}}.

Best regards,
{{.CompanyName}}

---
This email was sent to {{.UserEmail}}. For support, contact us at {{.SupportEmail}}.`,
	}
}

func (e *EmailService) getWelcomeTemplate() EmailTemplate {
	return EmailTemplate{
		Subject: "Welcome to Process Manager!",
		HTMLBody: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Welcome to {{.AppName}}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f4f4f4; padding: 20px; border-radius: 10px;">
        <h1 style="color: #2c3e50; text-align: center;">Welcome to {{.AppName}}!</h1>
        
        <p>Dear {{.UserName}},</p>
        
        <p>Welcome to Process Manager! We're excited to have you on board. Our platform helps telecommunications companies digitize and manage their procedural documentation efficiently.</p>
        
        <p>With Process Manager, you can:</p>
        <ul>
            <li>Create and manage digital processes collaboratively</li>
            <li>Handle multi-step form workflows</li>
            <li>Generate digital signatures and PDF exports</li>
            <li>Track monthly performance through incident reports</li>
        </ul>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{.AppURL}}" style="background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Get Started</a>
        </div>
        
        <p>If you have any questions or need assistance, feel free to reach out to our support team at <a href="mailto:{{.SupportEmail}}">{{.SupportEmail}}</a>.</p>
        
        <p>Best regards,<br>{{.CompanyName}}</p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        <p style="font-size: 12px; color: #666; text-align: center;">
            This email was sent to {{.UserEmail}}. If you didn't create an account with us, please ignore this email.
        </p>
    </div>
</body>
</html>`,
		TextBody: `Welcome to {{.AppName}}!

Dear {{.UserName}},

Welcome to Process Manager! We're excited to have you on board. Our platform helps telecommunications companies digitize and manage their procedural documentation efficiently.

With Process Manager, you can:
• Create and manage digital processes collaboratively
• Handle multi-step form workflows
• Generate digital signatures and PDF exports
• Track monthly performance through incident reports

Get started: {{.AppURL}}

If you have any questions or need assistance, feel free to reach out to our support team at {{.SupportEmail}}.

Best regards,
{{.CompanyName}}

---
This email was sent to {{.UserEmail}}. If you didn't create an account with us, please ignore this email.`,
	}
}

func (e *EmailService) getVerificationTemplate() EmailTemplate {
	return EmailTemplate{
		Subject: "Verify Your Email Address",
		HTMLBody: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Verify Your Email - {{.AppName}}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f4f4f4; padding: 20px; border-radius: 10px;">
        <h1 style="color: #2c3e50; text-align: center;">Verify Your Email Address</h1>
        
        <p>Dear {{.UserName}},</p>
        
        <p>Thank you for registering with {{.AppName}}! To complete your registration and secure your account, please verify your email address by clicking the button below.</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{.VerificationURL}}" style="background-color: #27ae60; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email Address</a>
        </div>
        
        <p>If the button above doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-left: 4px solid #27ae60;">{{.VerificationURL}}</p>
        
        <p><strong>Important:</strong> This verification link will expire in 24 hours for security reasons.</p>
        
        <p>If you didn't create an account with {{.AppName}}, please ignore this email.</p>
        
        <p>Best regards,<br>{{.CompanyName}}</p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        <p style="font-size: 12px; color: #666; text-align: center;">
            This email was sent to {{.UserEmail}}. For support, contact us at <a href="mailto:{{.SupportEmail}}">{{.SupportEmail}}</a>.
        </p>
    </div>
</body>
</html>`,
		TextBody: `Verify Your Email Address

Dear {{.UserName}},

Thank you for registering with {{.AppName}}! To complete your registration and secure your account, please verify your email address by visiting this link:

{{.VerificationURL}}

Important: This verification link will expire in 24 hours for security reasons.

If you didn't create an account with {{.AppName}}, please ignore this email.

Best regards,
{{.CompanyName}}

---
This email was sent to {{.UserEmail}}. For support, contact us at {{.SupportEmail}}.`,
	}
}

func (e *EmailService) getOTPTemplate() EmailTemplate {
	return EmailTemplate{
		Subject: "Your Login Code for Process Manager",
		HTMLBody: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Your Login Code - {{.AppName}}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f4f4f4; padding: 20px; border-radius: 10px;">
        <h1 style="color: #2c3e50; text-align: center;">Your Login Code</h1>
        
        <p>Dear {{.UserName}},</p>
        
        <p>You're trying to sign in to your {{.AppName}} account. Please use the verification code below:</p>
        
        <div style="text-align: center; margin: 30px 0; background-color: #ffffff; padding: 20px; border-radius: 8px; border: 2px solid #3498db;">
            <h2 style="color: #2c3e50; font-size: 32px; letter-spacing: 8px; margin: 0; font-family: 'Courier New', monospace;">{{.OTP}}</h2>
        </div>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 12px; border-radius: 4px; margin: 20px 0;">
            <strong>⚠️ Important:</strong> This code will expire in {{.OTPExpiry}} for security reasons.
        </div>
        
        <p><strong>Security Guidelines:</strong></p>
        <ul>
            <li>Never share this code with anyone</li>
            <li>{{.AppName}} will never ask for your code via phone or email</li>
            <li>This code can only be used once</li>
            <li>If you didn't request this code, please ignore this email</li>
        </ul>
        
        <p>If you're having trouble signing in, you can request a new code or contact our support team.</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{.AppURL}}" style="background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Go to {{.AppName}}</a>
        </div>
        
        <p>Best regards,<br>{{.CompanyName}}</p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        <p style="font-size: 12px; color: #666; text-align: center;">
            This email was sent to {{.UserEmail}}. For support, contact us at <a href="mailto:{{.SupportEmail}}">{{.SupportEmail}}</a>.
        </p>
    </div>
</body>
</html>`,
		TextBody: `Your Login Code for {{.AppName}}

Dear {{.UserName}},

You're trying to sign in to your {{.AppName}} account. Please use the verification code below:

**{{.OTP}}**

⚠️ Important: This code will expire in {{.OTPExpiry}} for security reasons.

Security Guidelines:
• Never share this code with anyone
• {{.AppName}} will never ask for your code via phone or email
• This code can only be used once
• If you didn't request this code, please ignore this email

If you're having trouble signing in, you can request a new code or contact our support team.

Go to {{.AppName}}: {{.AppURL}}

Best regards,
{{.CompanyName}}

---
This email was sent to {{.UserEmail}}. For support, contact us at {{.SupportEmail}}.`,
	}
}

// getRegistrationOTPTemplate returns the registration OTP email template
// SendCustomEmail sends a custom email to a user
func (e *EmailService) SendCustomEmail(toEmail, toName, subject, body string) error {
	data := EmailData{
		UserName:     toName,
		UserEmail:    toEmail,
		AppName:      "Process Manager",
		AppURL:       e.appURL,
		SupportEmail: "support@process-manager.com",
		CompanyName:  "Process Manager Team",
	}

	template := e.getCustomEmailTemplate(subject, body)
	return e.sendEmail(toEmail, toName, template, data)
}

// getCustomEmailTemplate creates a template for custom emails
func (e *EmailService) getCustomEmailTemplate(subject, body string) EmailTemplate {
	return EmailTemplate{
		Subject: subject,
		HTMLBody: fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>%s</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f4f4f4; padding: 20px; border-radius: 10px;">
        <h1 style="color: #2c3e50; text-align: center;">{{.AppName}}</h1>

        <p>Dear {{.UserName}},</p>

        %s

        <div style="text-align: center; margin: 30px 0;">
            <a href="{{.AppURL}}" style="background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Go to {{.AppName}}</a>
        </div>

        <p>Best regards,<br>{{.CompanyName}}</p>

        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        <p style="font-size: 12px; color: #666; text-align: center;">
            This email was sent to {{.UserEmail}}. For support, contact us at <a href="mailto:{{.SupportEmail}}">{{.SupportEmail}}</a>.
        </p>
    </div>
</body>
</html>`, subject, body),
		TextBody: fmt.Sprintf(`%s

Dear {{.UserName}},

%s

Go to {{.AppName}}: {{.AppURL}}

Best regards,
{{.CompanyName}}

---
This email was sent to {{.UserEmail}}. For support, contact us at {{.SupportEmail}}.`, subject, body),
	}
}

func (e *EmailService) getRegistrationOTPTemplate() EmailTemplate {
	return EmailTemplate{
		Subject: "Complete Your Registration - Verification Code",
		HTMLBody: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Registration Verification Code</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2c3e50; margin: 0;">{{.AppName}}</h1>
            <h2 style="color: #27ae60; margin: 10px 0;">Complete Your Registration</h2>
        </div>

        <p>Hello,</p>

        <p>Thank you for starting your registration with {{.AppName}}! To complete the process, please use the following verification code:</p>

        <div style="text-align: center; margin: 30px 0;">
            <div style="background-color: #27ae60; color: white; padding: 20px; border-radius: 10px; font-size: 32px; font-weight: bold; letter-spacing: 5px; display: inline-block;">
                {{.OTP}}
            </div>
        </div>

        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 12px; border-radius: 4px; margin: 20px 0;">
            <strong>⚠️ Important:</strong> This verification code will expire in {{.OTPExpiry}} for security reasons.
        </div>

        <p><strong>Next Steps:</strong></p>
        <ol>
            <li>Enter this verification code on the registration page</li>
            <li>Complete your profile information</li>
            <li>Wait for admin approval of your account</li>
        </ol>

        <p><strong>Security Guidelines:</strong></p>
        <ul>
            <li>Never share this code with anyone</li>
            <li>{{.AppName}} will never ask for your code via phone or email</li>
            <li>This code can only be used once</li>
            <li>If you didn't request this registration, please ignore this email</li>
        </ul>

        <p>If you're having trouble with the registration process, please contact our support team.</p>

        <div style="text-align: center; margin: 30px 0;">
            <a href="{{.AppURL}}" style="background-color: #27ae60; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Continue Registration</a>
        </div>

        <p>Best regards,<br>{{.CompanyName}}</p>

        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        <p style="font-size: 12px; color: #666; text-align: center;">
            This email was sent to {{.UserEmail}}. For support, contact us at <a href="mailto:{{.SupportEmail}}">{{.SupportEmail}}</a>.
        </p>
    </div>
</body>
</html>`,
		TextBody: `Complete Your Registration - Verification Code

Hello,

Thank you for starting your registration with {{.AppName}}! To complete the process, please use the following verification code:

VERIFICATION CODE: {{.OTP}}

IMPORTANT: This verification code will expire in {{.OTPExpiry}} for security reasons.

Next Steps:
1. Enter this verification code on the registration page
2. Complete your profile information
3. Wait for admin approval of your account

Security Guidelines:
- Never share this code with anyone
- {{.AppName}} will never ask for your code via phone or email
- This code can only be used once
- If you didn't request this registration, please ignore this email

If you're having trouble with the registration process, please contact our support team.

Continue Registration: {{.AppURL}}

Best regards,
{{.CompanyName}}

---
This email was sent to {{.UserEmail}}. For support, contact us at {{.SupportEmail}}.`,
	}
}

func (e *EmailService) getInvitationTemplate() EmailTemplate {
	return EmailTemplate{
		Subject: "You're invited to collaborate on a document",
		HTMLBody: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Document Collaboration Invitation - {{.AppName}}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f4f4f4; padding: 20px; border-radius: 10px;">
        <h1 style="color: #3498db; text-align: center;">📄 Document Collaboration Invitation</h1>

        <p>Dear {{.UserName}},</p>

        <p><strong>{{.InviterName}}</strong> has invited you to collaborate on a document in {{.AppName}}.</p>

        <div style="background-color: #ffffff; padding: 15px; border-radius: 8px; border-left: 4px solid #3498db; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Document:</strong> {{.DocumentTitle}}</p>
            <p style="margin: 5px 0;"><strong>Reference:</strong> {{.DocumentRef}}</p>
            <p style="margin: 5px 0;"><strong>Role:</strong> {{.TeamName}}</p>
        </div>

        <p><strong>What this means:</strong></p>
        <ul>
            <li>You'll be able to collaborate on the document as part of the {{.TeamName}} team</li>
            <li>You can review, edit, and contribute to the document based on your role</li>
            <li>You'll receive notifications about document updates</li>
        </ul>

        <div style="text-align: center; margin: 30px 0;">
            <a href="{{.InvitationURL}}" style="background-color: #27ae60; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Accept Invitation</a>
        </div>

        <p>If the button above doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-left: 4px solid #27ae60;">{{.InvitationURL}}</p>

        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 12px; border-radius: 4px; margin: 20px 0;">
            <strong>⏳ Note:</strong> This invitation will expire in 7 days for security reasons.
        </div>

        <p>If you don't want to collaborate on this document, you can safely ignore this email.</p>

        <p>If you have any questions, please contact our support team at <a href="mailto:{{.SupportEmail}}">{{.SupportEmail}}</a>.</p>

        <p>Best regards,<br>{{.CompanyName}}</p>

        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        <p style="font-size: 12px; color: #666; text-align: center;">
            This email was sent to {{.UserEmail}}. If you didn't expect this invitation, please contact <a href="mailto:{{.SupportEmail}}">{{.SupportEmail}}</a>.
        </p>
    </div>
</body>
</html>`,
		TextBody: `Document Collaboration Invitation - {{.AppName}}

Dear {{.UserName}},

{{.InviterName}} has invited you to collaborate on a document in {{.AppName}}.

Document Details:
• Document: {{.DocumentTitle}}
• Reference: {{.DocumentRef}}
• Role: {{.TeamName}}

What this means:
• You'll be able to collaborate on the document as part of the {{.TeamName}} team
• You can review, edit, and contribute to the document based on your role
• You'll receive notifications about document updates

Accept Invitation: {{.InvitationURL}}

⏳ Note: This invitation will expire in 7 days for security reasons.

If you don't want to collaborate on this document, you can safely ignore this email.

If you have any questions, please contact our support team at {{.SupportEmail}}.

Best regards,
{{.CompanyName}}

---
This email was sent to {{.UserEmail}}. If you didn't expect this invitation, please contact {{.SupportEmail}}.`,
	}
}
