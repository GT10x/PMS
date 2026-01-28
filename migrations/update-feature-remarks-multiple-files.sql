-- Migration: Update feature_remarks to support both image AND voice note in same remark
-- Add separate columns for image_url and voice_url

-- Add new columns
ALTER TABLE feature_remarks ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE feature_remarks ADD COLUMN IF NOT EXISTS voice_url TEXT;

-- Migrate existing data from file_url to appropriate new column
UPDATE feature_remarks
SET image_url = file_url
WHERE file_type = 'image' AND file_url IS NOT NULL;

UPDATE feature_remarks
SET voice_url = file_url
WHERE file_type = 'voice' AND file_url IS NOT NULL;

-- Note: Keeping file_url and file_type for backward compatibility
-- They can be dropped later after confirming migration is successful
