-- Migration: 005_add_reader_name_email
-- Add name and email fields to readers table for personalized display

ALTER TABLE readers
  ADD COLUMN IF NOT EXISTS name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Optional: Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_readers_email ON readers(email) WHERE email IS NOT NULL;

-- Optional: Create index for name searches
CREATE INDEX IF NOT EXISTS idx_readers_name ON readers(name) WHERE name IS NOT NULL;
