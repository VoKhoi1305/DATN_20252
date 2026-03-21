-- Add address column to geofences table for storing the human-readable address
ALTER TABLE geofences ADD COLUMN IF NOT EXISTS address TEXT;
