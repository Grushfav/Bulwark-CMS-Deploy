-- Migration: Add deletedAt field to users table
-- This field distinguishes between suspended and deleted users

-- Add the deletedAt column
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Update existing users to have NULL deletedAt (meaning they are not deleted)
UPDATE users SET deleted_at = NULL WHERE deleted_at IS NULL;

-- Add a comment to explain the field
COMMENT ON COLUMN users.deleted_at IS 'Timestamp when user was deleted. NULL = active/suspended, timestamp = deleted';
