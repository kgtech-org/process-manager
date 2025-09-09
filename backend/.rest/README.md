# REST API Testing Files

This directory contains REST client files for testing the Process Manager Backend API endpoints.

## Files

- `auth.rest` - Authentication API tests (registration, login, password reset, etc.)
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
- `@accessToken` - JWT access token (set from login responses)
- `@refreshToken` - JWT refresh token (set from login responses)

### Example Workflow

1. **Register a user:**
   ```http
   POST {{apiUrl}}/auth/register
   Content-Type: application/json
   
   {
     "email": "test@example.com",
     "password": "Test123!",
     "name": "Test User",
     "role": "user"
   }
   ```

2. **Login:**
   ```http
   POST {{apiUrl}}/auth/login
   Content-Type: application/json
   
   {
     "email": "test@example.com",
     "password": "Test123!"
   }
   ```

3. **Copy access token from login response and use in protected endpoints:**
   ```http
   GET {{apiUrl}}/auth/me
   Authorization: Bearer YOUR_ACCESS_TOKEN_HERE
   ```

## Test Categories

### Authentication Tests (`auth.rest`)

- ✅ User Registration (all roles)
- ✅ User Login/Logout
- ✅ Password Reset Workflow
- ✅ Email Verification
- ✅ Token Refresh
- ✅ Profile Management
- ✅ Role-based Access Control
- ✅ Error Scenarios
- ✅ Security Tests

### Health Tests (`health.rest`)

- ✅ Basic health check
- ✅ Database connectivity status
- ✅ CORS header validation
- ✅ Error response testing (404, 405)
- ✅ Performance monitoring

### Protected Endpoint Tests (`protected.rest`)

- ✅ Document access control
- ✅ Process management access
- ✅ Admin endpoint restrictions
- ✅ Token validation scenarios
- ✅ Role-based access control
- ✅ Performance testing with tokens

## Expected Response Codes

- `200` - Success
- `201` - Created (user registration)
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid credentials/token)
- `403` - Forbidden (insufficient permissions)
- `409` - Conflict (email already exists)
- `500` - Internal Server Error

## Tips

1. **Update Tokens:** After login, copy the access and refresh tokens to use in subsequent requests
2. **Variable Capture:** In VS Code REST Client, you can capture response values:
   ```http
   # @name login
   POST {{apiUrl}}/auth/login
   
   # Then use: @accessToken = {{login.response.body.access_token}}
   ```
3. **Test Order:** Some tests depend on previous operations (e.g., login before accessing protected routes)
4. **Database State:** Tests may create data in the database. Use a test database or clean up as needed
5. **Email Service:** Email tests will log to console if SMTP is not configured

## Adding New Test Files

When adding new REST test files:

1. Create the file in this directory: `.rest/feature.rest`
2. Use consistent variable naming (`@baseUrl`, `@apiUrl`)
3. Include comprehensive error scenarios
4. Add documentation comments
5. Update this README with the new file

## Future Test Files

Planned REST test files:
- `documents.rest` - Document management API tests
- `processes.rest` - Process management API tests
- `admin.rest` - Administrative API tests
- `reports.rest` - Reporting API tests