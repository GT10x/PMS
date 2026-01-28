-- Migration: Add module_features and feature_remarks tables
-- This normalizes features (previously stored as newline-separated text in description)
-- and adds support for rich-media remarks on each feature

-- Table 1: Individual features for each module
CREATE TABLE IF NOT EXISTS module_features (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES project_modules(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for module_features
CREATE INDEX IF NOT EXISTS idx_module_features_module_id ON module_features(module_id);
CREATE INDEX IF NOT EXISTS idx_module_features_sort_order ON module_features(module_id, sort_order);

-- Table 2: Remarks for each feature (supports text, links, images, voice notes)
CREATE TABLE IF NOT EXISTS feature_remarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_id UUID NOT NULL REFERENCES module_features(id) ON DELETE CASCADE,
  content TEXT, -- Text content (can include links)
  file_url TEXT, -- URL for uploaded images or voice notes
  file_type VARCHAR(20) CHECK (file_type IN ('image', 'voice') OR file_type IS NULL),
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for feature_remarks
CREATE INDEX IF NOT EXISTS idx_feature_remarks_feature_id ON feature_remarks(feature_id);
CREATE INDEX IF NOT EXISTS idx_feature_remarks_sort_order ON feature_remarks(feature_id, sort_order);

-- Grant permissions
GRANT ALL ON module_features TO authenticated;
GRANT ALL ON module_features TO anon;
GRANT ALL ON feature_remarks TO authenticated;
GRANT ALL ON feature_remarks TO anon;

-- Migration function to move existing features from description to module_features table
-- Run this after creating the tables to migrate existing data
DO $$
DECLARE
  module_record RECORD;
  feature_line TEXT;
  feature_lines TEXT[];
  line_index INTEGER;
  clean_line TEXT;
BEGIN
  -- Loop through all modules that have descriptions
  FOR module_record IN
    SELECT id, description, created_by FROM project_modules WHERE description IS NOT NULL AND description != ''
  LOOP
    -- Split description by newlines
    feature_lines := string_to_array(module_record.description, E'\n');
    line_index := 0;

    -- Insert each non-empty line as a feature
    FOREACH feature_line IN ARRAY feature_lines
    LOOP
      -- Trim and clean the line (remove bullet prefixes like •, -, *, numbers)
      clean_line := TRIM(feature_line);
      clean_line := REGEXP_REPLACE(clean_line, '^[•\-\*\d\.]+\s*', '');
      clean_line := TRIM(clean_line);

      -- Only insert if line has content
      IF clean_line != '' THEN
        INSERT INTO module_features (module_id, name, sort_order, created_by, created_at)
        VALUES (module_record.id, clean_line, line_index, module_record.created_by, NOW());
        line_index := line_index + 1;
      END IF;
    END LOOP;
  END LOOP;
END $$;
