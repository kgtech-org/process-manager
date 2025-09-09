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
	UserName         string
	UserEmail        string
	AppName          string
	AppURL           string
	VerificationURL  string
	ResetURL         string
	Token            string
	SupportEmail     string
	CompanyName      string
	UnsubscribeURL   string
}

func NewEmailService() *EmailService {
	smtpHost := os.Getenv("SMTP_HOST")
	if smtpHost == "" {
		smtpHost = "localhost"
	}

	smtpPortStr := os.Getenv("SMTP_PORT")
	smtpPort := 587
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

func (e *EmailService) SendPasswordResetEmail(userEmail, userName, token string) error {
	resetURL := fmt.Sprintf("%s/reset-password?token=%s", e.appURL, token)

	data := EmailData{
		UserName:     userName,
		UserEmail:    userEmail,
		AppName:      "Process Manager",
		AppURL:       e.appURL,
		ResetURL:     resetURL,
		Token:        token,
		SupportEmail: "support@process-manager.com",
		CompanyName:  "Process Manager Team",
	}

	template := e.getPasswordResetTemplate()
	return e.sendEmail(userEmail, userName, template, data)
}

func (e *EmailService) SendPasswordChangedEmail(userEmail, userName string) error {
	data := EmailData{
		UserName:     userName,
		UserEmail:    userEmail,
		AppName:      "Process Manager",
		AppURL:       e.appURL,
		SupportEmail: "support@process-manager.com",
		CompanyName:  "Process Manager Team",
	}

	template := e.getPasswordChangedTemplate()
	return e.sendEmail(userEmail, userName, template, data)
}

func (e *EmailService) sendEmail(toEmail, toName string, emailTemplate EmailTemplate, data EmailData) error {
	// Skip sending email if SMTP is not configured
	if e.smtpUsername == "" || e.smtpPassword == "" {
		fmt.Printf("⚠️ Email not sent (SMTP not configured): %s to %s\n", emailTemplate.Subject, toEmail)
		return nil
	}

	// Parse and execute template
	htmlTemplate, err := template.New("html").Parse(emailTemplate.HTMLBody)
	if err != nil {
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

func (e *EmailService) getPasswordResetTemplate() EmailTemplate {
	return EmailTemplate{
		Subject: "Reset Your Password",
		HTMLBody: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Reset Your Password - {{.AppName}}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f4f4f4; padding: 20px; border-radius: 10px;">
        <h1 style="color: #e74c3c; text-align: center;">Reset Your Password</h1>
        
        <p>Dear {{.UserName}},</p>
        
        <p>We received a request to reset your password for your {{.AppName}} account. If you didn't request this, you can safely ignore this email.</p>
        
        <p>To reset your password, click the button below:</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{.ResetURL}}" style="background-color: #e74c3c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
        </div>
        
        <p>If the button above doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-left: 4px solid #e74c3c;">{{.ResetURL}}</p>
        
        <p><strong>Security Notice:</strong></p>
        <ul>
            <li>This reset link will expire in 1 hour for security reasons</li>
            <li>Once used, this link will become invalid</li>
            <li>If you didn't request this reset, please contact our support team immediately</li>
        </ul>
        
        <p>For your security, never share this email or reset link with anyone.</p>
        
        <p>Best regards,<br>{{.CompanyName}}</p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        <p style="font-size: 12px; color: #666; text-align: center;">
            This email was sent to {{.UserEmail}}. For support, contact us at <a href="mailto:{{.SupportEmail}}">{{.SupportEmail}}</a>.
        </p>
    </div>
</body>
</html>`,
		TextBody: `Reset Your Password

Dear {{.UserName}},

We received a request to reset your password for your {{.AppName}} account. If you didn't request this, you can safely ignore this email.

To reset your password, visit this link:
{{.ResetURL}}

Security Notice:
• This reset link will expire in 1 hour for security reasons
• Once used, this link will become invalid
• If you didn't request this reset, please contact our support team immediately

For your security, never share this email or reset link with anyone.

Best regards,
{{.CompanyName}}

---
This email was sent to {{.UserEmail}}. For support, contact us at {{.SupportEmail}}.`,
	}
}

func (e *EmailService) getPasswordChangedTemplate() EmailTemplate {
	return EmailTemplate{
		Subject: "Password Changed Successfully",
		HTMLBody: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Password Changed - {{.AppName}}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f4f4f4; padding: 20px; border-radius: 10px;">
        <h1 style="color: #27ae60; text-align: center;">Password Changed Successfully</h1>
        
        <p>Dear {{.UserName}},</p>
        
        <p>This is to confirm that your password for your {{.AppName}} account has been successfully changed.</p>
        
        <div style="background-color: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 12px; border-radius: 4px; margin: 20px 0;">
            <strong>✓ Security Confirmation:</strong> Your password was changed successfully.
        </div>
        
        <p><strong>Account Details:</strong></p>
        <ul>
            <li>Email: {{.UserEmail}}</li>
            <li>Change Date: {{.ChangeDate}}</li>
        </ul>
        
        <p><strong>If you didn't make this change:</strong></p>
        <p>If you didn't change your password, your account may have been compromised. Please:</p>
        <ul>
            <li>Contact our support team immediately at <a href="mailto:{{.SupportEmail}}">{{.SupportEmail}}</a></li>
            <li>Reset your password again as soon as possible</li>
            <li>Review your recent account activity</li>
        </ul>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{.AppURL}}" style="background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Access Your Account</a>
        </div>
        
        <p>For your security, we recommend:</p>
        <ul>
            <li>Using a strong, unique password</li>
            <li>Enabling two-factor authentication if available</li>
            <li>Not sharing your login credentials with anyone</li>
        </ul>
        
        <p>Best regards,<br>{{.CompanyName}}</p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        <p style="font-size: 12px; color: #666; text-align: center;">
            This email was sent to {{.UserEmail}}. For support, contact us at <a href="mailto:{{.SupportEmail}}">{{.SupportEmail}}</a>.
        </p>
    </div>
</body>
</html>`,
		TextBody: `Password Changed Successfully

Dear {{.UserName}},

This is to confirm that your password for your {{.AppName}} account has been successfully changed.

✓ Security Confirmation: Your password was changed successfully.

Account Details:
• Email: {{.UserEmail}}

If you didn't make this change:
If you didn't change your password, your account may have been compromised. Please:
• Contact our support team immediately at {{.SupportEmail}}
• Reset your password again as soon as possible
• Review your recent account activity

Access your account: {{.AppURL}}

For your security, we recommend:
• Using a strong, unique password
• Enabling two-factor authentication if available
• Not sharing your login credentials with anyone

Best regards,
{{.CompanyName}}

---
This email was sent to {{.UserEmail}}. For support, contact us at {{.SupportEmail}}.`,
	}
}