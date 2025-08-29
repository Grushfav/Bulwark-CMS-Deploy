# Database Migrations

## Migration: Add deletedAt Field

### File: `add_deleted_at_field.sql`

This migration adds a `deletedAt` field to the `users` table to distinguish between suspended and deleted users.

### What it does:

1. **Adds `deletedAt` column**: A timestamp field that is NULL for active/suspended users and contains a timestamp for deleted users
2. **Updates existing data**: Sets all existing users to have NULL `deletedAt` (meaning they are not deleted)
3. **Adds documentation**: Comments explaining the field's purpose

### How to run:

```bash
# Connect to your PostgreSQL database
psql -U your_username -d your_database_name

# Run the migration
\i migrations/add_deleted_at_field.sql

# Or run directly from command line:
psql -U your_username -d your_database_name -f migrations/add_deleted_at_field.sql
```

### After running the migration:

1. **Restart your backend server** to pick up the schema changes
2. **Test the functionality**:
   - Suspend a user (should show "Suspended" status)
   - Delete a user (should disappear from team management)
   - Go to Profile → Users to reactivate deleted users

### Rollback (if needed):

```sql
-- Remove the deletedAt column
ALTER TABLE users DROP COLUMN IF EXISTS deleted_at;
```

### Important Notes:

- This is a **backward-compatible** change
- Existing suspended users will continue to work as before
- The `isActive` field behavior remains unchanged
- Only the DELETE operation now sets `deletedAt` timestamp
