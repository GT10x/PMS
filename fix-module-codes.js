const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:jp3VGp02fXhSwgNI@db.loihxoyrutbzmqscdknk.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function fix() {
  const client = await pool.connect();
  try {
    console.log('Connected. Fixing duplicate module codes...');

    // Get all projects
    const { rows: projects } = await client.query('SELECT DISTINCT project_id FROM project_modules');

    for (const { project_id } of projects) {
      // Get all modules for this project ordered by created_at
      const { rows: modules } = await client.query(
        'SELECT id, code, name, created_at FROM project_modules WHERE project_id = $1 ORDER BY created_at ASC',
        [project_id]
      );

      console.log(`\nProject ${project_id}: ${modules.length} modules`);
      modules.forEach(m => console.log(`  ${m.code} - ${m.name}`));

      // Find duplicates
      const codeCounts = {};
      modules.forEach(m => {
        if (m.code) {
          codeCounts[m.code] = (codeCounts[m.code] || 0) + 1;
        }
      });

      const duplicates = Object.entries(codeCounts).filter(([_, count]) => count > 1);
      if (duplicates.length === 0) {
        console.log('  No duplicates found');
        continue;
      }

      console.log(`  Duplicates found: ${duplicates.map(([code, count]) => `${code}(${count}x)`).join(', ')}`);

      // Reassign codes sequentially based on created_at order
      let nextNum = 1;
      for (const mod of modules) {
        const newCode = `M${nextNum}`;
        if (mod.code !== newCode) {
          await client.query('UPDATE project_modules SET code = $1 WHERE id = $2', [newCode, mod.id]);
          console.log(`  Updated ${mod.name}: ${mod.code} -> ${newCode}`);
        }
        nextNum++;
      }
    }

    console.log('\nDone!');
  } finally {
    client.release();
    await pool.end();
  }
}

fix().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
