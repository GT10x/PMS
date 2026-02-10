const { Client } = require('pg');

async function runMigration() {
  const connectionAttempts = [
    'postgresql://postgres:jp3VGp02fXhSwgNI@db.loihxoyrutbzmqscdknk.supabase.co:5432/postgres',
  ];

  let client = null;

  for (const connString of connectionAttempts) {
    try {
      console.log('Trying connection...');
      client = new Client({
        connectionString: connString,
        ssl: { rejectUnauthorized: false }
      });
      await client.connect();
      console.log('Connected successfully!');
      break;
    } catch (err) {
      console.log('Connection failed:', err.message);
      client = null;
    }
  }

  if (!client) {
    console.error('Could not connect to database');
    process.exit(1);
  }

  try {
    // 1. Create qa_questions table
    console.log('Creating qa_questions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS qa_questions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        question_id VARCHAR(10) NOT NULL,
        question_text TEXT NOT NULL,
        topic VARCHAR(100) NOT NULL,
        priority VARCHAR(10) NOT NULL DEFAULT 'should',
        assigned_to UUID REFERENCES user_profiles(id),
        context TEXT,
        cto_response TEXT,
        answer_text TEXT,
        answer_status VARCHAR(20) NOT NULL DEFAULT 'pending',
        deferred_to VARCHAR(100),
        deferred_note TEXT,
        parent_question_id UUID,
        round VARCHAR(50),
        sort_order INTEGER NOT NULL DEFAULT 0,
        answered_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    console.log('✓ Created qa_questions table');

    // 2. Create qa_comments table
    console.log('Creating qa_comments table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS qa_comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        question_id UUID NOT NULL REFERENCES qa_questions(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES user_profiles(id),
        content TEXT NOT NULL,
        is_cto_response BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    console.log('✓ Created qa_comments table');

    // 3. Create indexes
    console.log('Creating indexes...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_qa_questions_project ON qa_questions(project_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_qa_questions_assigned ON qa_questions(assigned_to);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_qa_questions_status ON qa_questions(project_id, answer_status);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_qa_questions_topic ON qa_questions(project_id, topic);');
    await client.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_qa_questions_qid ON qa_questions(project_id, question_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_qa_comments_question ON qa_comments(question_id);');
    console.log('✓ Created indexes');

    // 4. Add self-referencing FK for parent_question_id (after table exists)
    console.log('Adding parent_question_id FK...');
    try {
      await client.query(`
        ALTER TABLE qa_questions
        ADD CONSTRAINT fk_qa_parent_question
        FOREIGN KEY (parent_question_id) REFERENCES qa_questions(id) ON DELETE SET NULL;
      `);
      console.log('✓ Added parent FK');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('  (FK already exists, skipping)');
      } else {
        console.log('  Warning:', e.message);
      }
    }

    // 5. Updated_at trigger
    console.log('Creating triggers...');
    try {
      await client.query(`
        CREATE TRIGGER update_qa_questions_updated_at
          BEFORE UPDATE ON qa_questions
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      `);
      console.log('✓ Created qa_questions trigger');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('  (trigger already exists, skipping)');
      } else {
        console.log('  Warning:', e.message);
      }
    }

    try {
      await client.query(`
        CREATE TRIGGER update_qa_comments_updated_at
          BEFORE UPDATE ON qa_comments
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      `);
      console.log('✓ Created qa_comments trigger');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('  (trigger already exists, skipping)');
      } else {
        console.log('  Warning:', e.message);
      }
    }

    // 6. Enable RLS
    console.log('Enabling RLS...');
    await client.query('ALTER TABLE qa_questions ENABLE ROW LEVEL SECURITY;');
    await client.query('ALTER TABLE qa_comments ENABLE ROW LEVEL SECURITY;');

    // Create permissive policies (PMS uses service role key, so RLS is bypassed in API)
    await client.query('DROP POLICY IF EXISTS "Allow all access to qa_questions" ON qa_questions;');
    await client.query(`CREATE POLICY "Allow all access to qa_questions" ON qa_questions FOR ALL USING (true) WITH CHECK (true);`);
    await client.query('DROP POLICY IF EXISTS "Allow all access to qa_comments" ON qa_comments;');
    await client.query(`CREATE POLICY "Allow all access to qa_comments" ON qa_comments FOR ALL USING (true) WITH CHECK (true);`);
    console.log('✓ Enabled RLS with permissive policies');

    console.log('\n✅ Q&A migration completed successfully!');
  } finally {
    await client.end();
  }
}

runMigration().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
