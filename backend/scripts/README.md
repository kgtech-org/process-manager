# Database Migration Scripts

This directory contains database migration scripts for the Process Manager application.

## Name Field Migration

This migration splits the single `name` field into `firstName` and `lastName` fields.

### Prerequisites

- MongoDB instance running and accessible
- Go 1.23 or higher installed
- MongoDB credentials (if authentication is enabled)

### Running the Migration

1. **Update the MongoDB Schema** (Required first step):
   ```bash
   export MONGODB_URI="mongodb://admin:password@localhost:27017/process_manager?authSource=admin"
   export MONGODB_DATABASE="process_manager"
   go run scripts/update_schema.go
   ```

2. **Run the Name Migration**:
   ```bash
   # From the backend directory
   ./scripts/run_migration.sh
   ```

   Or manually:
   ```bash
   export MONGODB_URI="mongodb://admin:password@localhost:27017/process_manager?authSource=admin"
   export MONGODB_DATABASE="process_manager"
   go run scripts/migrate_names.go
   ```

### What the Migration Does

1. **Schema Update** (`update_schema.go`):
   - Removes the old MongoDB schema validation that required `name` field
   - Creates new validation that requires `first_name` and `last_name` fields
   - Sets field constraints (2-50 characters for both fields)

2. **Data Migration** (`migrate_names.go`):
   - Finds all users with the old `name` field
   - Splits the name into `firstName` and `lastName`:
     - If name has multiple words: first word becomes firstName, rest becomes lastName
     - If name has one word: uses it for both firstName and lastName
   - Updates each user document with new fields
   - Removes the old `name` field
   - Updates the `updated_at` timestamp

### Example Transformations

- `"John Doe"` → firstName: `"John"`, lastName: `"Doe"`
- `"Maria Garcia Lopez"` → firstName: `"Maria"`, lastName: `"Garcia Lopez"`
- `"Admin"` → firstName: `"Admin"`, lastName: `"Admin"`

### Environment Variables

- `MONGODB_URI`: MongoDB connection string (default: `mongodb://localhost:27017`)
- `MONGODB_DATABASE`: Database name (default: `process_manager`)

### Rollback

If you need to rollback the migration:

1. The old `name` field is removed, so you'll need to restore from backup
2. Or manually reconstruct the `name` field by concatenating `firstName` and `lastName`

### Verification

After running the migration, verify the results:

```bash
# Connect to MongoDB
mongosh mongodb://admin:password@localhost:27017/process_manager?authSource=admin

# Check users
db.users.find({}, {firstName: 1, lastName: 1, email: 1})

# Verify no 'name' field exists
db.users.find({name: {$exists: true}}).count()  // Should return 0
```

## Migration History

| Date | Script | Description | Users Affected |
|------|--------|-------------|----------------|
| 2025-10-12 | migrate_names.go | Split name into firstName/lastName | 3 |
