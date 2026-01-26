const { Client } = require('pg');

async function createRemarkRepliesTable() {
  const client = new Client({
    connectionString: 'postgresql://postgres:jp3VGp02fXhSwgNI@db.loihxoyrutbzmqscdknk.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database\n');

    // Create remark_replies table
    console.log('Creating remark_replies table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS remark_replies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        remark_id UUID NOT NULL REFERENCES feature_remarks(id) ON DELETE CASCADE,
        content TEXT,
        voice_url TEXT,
        image_url TEXT,
        created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('✓ remark_replies table created');

    // Create index for faster lookups
    console.log('\nCreating index on remark_id...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_remark_replies_remark_id ON remark_replies(remark_id);
    `);
    console.log('✓ Index created');

    // Enable RLS
    console.log('\nEnabling Row Level Security...');
    await client.query(`
      ALTER TABLE remark_replies ENABLE ROW LEVEL SECURITY;
    `);

    // Create RLS policy for authenticated access
    await client.query(`
      DROP POLICY IF EXISTS "Allow all access to remark_replies" ON remark_replies;
      CREATE POLICY "Allow all access to remark_replies" ON remark_replies
        FOR ALL USING (true) WITH CHECK (true);
    `);
    console.log('✓ RLS enabled with open policy');

    // Enable realtime for this table
    console.log('\nEnabling Realtime for remark_replies...');
    await client.query(`
      ALTER PUBLICATION supabase_realtime ADD TABLE remark_replies;
    `);
    console.log('✓ Realtime enabled');

    // Verify table structure
    const { rows } = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'remark_replies'
      ORDER BY ordinal_position;
    `);

    console.log('\nTable structure:');
    rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(required)' : '(optional)'}`);
    });

    console.log('\n✓ Migration complete!');

  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('Table or index already exists, skipping...');
    } else if (error.message.includes('already member')) {
      console.log('Table already in realtime publication');
    } else {
      console.error('Error:', error.message);
    }
  } finally {
    await client.end();
  }
}

createRemarkRepliesTable();
