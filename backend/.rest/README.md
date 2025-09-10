# REST API Testing Files

This directory contains REST client files for testing the Process Manager Backend API endpoints.

## Files

- `auth.rest` - Authentication API tests (OTP-based login, registration, profile management)
- `users.rest` - User management API tests (admin-only user validation and CRUD operations)
- `health.rest` - Health check and system status tests
- `protected.rest` - Protected endpoints and role-based access control tests

## Setup

1. **Install REST Client Extension**
   - VS Code: Install "REST Client" extension by Huachao Mao
   - IntelliJ/WebStorm: Built-in HTTP Client
   - Or use any HTTP client (Postman, Insomnia, curl, etc.)

2. **Start the Backend Server**
   ```bash
   # From backend directory
   go run cmd/main.go
   ```

3. **Start Dependencies**
   ```bash
   # From project root
   docker-compose up -d mongodb redis
   ```

## Authentication System Overview

The Process Manager uses an **OTP-based authentication system** with admin validation workflow:

### User Registration & Validation Workflow

1. **User Registration** → Status: `PENDING`
   - Users register via `POST /api/auth/register`
   - Account gets pending status, awaiting admin validation
   - Registration confirmation email sent to user

2. **Admin Validation** → Status: `ACTIVE` or `REJECTED`
   - Admin approves/rejects via `PUT /api/users/:id/validate`
   - Approved users get `ACTIVE` status and can login
   - Rejected users get `REJECTED` status and cannot login
   - Email notifications sent on approval/rejection

3. **OTP Authentication** (Active users only)
   - Request OTP: `POST /api/auth/request-otp`
   - Verify OTP: `POST /api/auth/verify-otp`
   - Get JWT tokens for API access

### User Status States

- `PENDING` - Awaiting admin validation (cannot login)
- `ACTIVE` - Approved and can login
- `REJECTED` - Rejected by admin (cannot login)
- `INACTIVE` - Deactivated by admin (cannot login)

## Usage

### VS Code REST Client

1. Open any `.rest` file in VS Code
2. Click "Send Request" above each HTTP request
3. View responses in the split panel
4. Use variables to chain requests together

### Environment Variables

The REST files use these variables:
- `@baseUrl = http://localhost:8080` - Backend server URL
- `@apiUrl = {{baseUrl}}/api` - API base path
- `@accessToken` - JWT access token (set from OTP login responses)
- `@refreshToken` - JWT refresh token (set from OTP login responses)
- `@adminToken` - Admin JWT token for user management operations

### Complete Testing Workflow

#### 1. User Registration and Validation Flow

```http
# Step 1: Register new user
POST {{apiUrl}}/auth/register
Content-Type: application/json

{
  "email": "john.doe@togocom.tg",
  "name": "John Doe",
  "phone": "+228 90 12 34 56",
  "department": "Network Operations",
  "position": "Network Engineer"
}
```

```http
# Step 2: Admin validates user (requires admin token)
PUT {{apiUrl}}/users/USER_ID/validate
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json

{
  "action": "approve",
  "role": "user"
}
```

#### 2. OTP Authentication Flow

```http
# Step 3: Request OTP for login
POST {{apiUrl}}/auth/request-otp
Content-Type: application/json

{
  "email": "john.doe@togocom.tg"
}
```

```http
# Step 4: Verify OTP and login
POST {{apiUrl}}/auth/verify-otp
Content-Type: application/json

{
  "email": "john.doe@togocom.tg",
  "otp": "123456"
}
```

#### 3. Authenticated API Access

```http
# Step 5: Access protected endpoints
GET {{apiUrl}}/auth/me
Authorization: Bearer ACCESS_TOKEN_FROM_STEP_4
```

## Test Categories

### Authentication Tests (`auth.rest`)

- ✅ User Registration (pending validation workflow)
- ✅ OTP Authentication (request-otp + verify-otp)
- ✅ Development Mode OTP (OTP returned in response)
- ✅ User Status Validation (pending/rejected/inactive users blocked)
- ✅ Token Management (refresh, revoke, logout)
- ✅ Profile Management
- ✅ Email Verification
- ✅ Error Scenarios & Security Tests

### User Management Tests (`users.rest`)

- ✅ Admin Authentication
- ✅ User Listing & Filtering (status, role, pagination)
- ✅ User Validation Workflow (approve/reject pending users)
- ✅ User CRUD Operations (create, read, update, delete)
- ✅ User Status Management (activate/deactivate)
- ✅ Role Management (user/manager/admin roles)
- ✅ Access Control (admin-only endpoints)
- ✅ Error Scenarios & Edge Cases

### Health Tests (`health.rest`)

- ✅ Basic health check
- ✅ Database connectivity status (MongoDB)
- ✅ Redis connectivity status
- ✅ Service health monitoring
- ✅ CORS header validation

### Protected Endpoint Tests (`protected.rest`)

- ✅ Document access control
- ✅ Process management access
- ✅ Admin endpoint restrictions
- ✅ Token validation scenarios
- ✅ Role-based access control

## Expected Response Codes

- `200` - Success (OTP sent, user updated, etc.)
- `201` - Created (user registration)
- `400` - Bad Request (validation errors, malformed JSON)
- `401` - Unauthorized (invalid OTP, expired token)
- `403` - Forbidden (pending/rejected/inactive user, insufficient role)
- `404` - Not Found (invalid user ID, endpoints)
- `409` - Conflict (email already exists)
- `422` - Unprocessable Entity (invalid role, status conflicts)
- `500` - Internal Server Error (database/Redis issues)

## Development Mode Features

When running in development mode (`GIN_MODE=debug` or `ENVIRONMENT=development`):

- OTP codes are returned in API responses for easy testing
- Email service logs OTP codes to console
- Additional debugging information in responses

## Tips

1. **Admin Setup:** Create an admin user manually in the database or via seeding script
2. **Token Management:** Copy access tokens from login responses to use in subsequent requests
3. **Variable Capture:** In VS Code REST Client, capture response values:
   ```http
   # @name login
   POST {{apiUrl}}/auth/verify-otp
   
   # Then use: @accessToken = {{login.response.body.data.access_token}}
   ```
4. **Test Order:** Follow the workflow order (register → admin validate → login → access)
5. **Database State:** Tests create data in MongoDB. Use test database or clean up as needed
6. **Email Testing:** Check console logs for email notifications and OTP codes
7. **Redis Testing:** OTP codes are stored in Redis with 5-minute expiry

## Security Testing

The REST files include comprehensive security tests:

- SQL injection attempts
- XSS attempts in input fields
- Buffer overflow tests (very long inputs)
- Invalid token scenarios
- Role escalation attempts
- Rate limiting tests (multiple rapid requests)

## Adding New Test Files

When adding new REST test files:

1. Create the file in this directory: `.rest/feature.rest`
2. Use consistent variable naming (`@baseUrl`, `@apiUrl`, `@accessToken`)
3. Include comprehensive error scenarios
4. Add authentication headers for protected endpoints
5. Test both success and failure cases
6. Include security tests and edge cases
7. Update this README with the new file

## Future Test Files

Planned REST test files:
- `documents.rest` - Document management API tests
- `processes.rest` - Process management API tests  
- `reports.rest` - Reporting and analytics API tests
- `notifications.rest` - Email notification system tests
- `admin.rest` - Additional administrative features

## Architecture Notes

This testing suite is designed for the Process Manager telecommunications application:

- **Domain Context:** Togocom infrastructure management
- **User Roles:** admin (full access), manager (process management), user (basic access)
- **Security:** OTP-based authentication, role-based access control
- **Email System:** SMTP notifications for registration workflow
- **Storage:** MongoDB (user data), Redis (OTP codes)
- **Infrastructure:** Docker containerized services