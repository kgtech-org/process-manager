# Process Manager - Architecture & Data Model

## 🏗️ System Architecture

```mermaid
graph TB
    subgraph "Frontend Layer"
        UI[Next.js 14 App]
        UI --> AUTH[Auth Components]
        UI --> FORMS[Multi-Step Forms]
        UI --> DASH[Analytics Dashboard]
        UI --> COLLAB[Collaboration UI]
    end

    subgraph "API Layer"
        API[Go/Gin REST API]
        AUTH_MW[Auth Middleware]
        PERM_MW[Permission Middleware]
        API --> AUTH_MW
        API --> PERM_MW
    end

    subgraph "Business Logic"
        DOC_SVC[Document Service]
        AUTH_SVC[Auth Service]
        COLLAB_SVC[Collaboration Service]
        PDF_SVC[PDF Generation Service]
        EMAIL_SVC[Email Service]
        ANALYTICS_SVC[Analytics Service]
    end

    subgraph "Storage Layer"
        MONGO[(MongoDB)]
        REDIS[(Redis Cache)]
        MINIO[(MinIO Object Storage)]
    end

    UI --> API
    API --> DOC_SVC
    API --> AUTH_SVC
    API --> COLLAB_SVC
    API --> PDF_SVC
    API --> EMAIL_SVC
    API --> ANALYTICS_SVC

    DOC_SVC --> MONGO
    AUTH_SVC --> MONGO
    AUTH_SVC --> REDIS
    COLLAB_SVC --> MONGO
    PDF_SVC --> MINIO
    EMAIL_SVC --> REDIS
    ANALYTICS_SVC --> MONGO
```

## 📊 Database Schema Relationships

```mermaid
erDiagram
    User ||--o{ DocumentPermission : "has permissions"
    User ||--o{ Invitation : "receives invitations"
    User ||--o{ Contributor : "becomes contributor"
    User ||--o{ ActivityLog : "performs actions"
    User ||--o{ Signature : "creates signatures"

    Document ||--o{ DocumentPermission : "has permissions"
    Document ||--o{ Invitation : "has invitations"
    Document ||--o{ Contributor : "has contributors"
    Document ||--o{ ActivityLog : "logs activities"
    Document ||--o{ Signature : "collects signatures"
    Document ||--o{ PDFExport : "generates exports"
    Document ||--|| Contributors : "contains"
    Document ||--|| DocumentMetadata : "contains"
    Document ||--o{ ProcessGroup : "contains"
    Document ||--o{ Annex : "contains"

    Contributors ||--o{ Contributor : "authors/verifiers/validators"

    ProcessGroup ||--o{ ProcessStep : "contains steps"
    ProcessStep ||--o{ ProcessDescription : "contains descriptions"

    Annex ||--o{ FileAttachment : "contains files"

    MonthlyBilan ||--|| User : "uploaded by"

    User {
        ObjectID _id PK
        string email UK
        string name
        string title
        string department
        UserRole role
        bool active
        datetime created_at
        datetime last_login_at
    }

    Document {
        ObjectID _id PK
        string reference UK
        string title
        string version
        DocumentStatus status
        ObjectID created_by FK
        datetime created_at
        datetime updated_at
        datetime approved_at
    }

    Contributors {
        array authors
        array verifiers
        array validators
    }

    Contributor {
        ObjectID user_id FK
        string name
        string title
        string department
        ContributorTeam team
        SignatureStatus status
        datetime signature_date
        datetime invited_at
    }

    ProcessGroup {
        string id PK
        string title
        int order
    }

    ProcessStep {
        string id PK
        string title
        int order
        array outputs
        array durations
        string responsible
    }

    ProcessDescription {
        string title
        array instructions
        int order
        int output_index
        int duration_index
    }

    DocumentPermission {
        ObjectID _id PK
        ObjectID document_id FK
        ObjectID user_id FK
        PermissionType permission
        ObjectID granted_by FK
        datetime granted_at
        datetime expires_at
        PermissionStatus status
    }

    Invitation {
        ObjectID _id PK
        ObjectID document_id FK
        ObjectID inviter_id FK
        string invitee_email
        ObjectID invitee_id FK
        PermissionType permission
        InvitationRole role
        ContributorTeam team
        string token UK
        InvitationStatus status
        datetime sent_at
        datetime accepted_at
        datetime expires_at
    }

    ActivityLog {
        ObjectID _id PK
        ObjectID document_id FK
        ObjectID user_id FK
        ActivityAction action
        interface details
        string ip_address
        datetime timestamp
    }

    Signature {
        ObjectID _id PK
        ObjectID document_id FK
        ObjectID user_id FK
        SignatureType signature_type
        SignatureStatus status
        datetime signed_at
        string comments
    }

    PDFExport {
        ObjectID _id PK
        ObjectID document_id FK
        string version
        string minio_object_name
        ObjectID generated_by FK
        datetime generated_at
        ExportStatus status
    }

    MonthlyBilan {
        ObjectID _id PK
        int month
        int year
        string process_reference
        map incident_counts
        map avg_resolution_time
        int total_incidents
        float sla_compliance
        ObjectID uploaded_by FK
        datetime uploaded_at
    }

    FileAttachment {
        ObjectID _id PK
        string file_name
        string original_name
        string content_type
        int file_size
        string minio_object_name
        ObjectID uploaded_by FK
        datetime uploaded_at
    }

    Annex {
        string id PK
        string title
        AnnexType type
        interface content
        int order
    }

    DocumentMetadata {
        array objectives
        array implicated_actors
        array management_rules
        array terminology
        array change_history
    }
```

## 🔄 Data Flow Diagrams

### User Invitation & Contributor Flow

```mermaid
sequenceDiagram
    participant Creator as Document Creator
    participant System as Process Manager
    participant InvitedUser as Invited User
    participant Email as Email Service

    Creator->>System: Create Document
    Creator->>System: Send Invitation (email, team, role)
    System->>Email: Send Email with Token
    Email->>InvitedUser: Email Invitation
    InvitedUser->>System: Accept Invitation (token)
    System->>System: Create Contributor Record
    System->>System: Grant Document Permissions
    InvitedUser->>System: Access Document as Contributor
```

### Process Definition Structure

```mermaid
graph TD
    DOC[Document] --> |contains| PG1[Process Group I: DETECTION]
    DOC --> |contains| PG2[Process Group II: GESTION]
    DOC --> |contains| PG3[Process Group III: RESOLUTION]
    
    PG1 --> |contains| PS1[Step 1: Incident Detection]
    PG1 --> |contains| PS2[Step 2: Initial Classification]
    
    PS1 --> |has outputs| OUT1[Outputs: Alert Generated, Ticket Created]
    PS1 --> |has durations| DUR1[Durations: T0+2min, T0+5min]
    
    PS1 --> |contains| DESC1[Description 1: Automated Detection]
    PS1 --> |contains| DESC2[Description 2: Manual Detection]
    
    DESC1 --> |links to| OUT1
    DESC1 --> |links to| DUR1
    DESC1 --> |has| INST1[Instructions: 1. Monitor alerts, 2. Validate severity, 3. Create ticket]
    
    DESC2 --> |links to| OUT1
    DESC2 --> |links to| DUR1
    DESC2 --> |has| INST2[Instructions: 1. Receive report, 2. Assess impact, 3. Document incident]
```

### Three-Tier Signature Workflow

```mermaid
stateDiagram-v2
    [*] --> Draft: Document Created
    
    Draft --> AuthorReview: Submit for Author Review
    AuthorReview --> AuthorSigned: Authors Sign
    AuthorReview --> Draft: Rejected by Author
    
    AuthorSigned --> VerifierReview: Submit for Verification
    VerifierReview --> VerifierSigned: Verifiers Sign
    VerifierReview --> Draft: Rejected by Verifier
    
    VerifierSigned --> ValidatorReview: Submit for Validation
    ValidatorReview --> Approved: Validators Sign
    ValidatorReview --> Draft: Rejected by Validator
    
    Approved --> Archived: Archive Document
    Approved --> [*]: Published
    
    note right of AuthorReview
        Contributors with Team = "authors"
        Permission = "sign"
    end note
    
    note right of VerifierReview
        Contributors with Team = "verifiers"  
        Permission = "sign"
    end note
    
    note right of ValidatorReview
        Contributors with Team = "validators"
        Permission = "sign"
    end note
```

### Analytics Data Processing

```mermaid
flowchart TD
    START([Monthly Bilan Upload]) --> UPLOAD[CSV/Excel File Upload]
    UPLOAD --> VALIDATE[Data Validation & Cleansing]
    VALIDATE --> PROCESS[Process Data Processing]
    
    PROCESS --> CALC1[Calculate Incident Counts by Priority]
    PROCESS --> CALC2[Calculate Average Resolution Times]
    PROCESS --> CALC3[Calculate SLA Compliance Rates]
    PROCESS --> CALC4[Generate Process Efficacy Scores]
    
    CALC1 --> STORE[Store in MonthlyBilan Collection]
    CALC2 --> STORE
    CALC3 --> STORE
    CALC4 --> STORE
    
    STORE --> DASHBOARD[Update Analytics Dashboard]
    STORE --> TRENDS[Generate Trend Analysis]
    STORE --> REPORTS[Create Performance Reports]
    
    DASHBOARD --> END([Display Metrics])
    TRENDS --> END
    REPORTS --> END
```

## 🔐 Security & Permission Model

### Permission Matrix

```mermaid
graph TD
    USER[User] --> |has role| ADMIN[Admin User]
    USER --> |has role| MANAGER[Manager User]  
    USER --> |has role| TECH[Technician User]
    USER --> |has role| VIEWER[Viewer User]
    
    USER --> |receives| INVITATION[Document Invitation]
    INVITATION --> |creates| CONTRIBUTOR[Document Contributor]
    
    CONTRIBUTOR --> |assigned to team| AUTHORS[Authors Team]
    CONTRIBUTOR --> |assigned to team| VERIFIERS[Verifiers Team]
    CONTRIBUTOR --> |assigned to team| VALIDATORS[Validators Team]
    
    CONTRIBUTOR --> |granted permission| READ[Read Permission]
    CONTRIBUTOR --> |granted permission| WRITE[Write Permission]
    CONTRIBUTOR --> |granted permission| SIGN[Sign Permission]
    
    AUTHORS --> |can perform| AUTHOR_ACTIONS[Create Content, Edit Drafts, Request Review]
    VERIFIERS --> |can perform| VERIFIER_ACTIONS[Technical Review, Approve/Reject, Request Changes]
    VALIDATORS --> |can perform| VALIDATOR_ACTIONS[Executive Approval, Final Sign-off, Publish]
    
    ADMIN --> |can perform| ALL_ACTIONS[All System Operations]
    MANAGER --> |can perform| DEPT_ACTIONS[Department-wide Access]
    TECH --> |can perform| OPERATIONAL[Process Execution, Data Entry]
    VIEWER --> |can perform| READ_ONLY[View Assigned Documents]
```

## 📁 File Storage Architecture

```mermaid
graph TD
    MINIO[(MinIO Object Storage)] --> BUCKETS{Bucket Structure}
    
    BUCKETS --> TEMPLATES[process-documents/templates/]
    BUCKETS --> DOCS[process-documents/documents/]
    BUCKETS --> BILANS[process-documents/bilans/]
    
    TEMPLATES --> LOGO[yas-logo.png]
    TEMPLATES --> TEMPLATE[yas_template.html]
    
    DOCS --> DOC_FOLDER[{doc-id}/]
    DOC_FOLDER --> ATTACHMENTS[attachments/]
    DOC_FOLDER --> GENERATED[generated/]
    
    ATTACHMENTS --> DIAGRAMS[diagrams/]
    ATTACHMENTS --> UPLOADS[user-uploads/]
    
    GENERATED --> PDFS[exported-pdfs/]
    GENERATED --> VERSIONS[version-archives/]
    
    BILANS --> YEAR_FOLDER[{year}/]
    YEAR_FOLDER --> MONTH_FOLDER[{month}/]
    MONTH_FOLDER --> CSV_FILES[*.csv, *.xlsx]
```

## ⚡ Performance & Caching Strategy

```mermaid
graph LR
    CLIENT[Client Request] --> NGINX[Nginx Proxy]
    NGINX --> API[Go API Server]
    
    API --> AUTH_CACHE{Auth Cache Check}
    AUTH_CACHE -->|Hit| REDIS_AUTH[(Redis Auth Cache)]
    AUTH_CACHE -->|Miss| MONGO_AUTH[(MongoDB Users)]
    
    API --> DOC_CACHE{Document Cache Check}  
    DOC_CACHE -->|Hit| REDIS_DOC[(Redis Doc Cache)]
    DOC_CACHE -->|Miss| MONGO_DOC[(MongoDB Documents)]
    
    API --> PERM_CACHE{Permission Cache Check}
    PERM_CACHE -->|Hit| REDIS_PERM[(Redis Permission Cache)]
    PERM_CACHE -->|Miss| MONGO_PERM[(MongoDB Permissions)]
    
    MONGO_AUTH --> REDIS_AUTH
    MONGO_DOC --> REDIS_DOC  
    MONGO_PERM --> REDIS_PERM
    
    API --> RESPONSE[API Response]
    RESPONSE --> NGINX
    NGINX --> CLIENT
```

---

**Generated with Claude Code** 🤖

Co-Authored-By: Claude <noreply@anthropic.com>