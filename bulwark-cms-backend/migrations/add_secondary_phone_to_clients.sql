-- Add secondary_phone column to clients table
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS secondary_phone VARCHAR(20);

