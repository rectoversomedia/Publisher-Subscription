-- Migration: 006_add_reader_phone
-- Add phone column to readers table for complete contact info

ALTER TABLE readers
  ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

-- Index for phone lookups
CREATE INDEX IF NOT EXISTS idx_readers_phone ON readers(phone) WHERE phone IS NOT NULL;

-- Index to find fully-identified readers (has at least 2 of: name, email, phone)
CREATE INDEX IF NOT EXISTS idx_readers_fully_known ON readers(identity_status)
  WHERE identity_status = 'KNOWN';
