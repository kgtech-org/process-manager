# Docker Hub Deployment Guide

This guide explains how to deploy your Process Manager application using Docker Hub images.

## Overview

The GitHub Actions workflows automatically build and push Docker images to Docker Hub for:
- **Backend**: `kodesonik/process-manager-backend`
- **Frontend**: `kodesonik/process-manager-frontend`

## Required GitHub Secrets

Configure the following secrets in your GitHub repository settings (`Settings > Secrets and variables > Actions`):

### Required Secrets
- `DOCKER_USERNAME`: Your Docker Hub username
- `DOCKER_PASSWORD`: Your Docker Hub access token or password

### Optional Secrets (for frontend build args)
- `NEXT_PUBLIC_API_URL`: API URL for the frontend (default: `http://localhost/api`)
- `NEXT_PUBLIC_APP_NAME`: Application name (default: `Process Manager`)
- `NEXT_PUBLIC_FIREBASE_VAPID_KEY`: Firebase VAPID key for push notifications

## Workflows

### 1. Build and Push (`docker-build.yml`)
**Triggers:**
- Push to `main` or `develop` branches
- Push tags starting with `v`
- Pull requests to `main`

**Features:**
- Builds both frontend and backend images
- Pushes to Docker Hub (except for PRs)
- Security scanning with Trivy
- Multi-architecture support
- Build caching for faster builds

### 2. Release (`docker-release.yml`)
**Triggers:**
- Push tags matching `v*.*.*` or `v*.*.*-*`

**Features:**
- Creates production-ready releases
- Generates multiple tags (latest, major, minor, patch)
- Creates GitHub releases with usage instructions
- Supports pre-release versions

### 3. Cleanup (`docker-cleanup.yml`)
**Triggers:**
- Scheduled (every Sunday at 2 AM UTC)
- Manual dispatch

**Features:**
- Removes old Docker Hub images
- Cleans up GitHub Actions cache
- Keeps the 5 most recent versions

## Production Deployment

### 1. Using Docker Compose (Recommended)

Use the provided `docker-compose.prod.yml` file:

```bash
# Copy environment template
cp env.example .env

# Edit environment variables
nano .env

# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

### 2. Using Docker Run

#### Backend
```bash
docker run -d \
  --name process-manager-backend \
  --network process-manager \
  -p 8080:8080 \
  -e MONGODB_URI="mongodb://admin:password@mongodb:27017/process_manager?authSource=admin" \
  -e REDIS_URL="redis://redis:6379" \
  -e MINIO_ENDPOINT="minio:9000" \
  -e JWT_SECRET="your-jwt-secret" \
  kodesonik/process-manager-backend:latest
```

#### Frontend
```bash
docker run -d \
  --name process-manager-frontend \
  --network process-manager \
  -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL="http://localhost/api" \
  -e NEXTAUTH_SECRET="your-nextauth-secret" \
  kodesonik/process-manager-frontend:latest
```

## Image Tags

Images are tagged with multiple formats:
- `latest`: Latest stable release
- `main`: Latest from main branch
- `develop`: Latest from develop branch
- `v1.2.3`: Specific version
- `v1.2`: Major.minor version
- `v1`: Major version only

## Environment Variables

### Backend Environment Variables
- `PORT`: Server port (default: 8080)
- `MONGODB_URI`: MongoDB connection string
- `REDIS_URL`: Redis connection string
- `MINIO_ENDPOINT`: MinIO server endpoint
- `MINIO_ACCESS_KEY`: MinIO access key
- `MINIO_SECRET_KEY`: MinIO secret key
- `MINIO_BUCKET_NAME`: MinIO bucket name
- `JWT_SECRET`: JWT signing secret
- `CORS_ORIGINS`: Allowed CORS origins
- `SMTP_HOST`: SMTP server host
- `SMTP_PORT`: SMTP server port
- `SMTP_USERNAME`: SMTP username
- `SMTP_PASSWORD`: SMTP password
- `FROM_EMAIL`: From email address
- `FRONTEND_URL`: Frontend URL
- `LOG_LEVEL`: Log level (debug, info, warn, error)
- `DEVELOPMENT_MODE`: Enable development mode (true/false)

### Frontend Environment Variables
- `NEXT_PUBLIC_API_URL`: Backend API URL
- `NEXT_PUBLIC_APP_NAME`: Application name
- `NEXT_PUBLIC_FIREBASE_VAPID_KEY`: Firebase VAPID key
- `NEXTAUTH_URL`: NextAuth.js URL
- `NEXTAUTH_SECRET`: NextAuth.js secret

## Monitoring and Health Checks

All services include health checks:
- Backend: `GET /health`
- Frontend: `GET /`
- Database: MongoDB ping
- Redis: Redis ping
- MinIO: Health endpoint

## Security Considerations

1. **Secrets Management**: Use environment variables or Docker secrets for sensitive data
2. **Network Security**: Use Docker networks to isolate services
3. **Image Scanning**: Trivy scans are performed on all images
4. **Regular Updates**: Keep base images updated
5. **Access Control**: Limit Docker Hub repository access

## Troubleshooting

### Common Issues

1. **Build Failures**: Check GitHub Actions logs for specific errors
2. **Image Pull Errors**: Verify Docker Hub credentials and image availability
3. **Environment Variables**: Ensure all required environment variables are set
4. **Network Issues**: Check Docker network configuration

### Logs
```bash
# View service logs
docker-compose -f docker-compose.prod.yml logs -f [service-name]

# View all logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Health Checks
```bash
# Check service health
docker-compose -f docker-compose.prod.yml ps

# Test individual services
curl http://localhost:8080/health  # Backend
curl http://localhost:3000         # Frontend
```

## Support

For issues or questions:
1. Check the GitHub Actions logs
2. Review the Docker Hub image pages
3. Open an issue in the repository
4. Check the application logs for runtime errors
