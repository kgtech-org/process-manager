# Contributing to Process Manager

We welcome contributions to the Process Manager project! This document provides guidelines and information for contributors to help maintain code quality and project consistency.

## 🎯 Project Overview

Process Manager is a digital process management platform for telecommunications companies, built to digitize and manage procedural documentation with collaborative workflows, multi-step forms, and performance analytics.

## 🤝 Contributing Workflow

All development follows a GitHub issue-based workflow to ensure organized and trackable progress.

### 🤖 Using Claude Code with MCP

This project is designed to work seamlessly with Claude Code and the MCP GitHub integration. Contributors using Claude Code should:

1. **Always use MCP GitHub tools** for issue and branch management instead of manual GitHub operations
2. **Create branches through GitHub issues** using the MCP tools, not local git commands
3. **Let Claude Code handle GitHub operations** like creating PRs, managing issues, and branch operations
4. **Use the established workflow** that leverages GitHub's native issue-to-branch linking

**Important**: When working with Claude Code, avoid creating branches manually. Instead, use the GitHub MCP integration to create branches from issues, which ensures proper linking and tracking.

### Workflow Steps

1. **Create Issue**: Start with a GitHub issue describing the feature, bug, or improvement
   - Use clear, descriptive titles
   - Provide detailed descriptions with requirements
   - Add appropriate labels (feature, bug, enhancement, etc.)
   - Assign to relevant milestone if applicable

2. **Create Branch**: Create a work branch from the GitHub issue:
   - Go to the issue on GitHub
   - Click "Create a branch" or "Development" section in the issue sidebar
   - GitHub will create a branch with the naming convention: `{issue-number}-{issue-title-slug}`
   - Fetch and switch to the branch locally:

   ```bash
   git fetch origin
   git checkout {issue-number}-{issue-title-slug}
   ```

3. **Development**: Work on your changes in the branch
   - Follow code style guidelines (see below)
   - Write tests for new functionality
   - Update documentation as needed
   - Ensure all existing tests pass

4. **Commit**: Make descriptive commits referencing the issue:
   ```bash
   git commit -m "feat: add user authentication (closes #23)"
   git commit -m "fix: resolve PDF export error (fixes #15)"
   git commit -m "docs: update API documentation (refs #8)"
   git commit -m "refactor: improve database queries (closes #42)"
   ```

5. **Pull Request**: Create a PR that references the issue:
   - **Title**: Include issue number: `feat: User Authentication System (#23)`
   - **Description**: Reference the issue: `Closes #23` or `Fixes #15`
   - **Review**: Add reviewers and request feedback
   - **Testing**: Ensure CI passes and manual testing is complete

6. **Review & Merge**: PR gets reviewed and merged after approval
   - Address review feedback promptly
   - Squash commits if requested
   - Ensure branch is up to date before merge

### Branch Naming Examples

GitHub automatically creates branches with the format: `{issue-number}-{issue-title-slug}`

Examples:

```text
23-user-authentication-system
15-fix-pdf-export-error
8-update-api-documentation
42-improve-ui-components
55-optimize-database-queries
67-fix-authentication-vulnerability
```

### 🤖 Claude Code Integration Rules

When working with Claude Code on this project, always follow these rules:

1. **Issue Management**: Use MCP GitHub tools to create, update, and manage issues
2. **Branch Creation**: Create branches from issues using MCP tools, never with local `git checkout -b`
3. **Pull Requests**: Use MCP tools to create PRs with proper issue linking
4. **Project Navigation**: Let Claude Code use the established folder structure and documentation
5. **GitHub Operations**: Prefer MCP GitHub operations over manual GitHub web interface when possible

**Reminder for Claude Code Users**: The project uses GitHub's issue-to-branch workflow. Always create work branches through the GitHub issue interface (via MCP tools) to maintain proper tracking and linking.

## 🛠️ Development Environment Setup

### Prerequisites

- **Docker 24+** - All services run in containers
- **Docker Compose v2+** - Service orchestration
- **Git** - Version control
- **IDE/Editor** - VS Code recommended with Go and TypeScript extensions

### Quick Start

```bash
# Clone the repository
git clone https://github.com/kodesonik/process-manager.git
cd process-manager

# Copy environment file and configure
cp .env.example .env
# Edit .env with your local configuration

# Start all services in development mode
docker-compose up -d

# Verify services are running
docker-compose ps

# View logs
docker-compose logs -f backend frontend

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8080
# MinIO Console: http://localhost:9001 (admin/password123)
```

### Individual Service Development

```bash
# Backend development (Go)
docker-compose up -d mongodb redis minio
cd backend 
go mod tidy
go run cmd/main.go

# Frontend development (Next.js)
cd frontend
npm install
npm run dev

# Database services only
docker-compose up -d mongodb redis minio
```

## 📝 Code Style Guidelines

### Go Backend

- **Formatting**: Use `gofmt` and `goimports`
- **Linting**: Use `golangci-lint` for code quality
- **Naming**: Follow Go naming conventions (PascalCase for exports, camelCase for local)
- **Error Handling**: Always handle errors explicitly
- **Documentation**: Add godoc comments for exported functions and types

```go
// Example: Good Go code style
type DocumentService struct {
    db     *mongo.Database
    logger *slog.Logger
}

// CreateDocument creates a new document with validation
func (s *DocumentService) CreateDocument(ctx context.Context, doc *Document) (*Document, error) {
    if err := doc.Validate(); err != nil {
        return nil, fmt.Errorf("validation failed: %w", err)
    }
    
    // Implementation...
    return doc, nil
}
```

### TypeScript Frontend

- **Formatting**: Use Prettier with project configuration
- **Linting**: Use ESLint with TypeScript rules
- **Naming**: Use camelCase for variables/functions, PascalCase for components/types
- **Components**: Use functional components with hooks
- **Types**: Define explicit types, avoid `any`

```typescript
// Example: Good TypeScript code style
interface ProcessStepProps {
  step: ProcessStep;
  onUpdate: (step: ProcessStep) => void;
  isEditable?: boolean;
}

export const ProcessStepEditor: React.FC<ProcessStepProps> = ({
  step,
  onUpdate,
  isEditable = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  
  // Implementation...
  return (
    <div className="process-step-editor">
      {/* Component JSX */}
    </div>
  );
};
```

### Database Conventions

- **Collections**: Use snake_case for collection names (`documents`, `process_steps`)
- **Fields**: Use snake_case for field names (`created_at`, `user_id`)
- **Indexes**: Create indexes for frequently queried fields
- **Validation**: Use MongoDB schema validation where appropriate

### API Conventions

- **REST**: Follow RESTful API design principles
- **Endpoints**: Use kebab-case for multi-word resources (`/api/process-groups`)
- **HTTP Methods**: Use appropriate methods (GET, POST, PUT, DELETE, PATCH)
- **Status Codes**: Use appropriate HTTP status codes
- **Responses**: Consistent JSON response format

```json
{
  "success": true,
  "data": {...},
  "message": "Operation completed successfully",
  "errors": null,
  "pagination": {...}
}
```

## 🧪 Testing Guidelines

### Backend Testing (Go)

- **Unit Tests**: Test individual functions and methods
- **Integration Tests**: Test API endpoints and database interactions
- **Test Files**: Use `*_test.go` naming convention
- **Coverage**: Aim for 80%+ code coverage

```bash
# Run tests
go test ./...

# Run tests with coverage
go test -cover ./...

# Run specific test
go test -run TestCreateDocument ./internal/services
```

### Frontend Testing (TypeScript)

- **Unit Tests**: Test individual components and utilities
- **Integration Tests**: Test component interactions and forms
- **E2E Tests**: Test complete user workflows
- **Test Files**: Use `.test.tsx` or `.spec.tsx` extensions

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

### Test Structure

```go
// Go test example
func TestDocumentService_CreateDocument(t *testing.T) {
    tests := []struct {
        name    string
        input   *Document
        want    *Document
        wantErr bool
    }{
        {
            name:    "valid document",
            input:   validDocument(),
            want:    expectedDocument(),
            wantErr: false,
        },
        // More test cases...
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Test implementation
        })
    }
}
```

## 📚 Documentation Requirements

### Code Documentation

- **Go**: Use godoc-style comments for exported functions and types
- **TypeScript**: Use JSDoc comments for complex functions and components
- **README Updates**: Update README.md when adding new features
- **API Documentation**: Update API endpoints documentation

### Commit Documentation

- **Commit Messages**: Use conventional commit format
- **PR Descriptions**: Provide clear description of changes
- **Breaking Changes**: Document any breaking changes
- **Migration Notes**: Include database migration instructions if needed

### Documentation Types

```markdown
# API Endpoint Documentation Template
## POST /api/documents

Creates a new document with the provided data.

### Request
```json
{
  "title": "New Process Document",
  "reference": "TG-TELCO-PRO-102"
}
```

### Response
```json
{
  "success": true,
  "data": {
    "_id": "60f1b2b3c4d5e6f7a8b9c0d1",
    "title": "New Process Document"
  }
}
```

### Error Codes
- `400` - Invalid request data
- `401` - Unauthorized
- `409` - Document reference already exists
```

## 🔒 Security Guidelines

### Authentication & Authorization

- **JWT Tokens**: Use secure, signed JWT tokens
- **Password Security**: Hash passwords with bcrypt
- **Permission Validation**: Always validate user permissions
- **Rate Limiting**: Implement rate limiting on sensitive endpoints

### Data Validation

- **Input Validation**: Validate all user inputs
- **SQL Injection**: Use parameterized queries (MongoDB aggregation)
- **XSS Prevention**: Sanitize user-generated content
- **File Uploads**: Validate file types and sizes

### Secrets Management

- **Environment Variables**: Store secrets in environment variables
- **No Hardcoding**: Never hardcode secrets in source code
- **Production Secrets**: Use secure secret management in production

## 🐛 Bug Reports

When reporting bugs, please include:

1. **Description**: Clear description of the issue
2. **Steps to Reproduce**: Detailed steps to reproduce the bug
3. **Expected Behavior**: What you expected to happen
4. **Actual Behavior**: What actually happened
5. **Environment**: OS, browser, Docker versions
6. **Screenshots**: Visual evidence if applicable
7. **Logs**: Relevant error logs or stack traces

### Bug Report Template

```markdown
## Bug Description
Brief description of the bug.

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

## Expected Behavior
A clear description of what you expected to happen.

## Actual Behavior
A clear description of what actually happened.

## Environment
- OS: [e.g. macOS 12.0]
- Browser: [e.g. Chrome 95.0]
- Docker: [e.g. 24.0.0]
- Version: [e.g. v1.2.0]

## Additional Context
Add any other context about the problem here.
```

## 🚀 Feature Requests

When requesting features, please include:

1. **Use Case**: Describe the problem you're trying to solve
2. **Proposed Solution**: Your suggested approach
3. **Alternative Solutions**: Other approaches you've considered
4. **Mockups/Examples**: Visual examples if applicable
5. **Priority**: Urgency and importance level

## 📊 Performance Considerations

### Backend Performance

- **Database Queries**: Use efficient queries with proper indexes
- **Caching**: Implement Redis caching for frequently accessed data
- **Pagination**: Implement pagination for large datasets
- **Background Jobs**: Use background jobs for time-consuming tasks

### Frontend Performance

- **Bundle Size**: Keep bundle size optimized
- **Lazy Loading**: Implement lazy loading for large components
- **Memoization**: Use React.memo for expensive components
- **Image Optimization**: Optimize images and use appropriate formats

## 🔄 Release Process

### Version Numbering

We follow semantic versioning (SemVer):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Steps

1. **Feature Freeze**: Stop adding new features
2. **Testing**: Comprehensive testing phase
3. **Documentation**: Update all documentation
4. **Version Bump**: Update version numbers
5. **Release Notes**: Create detailed release notes
6. **Deployment**: Deploy to production environment

## 📞 Getting Help

### Communication Channels

- **GitHub Issues**: Technical discussions and bug reports
- **Email**: support@togocom.tg for general inquiries
- **Documentation**: Check existing documentation first

### Code Review Process

- **Review Requirements**: All PRs require at least one review
- **Review Checklist**: Code quality, tests, documentation
- **Feedback**: Provide constructive, actionable feedback
- **Approval**: Explicit approval required before merge

## 🏷️ Issue Labels

We use the following labels to categorize issues:

### Type Labels
- `feature` - New feature or enhancement
- `bug` - Something isn't working
- `documentation` - Improvements to documentation
- `refactor` - Code refactoring
- `security` - Security-related issues
- `performance` - Performance improvements

### Priority Labels
- `high-priority` - Critical issues requiring immediate attention
- `medium-priority` - Important issues for next release
- `low-priority` - Nice-to-have improvements

### Component Labels
- `backend` - Backend/API related
- `frontend` - Frontend/UI related
- `database` - Database related
- `infrastructure` - DevOps/deployment related
- `authentication` - Authentication/authorization
- `collaboration` - Collaboration features

### Status Labels
- `ready-for-review` - Ready for code review
- `work-in-progress` - Currently being worked on
- `blocked` - Blocked by external dependencies
- `help-wanted` - Looking for contributors

## ✅ Pull Request Checklist

Before submitting a pull request, ensure:

- [ ] Issue exists and is linked in PR description
- [ ] Branch follows naming convention
- [ ] Code follows style guidelines
- [ ] Tests are written and passing
- [ ] Documentation is updated
- [ ] No merge conflicts
- [ ] Commit messages follow convention
- [ ] Security considerations addressed
- [ ] Performance impact considered
- [ ] Breaking changes documented

## 🙏 Recognition

Contributors will be recognized in:
- Repository contributors list
- Release notes for significant contributions
- Project documentation acknowledgments

Thank you for contributing to Process Manager! Your efforts help improve telecommunications process management for organizations worldwide.

---

**Questions?** Feel free to open an issue or contact the maintainers.

**Generated with Claude Code** 🤖

Co-Authored-By: Claude <noreply@anthropic.com>