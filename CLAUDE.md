# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Process Manager application for telecommunications companies, designed to digitize and manage procedural documentation. The system allows collaborative creation of processes through multi-step forms, with features for digital signatures, PDF export, and monthly performance validation through incident reports.

## Architecture

- **Backend**: Go/Gin with MongoDB, Redis, JWT authentication
- **Frontend**: Next.js 14 with Shadcn UI and Tailwind CSS
- **Storage**: MinIO for object storage
- **Infrastructure**: Full Docker containerization

## Contributing Workflow

All development follows a GitHub issue-based workflow:

1. **Issue Creation**: All features, bugs, and improvements start with a GitHub issue
2. **Branch Creation**: Create a work branch linked to the issue using this naming convention:
   - `feature/issue-{number}-{brief-description}` for new features
   - `bugfix/issue-{number}-{brief-description}` for bug fixes
   - `docs/issue-{number}-{brief-description}` for documentation updates

3. **Development**: Work on the feature/fix in your branch
4. **Pull Request**: When finished, create a PR that references the issue
5. **Review & Merge**: PR gets reviewed and merged after approval

### Branch Examples
```
feature/issue-23-user-authentication
bugfix/issue-15-pdf-export-error
docs/issue-8-api-documentation
```

## Domain Context

This project is related to telecommunications process management, specifically for Togocom's infrastructure including:
- Process documentation and validation
- Network surveillance procedures
- Service restoration workflows
- Performance metrics tracking
- Multi-level approval systems