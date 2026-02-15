-- Contact Manager Module Migration
-- Tables: contacts, contact_tags, contact_tag_map, contact_remarks, contact_attachments, contact_reminders

-- 1. Main contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(255) NOT NULL,
  nickname VARCHAR(100),
  company VARCHAR(255),
  title VARCHAR(255),
  phones JSONB DEFAULT '[]',
  emails JSONB DEFAULT '[]',
  profile_photo_url TEXT,
  met_at_event VARCHAR(255),
  met_at_location VARCHAR(255),
  met_at_date DATE,
  introduced_by VARCHAR(255),
  birthday DATE,
  anniversary DATE,
  custom_dates JSONB DEFAULT '[]',
  linkedin VARCHAR(255),
  twitter VARCHAR(255),
  instagram VARCHAR(255),
  whatsapp VARCHAR(50),
  website VARCHAR(255),
  is_favorite BOOLEAN DEFAULT false,
  address TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tag definitions
CREATE TABLE IF NOT EXISTS contact_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  color VARCHAR(20) DEFAULT '#3b82f6',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, created_by)
);

-- 3. Many-to-many contact <-> tag
CREATE TABLE IF NOT EXISTS contact_tag_map (
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES contact_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (contact_id, tag_id)
);

-- 4. Timestamped remarks/notes
CREATE TABLE IF NOT EXISTS contact_remarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  content TEXT,
  voice_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Photo/file attachments
CREATE TABLE IF NOT EXISTS contact_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  label VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Follow-up reminders
CREATE TABLE IF NOT EXISTS contact_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  reminder_date DATE NOT NULL,
  cadence VARCHAR(20),
  note TEXT,
  is_done BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contacts_created_by ON contacts(created_by);
CREATE INDEX IF NOT EXISTS idx_contacts_full_name ON contacts(full_name);
CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company);
CREATE INDEX IF NOT EXISTS idx_contact_remarks_contact_id ON contact_remarks(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_attachments_contact_id ON contact_attachments(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_reminders_contact_id ON contact_reminders(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_reminders_date ON contact_reminders(reminder_date) WHERE NOT is_done;
CREATE INDEX IF NOT EXISTS idx_contact_tag_map_contact ON contact_tag_map(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_tag_map_tag ON contact_tag_map(tag_id);
