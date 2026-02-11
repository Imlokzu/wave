# Database Migrations

This directory contains SQL migration scripts for the Wave database.

## Current Migrations

- `001_add_clerk_id_to_users.sql` - Adds clerk_id column to flux_users table for Clerk authentication integration

## Running Migrations

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy the contents of the migration file (e.g., `001_add_clerk_id_to_users.sql`)
5. Paste into the SQL editor
6. Click **Run** or press `Ctrl+Enter`
7. Check the output for success messages

### Option 2: Using Supabase CLI

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Link to your project (first time only)
supabase link --project-ref YOUR_PROJECT_REF

# Run migration
supabase db push
```

### Option 3: Using psql

```bash
# Connect to your Supabase database
# Get connection string from: Project Settings > Database > Connection string
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Run migration
\i backend/migrations/001_add_clerk_id_to_users.sql
```

## Migration Notes

### 001_add_clerk_id_to_users.sql

This migration adds Clerk authentication support to the Wave database:

- **Table**: `flux_users` (not `users` - Wave uses `flux_users` to avoid conflicts)
- **Column**: `clerk_id VARCHAR(255) UNIQUE`
- **Index**: `idx_flux_users_clerk_id` for fast lookups
- **Behavior**: Existing users will have `NULL` clerk_id initially
- **Auto-assignment**: Users will be assigned clerk_id on their next sign-in

**Before running this migration**, ensure:
1. You have the correct Clerk Secret Key in your `.env` file
2. Your backend is updated to use `@clerk/express`
3. You've tested the migration on a development database first

## Troubleshooting

### Error: relation "users" does not exist

This means you're using the wrong table name. Wave uses `flux_users`, not `users`. The migration has been updated to use the correct table name.

### Error: column "clerk_id" already exists

This is safe to ignore - the migration uses `IF NOT EXISTS` to prevent errors if the column already exists.

### Error: permission denied

Make sure you're connected as a user with sufficient privileges (typically the `postgres` user).

## Best Practices

1. **Always backup** your database before running migrations
2. **Test on development** database first
3. **Run migrations sequentially** in order (001, 002, 003, etc.)
4. **Verify success** by checking the output messages
5. **Document changes** in this README when adding new migrations
