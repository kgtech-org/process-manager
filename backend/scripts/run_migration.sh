#!/bin/bash

# Migration script to split name field into firstName and lastName
# This script can be run from the backend directory or scripts directory

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}================================${NC}"
echo -e "${YELLOW}Name Field Migration Script${NC}"
echo -e "${YELLOW}================================${NC}\n"

# Check if we're in the right directory
if [ ! -f "go.mod" ] && [ ! -f "../go.mod" ]; then
    echo -e "${RED}Error: This script must be run from the backend directory or scripts directory${NC}"
    exit 1
fi

# Navigate to backend directory if we're in scripts
if [ -f "../go.mod" ]; then
    cd ..
fi

echo -e "${GREEN}Building migration tool...${NC}"
go build -o bin/migrate_names ./scripts/migrate_names.go

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to build migration tool${NC}"
    exit 1
fi

echo -e "${GREEN}Migration tool built successfully${NC}\n"

# Check if MongoDB connection info is available
if [ -z "$MONGODB_URI" ]; then
    echo -e "${YELLOW}Warning: MONGODB_URI not set, using default: mongodb://localhost:27017${NC}"
fi

if [ -z "$MONGODB_DATABASE" ]; then
    echo -e "${YELLOW}Warning: MONGODB_DATABASE not set, using default: process_manager${NC}"
fi

echo -e "\n${YELLOW}Starting migration...${NC}\n"

# Run the migration
./bin/migrate_names

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✓ Migration completed successfully!${NC}"

    # Clean up
    echo -e "\n${GREEN}Cleaning up...${NC}"
    rm bin/migrate_names
    echo -e "${GREEN}✓ Done${NC}\n"
else
    echo -e "\n${RED}✗ Migration failed${NC}"
    exit 1
fi
