const { Client } = require('pg');

async function runMigration() {
  const client = new Client({
    connectionString: 'postgresql://postgres:jp3VGp02fXhSwgNI@db.loihxoyrutbzmqscdknk.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // 1. contacts
    console.log('Creating contacts table...');
    await client.query(`
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
      )
    `);
    console.log('✓ contacts');

    // 2. contact_tags
    console.log('Creating contact_tags table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS contact_tags (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        color VARCHAR(20) DEFAULT '#3b82f6',
        created_by UUID NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(name, created_by)
      )
    `);
    console.log('✓ contact_tags');

    // 3. contact_tag_map
    console.log('Creating contact_tag_map table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS contact_tag_map (
        contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
        tag_id UUID REFERENCES contact_tags(id) ON DELETE CASCADE,
        PRIMARY KEY (contact_id, tag_id)
      )
    `);
    console.log('✓ contact_tag_map');

    // 4. contact_remarks
    console.log('Creating contact_remarks table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS contact_remarks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
        content TEXT,
        voice_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✓ contact_remarks');

    // 5. contact_attachments
    console.log('Creating contact_attachments table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS contact_attachments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
        file_url TEXT NOT NULL,
        label VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✓ contact_attachments');

    // 6. contact_reminders
    console.log('Creating contact_reminders table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS contact_reminders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
        reminder_date DATE NOT NULL,
        cadence VARCHAR(20),
        note TEXT,
        is_done BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✓ contact_reminders');

    // Indexes
    console.log('Creating indexes...');
    await client.query(`CREATE INDEX IF NOT EXISTS idx_contacts_created_by ON contacts(created_by)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_contacts_full_name ON contacts(full_name)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_contact_remarks_contact_id ON contact_remarks(contact_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_contact_attachments_contact_id ON contact_attachments(contact_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_contact_reminders_contact_id ON contact_reminders(contact_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_contact_reminders_date ON contact_reminders(reminder_date) WHERE NOT is_done`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_contact_tag_map_contact ON contact_tag_map(contact_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_contact_tag_map_tag ON contact_tag_map(tag_id)`);
    console.log('✓ All indexes created');

    console.log('\n========================================');
    console.log('Contact Manager migration completed!');
    console.log('========================================');

  } catch (error) {
    console.error('Migration error:', error.message);
  } finally {
    await client.end();
  }
}

runMigration();
