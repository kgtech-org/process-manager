# File Upload URL Configuration Changes

## Overview
Updated the file upload system to serve files through nginx reverse proxy instead of directly from MinIO, providing better security, caching, and URL management.

## Changes Made

### 1. Docker Compose (`docker-compose.yml`)
- ✅ Added Mongo Express service for MongoDB administration
- ✅ Added `UPLOAD_BASE_URL=http://localhost/files` environment variable to backend

### 2. Nginx Configuration (`docker/nginx/nginx.conf`)
- ✅ Added upstream block for MinIO service
- ✅ Added `/files/` location block that proxies to MinIO
- ✅ Configured proper headers for file serving:
  - Cache control (1 year for uploaded files)
  - CORS headers for cross-origin access
  - Range request support for large files
  - Proper content type handling

### 3. Backend MinIO Service (`internal/services/minio.service.go`)
- ✅ Updated to use `UPLOAD_BASE_URL` environment variable
- ✅ Modified URL construction to use `/files/` path instead of direct MinIO URLs
- ✅ Updated `extractObjectKeyFromURL` method to handle new URL format
- ✅ Backward compatibility with old URL format

## URL Format Changes

### Before:
```
http://localhost:9000/process-documents/avatars/user123.jpg
```

### After:
```
http://localhost/files/avatars/user123.jpg
```

## Benefits

1. **Security**: Files are served through nginx with proper security headers
2. **Caching**: Better caching control with nginx
3. **URL Consistency**: All URLs use the same domain (localhost)
4. **Load Balancing**: nginx can handle static file serving efficiently
5. **CORS Support**: Proper CORS headers for frontend access
6. **Range Requests**: Support for partial content requests (useful for large files)

## Service URLs

- **Frontend**: http://localhost
- **Backend API**: http://localhost/api
- **File Uploads**: http://localhost/files/
- **MinIO Console**: http://localhost:9001 (admin: minioadmin/minioadmin123)
- **Mongo Express**: http://localhost:8081 (admin: admin/admin123)

## Testing

1. Start services: `docker-compose up -d`
2. Upload an avatar through the frontend
3. Verify the URL format: `http://localhost/files/avatars/{userId}.{ext}`
4. Check that files are accessible through the new URL
5. Verify MongoDB data through Mongo Express

## Environment Variables

The backend now prioritizes these environment variables for file URLs:

1. `UPLOAD_BASE_URL` (preferred) - New variable for nginx-served files
2. `MINIO_PUBLIC_URL` (fallback) - Legacy variable for direct MinIO access
3. Auto-generated URL (last resort) - Based on MINIO_ENDPOINT

## Migration Notes

- Existing uploaded files will continue to work with old URLs
- New uploads will use the new URL format
- The system supports both URL formats during transition