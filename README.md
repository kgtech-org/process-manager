# Process Manager

A digital process management platform for telecommunications incident procedures, built as a monorepo with Go backend and Next.js frontend.

## 🎯 Project Overview

This application provides a structured multi-step form interface for creating and managing operational procedures for telecommunications companies, based on Togocom's standardized format (Document Reference: TG-TELCO-PRO-101 v1.0). The platform provides:

- **Interactive Document Creation**: Multi-step forms for structured procedure documentation
- **Contributor Management**: Digital signature workflows for Authors, Verifiers, and Validators
- **Metadata Management**: Goals, roles, rules, terminology, and version control
- **Process Definition**: Nested step-by-step procedure creation with timing and responsibilities
- **Rich Annexes**: Upload diagrams, create tables, and add rich text documentation
- **Process Efficacy Analytics**: Monthly performance analysis through incident bilans (reports)
- **Collaborative Workflows**: Email invitations and granular document permissions

## 🏗️ Architecture

### Monorepo Structure
```
process-manager/
├── backend/                    # Go API server with clean architecture
│   ├── cmd/                   # Application entrypoints
│   ├── internal/              # Private application code
│   │   ├── models/            # Data models (*.model.go)
│   │   ├── services/          # Business logic (*.service.go)
│   │   ├── handlers/          # HTTP handlers (*.handler.go)
│   │   ├── routes/            # API routes (*.routes.go)
│   │   ├── middleware/        # HTTP middleware (*.middleware.go)
│   │   └── helpers/           # Utility functions (*.helper.go)
│   ├── .rest/                 # REST API test files
│   ├── templates/             # PDF generation templates
│   ├── Dockerfile             # Backend container
│   ├── go.mod                 # Go dependencies
│   └── main.go                # Application entry point
├── frontend/                   # Next.js dashboard
│   ├── src/                   # Source code
│   ├── public/                # Static assets
│   ├── Dockerfile             # Frontend container
│   ├── package.json           # Node dependencies
│   └── next.config.js         # Next.js configuration
├── docker/                     # Docker configuration
│   ├── nginx/                 # Nginx reverse proxy config
│   ├── mongo-init.js          # MongoDB initialization
│   └── docker-compose.prod.yml # Production compose file
├── shared/                     # Shared types and utilities
├── docs/                       # Documentation
├── resources/                  # Example documents and assets
├── docker-compose.yml          # Development compose file
├── docker-compose.prod.yml     # Production compose file
├── .env.example               # Environment template
└── README.md                  # This file
```

### Technology Stack

#### Backend (Go)
- **Framework**: Gin HTTP web framework with clean architecture
- **Database**: MongoDB for document storage with BSON snake_case fields
- **Cache**: Redis for session management and JWT token storage
- **Authentication**: 3-step registration with OTP, JWT access/refresh tokens
- **Authorization**: Role-based access control (Admin/Manager/User)
- **File Storage**: MinIO for profile pictures and document attachments
- **API Format**: camelCase JSON requests and responses
- **File Organization**: Descriptive naming with layer suffixes (*.service.go, *.handler.go)
- **Security**: Input validation, rate limiting, content-type detection

#### Frontend (Next.js)
- **Framework**: Next.js 14 with App Router
- **UI Components**: Shadcn UI component library
- **Styling**: Tailwind CSS for responsive design
- **State Management**: Zustand for client state
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts for KPI dashboards

## 📊 Database Schema

### Core Models

#### Documents
```go
type Document struct {
    ID              primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
    Reference       string            `bson:"reference" json:"reference"`        // e.g., "TG-TELCO-PRO-101"
    Title           string            `bson:"title" json:"title"`
    Version         string            `bson:"version" json:"version"`          // e.g., "v1.0"
    Status          DocumentStatus    `bson:"status" json:"status"`           // draft, review, approved, archived
    
    // Contributors Section
    Contributors    Contributors      `bson:"contributors"`
    
    // Metadata Section  
    Metadata        DocumentMetadata  `bson:"metadata"`
    
    // Process Definition Section
    ProcessGroups   []ProcessGroup    `bson:"process_groups"`
    
    // Annexes Section
    Annexes         []Annex           `bson:"annexes"`
    
    CreatedBy       primitive.ObjectID `bson:"created_by" json:"createdBy"`
    CreatedAt       time.Time         `bson:"created_at" json:"createdAt"`
    UpdatedAt       time.Time         `bson:"updated_at" json:"updatedAt"`
    ApprovedAt      *time.Time        `bson:"approved_at,omitempty" json:"approvedAt,omitempty"`
}

type Contributors struct {
    Authors         []Contributor     `bson:"authors"`
    Verifiers       []Contributor     `bson:"verifiers"`
    Validators      []Contributor     `bson:"validators"`
}

type Contributor struct {
    UserID          primitive.ObjectID `bson:"user_id"`         // Reference to invited User
    Name            string            `bson:"name"`            // Cached from User for performance
    Title           string            `bson:"title"`           // Cached from User for performance
    Department      string            `bson:"department"`      // Cached from User for performance
    Team            ContributorTeam   `bson:"team"`            // authors, verifiers, validators
    SignatureDate   *time.Time        `bson:"signature_date,omitempty"`
    Status          SignatureStatus   `bson:"status"`          // pending, signed, rejected
    InvitedAt       time.Time         `bson:"invited_at"`
}

type DocumentMetadata struct {
    Objectives      []string          `bson:"objectives"`
    ImplicatedActors []Actor          `bson:"implicated_actors"`
    ManagementRules []Rule            `bson:"management_rules"`
    Terminology     []Term            `bson:"terminology"`
    ChangeHistory   []VersionChange   `bson:"change_history"`
}

type Actor struct {
    Role            string            `bson:"role"`
    Department      string            `bson:"department"`
    Responsibilities []string         `bson:"responsibilities"`
}

type Rule struct {
    Title           string            `bson:"title"`
    Description     string            `bson:"description"`
    Priority        string            `bson:"priority"`
}

type Term struct {
    Abbreviation    string            `bson:"abbreviation"`
    FullName        string            `bson:"full_name"`
    Definition      string            `bson:"definition"`
}

type VersionChange struct {
    Date            time.Time         `bson:"date"`
    Version         string            `bson:"version"`
    Author          string            `bson:"author"`
    Nature          string            `bson:"nature"`          // Creation, Update, Fix, etc.
    Description     string            `bson:"description"`
}

type ProcessGroup struct {
    ID              string            `bson:"id"`              // e.g., "I", "II", "III"
    Title           string            `bson:"title"`           // e.g., "DETECTION", "GESTION"
    Order           int               `bson:"order"`           // Sequential order
    ProcessSteps    []ProcessStep     `bson:"process_steps"`
}

type ProcessStep struct {
    ID              string                `bson:"id"`              // e.g., "1", "2", "3"
    Title           string                `bson:"title"`           // Step title
    Order           int                   `bson:"order"`           // Sequential order within group
    Descriptions    []ProcessDescription  `bson:"descriptions"`    // Multiple descriptions per step
    Outputs         []string              `bson:"outputs"`         // List of possible outputs
    Durations       []string              `bson:"durations"`       // List of possible durations
    Responsible     string                `bson:"responsible"`     // Role/Title
}

type ProcessDescription struct {
    Title           string            `bson:"title"`           // Description title
    Instructions    []string          `bson:"instructions"`    // Ordered list of instructions
    Order           int               `bson:"order"`           // Order within the step
    OutputIndex     int               `bson:"output_index"`    // Index to ProcessStep.Outputs
    DurationIndex   int               `bson:"duration_index"`  // Index to ProcessStep.Durations
}

type Annex struct {
    ID              string            `bson:"id"`              // e.g., "ANNEXE A", "ANNEXE B"
    Title           string            `bson:"title"`
    Type            AnnexType         `bson:"type"`            // diagram, table, text
    Content         interface{}       `bson:"content"`         // Different structure per type
    Order           int               `bson:"order"`
    FileAttachments []FileAttachment  `bson:"file_attachments,omitempty"`
}

type AnnexType string
const (
    AnnexDiagram AnnexType = "diagram"  // File upload for images/diagrams
    AnnexTable   AnnexType = "table"    // Structured table data
    AnnexText    AnnexType = "text"     // Rich text content
)

type FileAttachment struct {
    ID              primitive.ObjectID `bson:"_id,omitempty"`
    FileName        string            `bson:"file_name"`
    OriginalName    string            `bson:"original_name"`
    ContentType     string            `bson:"content_type"`
    FileSize        int64             `bson:"file_size"`
    MinioObjectName string            `bson:"minio_object_name"`
    MinioETag       string            `bson:"minio_etag"`
    UploadedBy      primitive.ObjectID `bson:"uploaded_by"`
    UploadedAt      time.Time         `bson:"uploaded_at"`
    Description     string            `bson:"description,omitempty"`
}

type PDFExport struct {
    ID              primitive.ObjectID `bson:"_id,omitempty"`
    DocumentID      primitive.ObjectID `bson:"document_id"`
    Version         string            `bson:"version"`
    MinioObjectName string            `bson:"minio_object_name"`
    GeneratedBy     primitive.ObjectID `bson:"generated_by"`
    GeneratedAt     time.Time         `bson:"generated_at"`
    TemplateUsed    string            `bson:"template_used"`    // "yas_template"
    FileSize        int64             `bson:"file_size"`
    Status          ExportStatus      `bson:"status"`           // generating, completed, failed
}

type ExportStatus string
const (
    ExportGenerating ExportStatus = "generating"
    ExportCompleted  ExportStatus = "completed"
    ExportFailed     ExportStatus = "failed"
)
```

#### Collaboration & Permissions
```go
type DocumentPermission struct {
    ID              primitive.ObjectID `bson:"_id,omitempty"`
    DocumentID      primitive.ObjectID `bson:"document_id"`
    UserID          primitive.ObjectID `bson:"user_id"`
    Permission      PermissionType     `bson:"permission"`       // read, write, sign
    GrantedBy       primitive.ObjectID `bson:"granted_by"`
    GrantedAt       time.Time         `bson:"granted_at"`
    ExpiresAt       *time.Time        `bson:"expires_at,omitempty"`
    Status          PermissionStatus   `bson:"status"`           // active, revoked, expired
}

type Invitation struct {
    ID              primitive.ObjectID `bson:"_id,omitempty"`
    DocumentID      primitive.ObjectID `bson:"document_id"`
    InviterID       primitive.ObjectID `bson:"inviter_id"`
    InviteeEmail    string            `bson:"invitee_email"`
    InviteeID       *primitive.ObjectID `bson:"invitee_id,omitempty"`
    Permission      PermissionType     `bson:"permission"`
    Role            InvitationRole     `bson:"role"`             // author, verifier, validator, collaborator
    Message         string            `bson:"message,omitempty"`
    Token           string            `bson:"token"`            // Unique invitation token
    Status          InvitationStatus   `bson:"status"`
    SentAt          time.Time         `bson:"sent_at"`
    AcceptedAt      *time.Time        `bson:"accepted_at,omitempty"`
    ExpiresAt       time.Time         `bson:"expires_at"`
}

type ActivityLog struct {
    ID              primitive.ObjectID `bson:"_id,omitempty"`
    DocumentID      primitive.ObjectID `bson:"document_id"`
    UserID          primitive.ObjectID `bson:"user_id"`
    Action          ActivityAction     `bson:"action"`
    Details         interface{}       `bson:"details"`
    IPAddress       string            `bson:"ip_address"`
    UserAgent       string            `bson:"user_agent"`
    Timestamp       time.Time         `bson:"timestamp"`
}

type PermissionType string
const (
    PermissionRead  PermissionType = "read"   // View document
    PermissionWrite PermissionType = "write"  // Edit document
    PermissionSign  PermissionType = "sign"   // Digital signature
)

type ContributorTeam string
const (
    TeamAuthors     ContributorTeam = "authors"     // Document preparation team
    TeamVerifiers   ContributorTeam = "verifiers"   // Technical review team
    TeamValidators  ContributorTeam = "validators"  // Executive approval team
)

type InvitationRole string
const (
    RoleAuthor      InvitationRole = "author"       // Document preparation
    RoleVerifier    InvitationRole = "verifier"     // Technical review
    RoleValidator   InvitationRole = "validator"    // Executive approval
    RoleCollaborator InvitationRole = "collaborator" // General contributor
)

type InvitationStatus string
const (
    InvitationPending  InvitationStatus = "pending"
    InvitationAccepted InvitationStatus = "accepted"
    InvitationDeclined InvitationStatus = "declined"
    InvitationExpired  InvitationStatus = "expired"
    InvitationRevoked  InvitationStatus = "revoked"
)

type ActivityAction string
const (
    ActionDocumentCreated    ActivityAction = "document_created"
    ActionDocumentUpdated    ActivityAction = "document_updated"
    ActionDocumentSigned     ActivityAction = "document_signed"
    ActionInvitationSent     ActivityAction = "invitation_sent"
    ActionInvitationAccepted ActivityAction = "invitation_accepted"
    ActionPermissionGranted  ActivityAction = "permission_granted"
    ActionPermissionRevoked  ActivityAction = "permission_revoked"
    ActionPDFExported        ActivityAction = "pdf_exported"
)
```

#### Users
```go
type User struct {
    ID           primitive.ObjectID `bson:"_id,omitempty"`
    Email        string            `bson:"email"`
    Name         string            `bson:"name"`
    Title        string            `bson:"title"`            // Job title
    Department   string            `bson:"department"`       // Department code (NOC, DSTC, etc.)
    Role         UserRole          `bson:"role"`             // admin, manager, technician, viewer
    Permissions  []Permission      `bson:"permissions"`
    Active       bool              `bson:"active"`
    CreatedAt    time.Time         `bson:"created_at"`
    LastLoginAt  *time.Time        `bson:"last_login_at,omitempty"`
    Invitations  []Invitation      `bson:"invitations"`      // Pending document invitations
}
```

#### Monthly Bilans (Performance Reports)
```go
type MonthlyBilan struct {
    ID                  primitive.ObjectID `bson:"_id,omitempty"`
    Month               int               `bson:"month"`            // 1-12
    Year                int               `bson:"year"`
    ProcessReference    string            `bson:"process_reference"` // e.g., "TG-TELCO-PRO-101"
    IncidentCounts      map[string]int    `bson:"incident_counts"`   // Priority -> count
    AverageResolutionTime map[string]int  `bson:"avg_resolution_time"` // Priority -> minutes
    TotalIncidents      int               `bson:"total_incidents"`
    SLACompliance       float64           `bson:"sla_compliance"`    // Percentage
    ProcessEfficacy     ProcessEfficacy   `bson:"process_efficacy"`
    UploadedBy          primitive.ObjectID `bson:"uploaded_by"`
    UploadedAt          time.Time         `bson:"uploaded_at"`
    Comments            string            `bson:"comments,omitempty"`
}

type ProcessEfficacy struct {
    P1_Performance      EfficacyMetric `bson:"p1_performance"`
    P2_Performance      EfficacyMetric `bson:"p2_performance"`
    P3_Performance      EfficacyMetric `bson:"p3_performance"`
    P4_Performance      EfficacyMetric `bson:"p4_performance"`
    OverallRating       string         `bson:"overall_rating"`    // excellent, good, needs_improvement
    RecommendedActions  []string       `bson:"recommended_actions"`
}

type EfficacyMetric struct {
    Count              int     `bson:"count"`
    AvgResolutionTime  int     `bson:"avg_resolution_minutes"`
    SLATarget          int     `bson:"sla_target_minutes"`
    ComplianceRate     float64 `bson:"compliance_rate"`
    ProcessAdherence   float64 `bson:"process_adherence"`
}
```

#### Signatures
```go
type Signature struct {
    ID           primitive.ObjectID `bson:"_id,omitempty"`
    DocumentID   primitive.ObjectID `bson:"document_id"`
    UserID       primitive.ObjectID `bson:"user_id"`
    SignatureType SignatureType     `bson:"signature_type"`   // preparation, verification, validation
    Status       SignatureStatus    `bson:"status"`           // pending, signed, rejected
    SignedAt     *time.Time         `bson:"signed_at,omitempty"`
    Comments     string            `bson:"comments,omitempty"`
    IPAddress    string            `bson:"ip_address"`
    UserAgent    string            `bson:"user_agent"`
}
```

### Enums and Constants

```go
type Priority string
const (
    P1_Critical Priority = "P1" // 1-2 hour SLA
    P2_High     Priority = "P2" // 2-3 hour SLA  
    P3_Elevated Priority = "P3" // 2.5-4 hour SLA
    P4_Moderate Priority = "P4" // 3-4 hour SLA
)

type IncidentStatus string
const (
    StatusOpen       IncidentStatus = "open"
    StatusInProgress IncidentStatus = "in_progress"
    StatusResolved   IncidentStatus = "resolved"
    StatusClosed     IncidentStatus = "closed"
)

type UserRole string
const (
    RoleAdmin      UserRole = "admin"      // Full system access
    RoleManager    UserRole = "manager"    // Department management
    RoleTechnician UserRole = "technician" // Operational tasks
    RoleViewer     UserRole = "viewer"     // Read-only access
)
```

## 🚀 Features

### Multi-Step Document Creation
- **Step 1 - Contributors**: Define Authors, Verifiers, and Validators with roles and departments
- **Step 2 - Metadata**: Set objectives, implicated actors, management rules, and terminology
- **Step 3 - Process Definition**: Create process groups and steps with multiple descriptions per step
- **Step 4 - Annexes**: Upload diagrams, create structured tables, add rich text content
- **Step 5 - Review & Signature**: Three-tier digital approval workflow
- **Auto-save**: Continuous form progress saving with draft status
- **PDF Export**: Generate professional PDFs using YAS corporate template layout
- **Collaboration**: Email invitations with role-based access control

### Process Performance Analytics
- **Monthly Bilan Upload**: Upload monthly incident reports for process validation
- **Performance Metrics**: Track incidents per priority level and resolution times
- **Process Efficacy Analysis**: Evaluate adherence to documented procedures
- **Compliance Monitoring**: Monitor SLA compliance rates across priority levels
- **Trend Analysis**: Historical performance tracking and improvement recommendations

### Process Workflow
- **Interactive Forms**: Step-by-step guidance through procedures
- **Role-based Routing**: Automatic assignment based on incident type
- **Status Tracking**: Real-time progress monitoring
- **Notification System**: Multi-channel alert distribution
- **Integration Support**: External systems and APIs

### Analytics & Reporting
- **Process Efficacy Dashboards**: Visual analysis of monthly performance data
- **SLA Compliance Tracking**: Historical compliance rates and trends
- **Performance Comparisons**: Month-over-month and year-over-year analysis
- **Report Generation**: Automated and on-demand efficacy reports
- **Process Improvement Recommendations**: AI-driven insights for optimization

### Collaborative Document Management
- **Email Invitations**: Invite users via email with secure invitation tokens
- **Granular Permissions**: Document-level read, write, and sign permissions
- **Role-Based Access**: Author, Verifier, Validator, and Collaborator roles
- **Activity Tracking**: Complete audit trail of all document interactions
- **Real-time Notifications**: Email and in-app notifications for document updates
- **Access Expiration**: Time-limited access with automatic revocation

## 🛠️ Development Setup

### Prerequisites
- Docker 24+
- Docker Compose v2+
- Git

**Note**: All services run in containers. No need to install Go, Node.js, MongoDB, Redis, or MinIO locally.

### Quick Start (Development)
```bash
# Clone the repository
git clone https://github.com/kodesonik/process-manager.git
cd process-manager

# Copy environment file
cp .env.example .env

# Start all services in development mode
docker-compose up -d

# View logs
docker-compose logs -f backend frontend

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8080
# MinIO Console: http://localhost:9001
```

### Individual Service Development
```bash
# Backend only (with database dependencies)
docker-compose up -d mongodb redis minio
cd backend && go run main.go

# Frontend only (assuming backend is running)
cd frontend && npm run dev

# Database services only
docker-compose up -d mongodb redis minio
```

### Docker Setup
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild services
docker-compose up --build
```

### Complete Docker Stack
```yaml
# docker-compose.yml
version: '3.8'

services:
  # MongoDB Database
  mongodb:
    image: mongo:6.0
    container_name: process-manager-mongodb
    restart: always
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
      MONGO_INITDB_DATABASE: process_manager
    volumes:
      - mongodb_data:/data/db
      - ./docker/mongo-init.js:/docker-entrypoint-initdb.d/mongo-init.js:ro
    networks:
      - process-manager

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: process-manager-redis
    restart: always
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - process-manager

  # MinIO Object Storage
  minio:
    image: minio/minio:latest
    container_name: process-manager-minio
    restart: always
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin123
    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3
    networks:
      - process-manager

  # Go Backend API
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: process-manager-backend
    restart: always
    ports:
      - "8080:8080"
    environment:
      - PORT=8080
      - MONGODB_URI=mongodb://admin:password@mongodb:27017/process_manager?authSource=admin
      - REDIS_URL=redis://redis:6379
      - MINIO_ENDPOINT=minio:9000
      - MINIO_ACCESS_KEY=minioadmin
      - MINIO_SECRET_KEY=minioadmin123
      - MINIO_BUCKET_NAME=process-documents
      - MINIO_USE_SSL=false
      - JWT_SECRET=your-super-secure-jwt-secret-key-change-in-production
      - CORS_ORIGINS=http://localhost:3000
      - SMTP_HOST=smtp.gmail.com
      - SMTP_PORT=587
      - SMTP_USER=noreply@togocom.tg
      - SMTP_PASSWORD=your-smtp-password
      - EMAIL_FROM=Process Manager <noreply@togocom.tg>
      - FRONTEND_URL=http://localhost:3000
      - LOG_LEVEL=info
    depends_on:
      - mongodb
      - redis
      - minio
    volumes:
      - ./backend/templates:/app/templates:ro
    networks:
      - process-manager

  # Next.js Frontend
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        - NEXT_PUBLIC_API_URL=http://localhost:8080/api
    container_name: process-manager-frontend
    restart: always
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8080/api
      - NEXT_PUBLIC_APP_NAME=Process Manager
      - NEXTAUTH_URL=http://localhost:3000
      - NEXTAUTH_SECRET=your-nextauth-secret-change-in-production
    depends_on:
      - backend
    networks:
      - process-manager

  # Nginx Reverse Proxy (Production)
  nginx:
    image: nginx:alpine
    container_name: process-manager-nginx
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./docker/nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - frontend
      - backend
    networks:
      - process-manager

volumes:
  mongodb_data:
    driver: local
  redis_data:
    driver: local
  minio_data:
    driver: local

networks:
  process-manager:
    driver: bridge
```

## 📋 Environment Variables

### Backend (.env)
```env
PORT=8080
MONGODB_URI=mongodb://localhost:27017/process_manager
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secure-secret-key
CORS_ORIGINS=http://localhost:3000
LOG_LEVEL=info

# MinIO Configuration
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=process-documents
MINIO_USE_SSL=false

# PDF Generation
PDF_TEMPLATE_PATH=./templates/yas_template.html
COMPANY_LOGO_URL=http://localhost:9000/process-documents/templates/yas-logo.png

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@togocom.tg
SMTP_PASSWORD=your-smtp-password
EMAIL_FROM=Process Manager <noreply@togocom.tg>
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api
NEXT_PUBLIC_APP_NAME=Process Manager
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret
```

## 🔐 Authentication & Authorization

### JWT Token Structure (camelCase API format)
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "email": "user@togocom.tg",
  "role": "manager",
  "tokenType": "access",
  "exp": 1640995200,
  "iat": 1640991600
}
```

### API Request/Response Format
All API endpoints use camelCase JSON formatting:

**Request Example:**
```json
{
  "departmentId": "507f1f77bcf86cd799439011",
  "jobPositionId": "507f1f77bcf86cd799439012",
  "requiredSkills": ["Go", "MongoDB", "Docker"]
}
```

**Response Example:**
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "lastLogin": "2025-01-15T09:15:00Z",
    "createdAt": "2025-01-10T08:00:00Z",
    "departmentId": "507f1f77bcf86cd799439013"
  }
}
```

### Role Permissions
- **Admin**: Full system access, user management
- **Manager**: Department-wide access, approval rights
- **Technician**: Operational access, incident handling
- **Viewer**: Read-only access to assigned areas

## 📊 API Documentation

### Authentication Endpoints
```
# 3-Step Registration Process
POST /api/auth/register/step1    # Send OTP to email
POST /api/auth/register/step2    # Verify OTP, get registration token  
POST /api/auth/register/step3    # Complete profile setup

# OTP-based Login
POST /api/auth/request-otp       # Request login OTP
POST /api/auth/verify-otp        # Verify OTP and login
POST /api/auth/refresh           # Refresh access token
POST /api/auth/logout            # Logout current session
POST /api/auth/revoke-all-tokens # Revoke all user tokens

# Profile Management
GET  /api/auth/me                # Get current user profile
PUT  /api/auth/profile           # Update user profile
POST /api/auth/avatar            # Upload profile picture
DELETE /api/auth/avatar          # Remove profile picture
```

### User Management (Admin Only)
```
GET    /api/users               # List all users with filtering
POST   /api/users               # Create new user  
GET    /api/users/{id}          # Get user details
PUT    /api/users/{id}          # Update user
DELETE /api/users/{id}          # Soft delete user
PUT    /api/users/{id}/activate # Activate user
PUT    /api/users/{id}/deactivate # Deactivate user
PUT    /api/users/{id}/role     # Update user role
PUT    /api/users/{id}/validate # Validate pending registration
```

### Department Management
```
# Public endpoints (no authentication required)
GET    /api/departments         # List all departments
GET    /api/departments/{id}    # Get specific department

# Manager+ operations (managers and admins)
POST   /api/departments         # Create new department
PUT    /api/departments/{id}    # Update department

# Admin-only operations
DELETE /api/departments/{id}    # Delete department
```

### Job Position Management
```
# Public endpoints (no authentication required)
GET    /api/job-positions       # List all job positions
GET    /api/job-positions/{id}  # Get specific job position

# Manager+ operations (managers and admins)
POST   /api/job-positions       # Create new job position
PUT    /api/job-positions/{id}  # Update job position

# Admin-only operations
DELETE /api/job-positions/{id}  # Delete job position
```

### Document Management (Future Implementation)
```
GET    /api/documents
POST   /api/documents
GET    /api/documents/{id}
PUT    /api/documents/{id}
DELETE /api/documents/{id}
POST   /api/documents/{id}/sign
GET    /api/documents/{id}/signatures
GET    /api/documents/{id}/export/pdf
POST   /api/documents/{id}/attachments
GET    /api/documents/{id}/attachments/{attachment_id}
POST   /api/documents/{id}/invite
GET    /api/documents/{id}/permissions
PUT    /api/documents/{id}/permissions/{user_id}
DELETE /api/documents/{id}/permissions/{user_id}
GET    /api/documents/{id}/activity
```

### Invitation & Collaboration
```
GET    /api/invitations
POST   /api/invitations/{token}/accept
POST   /api/invitations/{token}/decline
DELETE /api/invitations/{id}
GET    /api/users/invitations/pending
```

### Monthly Bilan Management
```
GET    /api/bilans
POST   /api/bilans
GET    /api/bilans/{id}
PUT    /api/bilans/{id}
DELETE /api/bilans/{id}
GET    /api/bilans/analytics
POST   /api/bilans/upload
GET    /api/bilans/{year}/{month}
```

## 🎨 Multi-Step Form Interface

### Step 1: Contributors Management
Form sections for each contributor type:
```typescript
- Authors Section (Document Preparation Team)
  - Add/Remove contributors
  - Name, Title, Department fields
  - Role assignment and responsibilities

- Verifiers Section (Technical Review Team)  
  - Senior managers and technical leads
  - Department-specific verifiers
  - Approval workflows

- Validators Section (Executive Approval)
  - Director-level sign-offs
  - Final validation process
  - Publication approval
```

### Step 2: Document Metadata
Structured forms for procedure information:
```typescript
- Objectives & Goals
  - Bullet point objectives editor
  - Impact and scope definition

- Implicated Actors by Role
  - Role-based responsibilities matrix
  - Department assignments
  - Contact information

- Management Rules
  - Process governance rules
  - Priority definitions
  - Escalation policies

- Terminology Dictionary
  - Abbreviations and definitions
  - Glossary management
  - Standardized terminology

- Version History
  - Change tracking
  - Author attribution
  - Version numbering
```

### Step 3: Process Definition
Process organization interface:
```typescript
- Process Group Management
  - Major process groups (Detection, Management, Resolution, etc.)
  - Group titles and sequential ordering
  - Group-level organization

- Process Step Creation
  - Steps within each group (numbered sequentially)
  - Step titles and responsible roles
  - List of possible outputs and durations per step
  - Drag-and-drop step reordering

- Multiple Descriptions per Step
  - Each step can have multiple descriptions
  - Each description has a title and ordered instructions
  - Each description links to a specific output and duration
  - Sequential ordering of descriptions within steps
```

### Step 4: Annexes Management
Multiple annex types with specialized editors:
```typescript
- Diagram Upload
  - File upload for images/flowcharts
  - Image preview and annotation
  - Format support: PNG, JPG, SVG, PDF

- Table Creator
  - Dynamic table builder
  - Column/row management
  - Data validation
  - Export capabilities

- Rich Text Editor
  - WYSIWYG text editing
  - Formatting options
  - Link management
  - Content templates
```

### UI Components
Built with Shadcn UI components for consistent user experience:
- **Progress Indicators**: Step completion tracking with visual progress bar
- **Form Validation**: Real-time validation with Zod schemas and error messaging
- **Auto-save**: Continuous draft saving every 30 seconds with conflict resolution
- **Mobile-Responsive**: Optimized forms for tablet and mobile use
- **Accessibility**: WCAG 2.1 compliant with keyboard navigation and screen reader support

### Collaboration UI Components
Advanced collaboration interface built for team productivity:
```typescript
- Invitation Panel
  - Email input with autocomplete from organization directory
  - Role selection (Author, Verifier, Validator, Collaborator)
  - Permission matrix (Read, Write, Sign)
  - Custom invitation message
  - Expiration date setting

- Team Management Dashboard
  - Active collaborators list with status indicators
  - Permission overview and modification controls
  - Pending invitation tracking
  - Access revocation tools

- Activity Feed
  - Real-time document changes with timestamps
  - User attribution for all modifications
  - Comment and review threads
  - Notification management

- Conflict Resolution
  - Automatic merge conflict detection
  - Side-by-side change comparison
  - Manual merge resolution tools
  - Version rollback capabilities
```

## 📁 File Storage & PDF Export

### MinIO Object Storage
Containerized MinIO setup for scalable file management:
```yaml
# docker-compose.yml
services:
  minio:
    image: minio/minio:latest
    ports:
      - "9000:9000"      # MinIO API
      - "9001:9001"      # MinIO Console
    environment:
      - MINIO_ROOT_USER=minioadmin
      - MINIO_ROOT_ACCESS_KEY=minioadmin
    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"
```

### File Storage Structure
```
process-documents/
├── templates/
│   ├── yas-logo.png           # YAS corporate logo
│   └── yas_template.html      # PDF generation template
├── documents/{doc-id}/
│   ├── attachments/           # Uploaded diagrams and files
│   └── generated/             # PDF exports
└── bilans/{year}/{month}/     # Monthly performance reports
```

### PDF Generation Features
Professional document export using YAS corporate branding:
```typescript
- Corporate Header: YAS logo and company information
- Document Metadata: Reference, version, dates, signatures
- Structured Content: 
  - Contributors table with signatures
  - Process steps with timing and responsibilities  
  - Annexes with embedded diagrams and tables
- Professional Formatting: 
  - Page numbering and headers/footers
  - Table of contents with links
  - Consistent typography and spacing
- Export Options:
  - Individual documents
  - Bulk export for approved procedures
  - Version comparison PDFs
```

### Dashboard Components
- **KPI Cards**: Real-time metrics display
- **Charts**: Incident trends and performance data
- **Tables**: Sortable and filterable data views
- **Notifications**: Toast messages and alerts

## 🔄 Workflow Integration

### Monthly Performance Analysis Flow
1. **Data Collection** → Monthly incident data gathered from operations
2. **Bilan Upload** → Performance data uploaded through structured forms
3. **Analysis** → Automated analysis of process adherence and efficacy
4. **Validation** → Review and approval of performance metrics
5. **Reporting** → Dashboard visualization and trend analysis
6. **Process Improvement** → Recommendations for procedure optimization

### Document Approval Flow
1. **Preparation** → Document created by process team
2. **Verification** → Technical review and approval
3. **Validation** → Executive sign-off and publication

### Collaboration Workflow
1. **Document Creation** → Creator initiates new procedure document
2. **Team Invitations** → Send email invitations to Users for specific contributor teams:
   - **Authors Team**: Document preparation and content creation
   - **Verifiers Team**: Technical review and validation  
   - **Validators Team**: Executive approval and final sign-off
3. **User → Contributor Conversion** → Invited Users become Contributors upon accepting invitations
4. **Access Management** → Granular permissions (read/write/sign) per User/Contributor
5. **Collaborative Editing** → Multiple Contributors work simultaneously with conflict resolution
6. **Activity Monitoring** → Real-time activity feed and change notifications
7. **Review Cycles** → Structured review process with role-based approvals
8. **Digital Signatures** → Three-tier signature workflow: Authors → Verifiers → Validators

## 📈 Performance & Scalability

### Optimization Features
- **Redis Caching**: Session management and frequently accessed data
- **Database Indexing**: Optimized queries for large datasets
- **Background Jobs**: Asynchronous processing for notifications
- **CDN Integration**: Static asset delivery optimization

### Monitoring
- Health check endpoints
- Performance metrics collection
- Error tracking and alerting
- Resource utilization monitoring

## 🤝 Contributing

All development follows a GitHub issue-based workflow:

### Workflow Steps

1. **Create Issue**: Start with a GitHub issue describing the feature, bug, or improvement
2. **Create Branch**: Create a work branch linked to the issue:
   ```bash
   git checkout -b feature/issue-{number}-{brief-description}
   git checkout -b bugfix/issue-{number}-{brief-description}  
   git checkout -b docs/issue-{number}-{brief-description}
   ```

3. **Development**: Work on your changes in the branch
4. **Commit**: Make descriptive commits referencing the issue:
   ```bash
   git commit -m "feat: add user authentication (closes #23)"
   git commit -m "fix: resolve PDF export error (fixes #15)"
   ```

5. **Pull Request**: Create a PR that references the issue:
   - Title should include issue number: `feat: User Authentication System (#23)`
   - Description should reference the issue: `Closes #23`

6. **Review & Merge**: PR gets reviewed and merged after approval

### Branch Naming Examples
```
feature/issue-23-user-authentication
bugfix/issue-15-pdf-export-error
docs/issue-8-api-documentation
enhancement/issue-42-ui-improvements
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support, email support@togocom.tg or create an issue in the repository.

## 🙏 Acknowledgments

- Togocom telecommunications for process documentation
- YAS for consulting and process development
- Open source community for tools and libraries used

---

**Generated with Claude Code** 🤖

Co-Authored-By: Claude <noreply@anthropic.com>