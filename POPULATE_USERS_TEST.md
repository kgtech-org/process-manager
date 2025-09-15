# User Population Testing Guide

## Overview
Updated the backend to populate department and job position data in user responses across all user-related endpoints.

## Changes Made

### 1. Updated User Model (`internal/models/user.model.go`)
- Added `Department *DepartmentResponse` field to `UserResponse` struct
- Added `JobPosition *JobPositionResponse` field to `UserResponse` struct
- Added `DepartmentID` and `JobPositionID` fields to response

### 2. Enhanced User Service (`internal/services/user.service.go`)
- Added `ToResponseWithDetails()` method to populate single user response
- Added `ToResponseListWithDetails()` method to populate list of user responses
- Added `getDepartmentByID()` helper method
- Added `getJobPositionByID()` helper method

### 3. Updated Handlers
- **Auth Handler**: `/api/auth/me` and `/api/auth/profile` now return populated data
- **User Handler**: All user endpoints now return populated department and job position data
  - `GET /api/users` - List users with populated details
  - `GET /api/users/:id` - Get user with populated details
  - `POST /api/users` - Create user with populated details
  - `PUT /api/users/:id` - Update user with populated details
  - `PUT /api/users/:id/validate` - Approve/reject user with populated details

## Testing

### 1. Prerequisites
```bash
# Start the services
docker-compose up -d

# Wait for services to be healthy
docker-compose ps
```

### 2. Create Test Data
First, create some departments and job positions for testing:

```bash
# Create a department
curl -X POST http://localhost/api/departments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "name": "Engineering",
    "code": "ENG",
    "description": "Software Engineering Department"
  }'

# Create a job position
curl -X POST http://localhost/api/job-positions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "title": "Senior Developer",
    "code": "SRD",
    "description": "Senior Software Developer",
    "departmentId": "DEPARTMENT_ID_HERE",
    "level": "senior",
    "requiredSkills": ["Go", "MongoDB", "Docker"]
  }'
```

### 3. Create User with Department and Job Position
```bash
curl -X POST http://localhost/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "name": "John Doe",
    "email": "john.doe@example.com",
    "role": "user",
    "departmentId": "DEPARTMENT_ID_HERE",
    "jobPositionId": "JOB_POSITION_ID_HERE"
  }'
```

### 4. Test Populated Responses

#### Get All Users
```bash
curl -X GET http://localhost/api/users \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

Expected response format:
```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": [
    {
      "id": "...",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "role": "user",
      "departmentId": "...",
      "jobPositionId": "...",
      "department": {
        "id": "...",
        "name": "Engineering",
        "code": "ENG",
        "description": "Software Engineering Department"
      },
      "jobPosition": {
        "id": "...",
        "title": "Senior Developer",
        "code": "SRD",
        "description": "Senior Software Developer",
        "level": "senior",
        "requiredSkills": ["Go", "MongoDB", "Docker"]
      }
    }
  ]
}
```

#### Get Single User
```bash
curl -X GET http://localhost/api/users/USER_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

#### Get Current User Profile
```bash
curl -X GET http://localhost/api/auth/me \
  -H "Authorization: Bearer $USER_TOKEN"
```

### 5. Verification Points

✅ **Department Data**: Verify `department` object is populated with full department details
✅ **Job Position Data**: Verify `jobPosition` object is populated with full job position details
✅ **IDs Present**: Verify `departmentId` and `jobPositionId` are still included
✅ **Fallback Handling**: Users without department/job position should not have null errors
✅ **Performance**: Multiple user lists should load efficiently

## Benefits

1. **Frontend Efficiency**: No need for additional API calls to get department/job position names
2. **Data Consistency**: All user endpoints return the same format
3. **Better UX**: Users can see department and job position names immediately
4. **Backward Compatibility**: IDs are still included for existing integrations
5. **Error Resilience**: Graceful fallback if population fails

## Error Handling

- If department/job position fetch fails, the basic user response is returned
- Missing department/job position data doesn't break the user response
- All existing functionality continues to work as before

## Performance Considerations

- Each user now requires additional database queries for department and job position
- Consider implementing caching for frequently accessed departments and job positions
- Batch operations for lists are optimized to minimize database calls