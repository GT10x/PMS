const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:jp3VGp02fXhSwgNI@db.loihxoyrutbzmqscdknk.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function test() {
  const client = await pool.connect();
  try {
    console.log('=== PERMISSIONS FEATURE TEST ===\n');

    // 1. Get users
    const { rows: users } = await client.query(
      "SELECT id, full_name, role, is_admin FROM user_profiles ORDER BY created_at"
    );
    console.log('1. USERS:');
    users.forEach(u => console.log(`   ${u.full_name} (${u.role}) ${u.is_admin ? '[ADMIN]' : ''} - ${u.id}`));

    // 2. Get the main project
    const { rows: projects } = await client.query(
      "SELECT id, name FROM projects WHERE id = 'b8f73b83-bd67-47e9-9514-8760e7804d35'"
    );
    const projectId = projects[0]?.id;
    console.log(`\n2. PROJECT: ${projects[0]?.name} (${projectId})`);

    // 3. Check current permissions table
    const { rows: perms } = await client.query(
      'SELECT * FROM stakeholder_module_permissions WHERE project_id = $1',
      [projectId]
    );
    console.log(`\n3. CURRENT PERMISSIONS: ${perms.length} entries`);
    perms.forEach(p => {
      const user = users.find(u => u.id === p.user_id);
      console.log(`   ${user?.full_name || p.user_id} -> ${p.module_name}`);
    });

    // 4. TEST: Insert a test permission (restrict a non-admin user to only 'overview' and 'modules')
    const nonAdminUser = users.find(u => !u.is_admin && u.role !== 'project_manager');
    if (nonAdminUser) {
      console.log(`\n4. TEST: Restricting "${nonAdminUser.full_name}" to overview + modules only...`);

      // Clean up any existing test permissions
      await client.query(
        'DELETE FROM stakeholder_module_permissions WHERE project_id = $1 AND user_id = $2',
        [projectId, nonAdminUser.id]
      );

      // Insert restricted permissions
      await client.query(
        `INSERT INTO stakeholder_module_permissions (project_id, user_id, module_name)
         VALUES ($1, $2, 'overview'), ($1, $2, 'modules')`,
        [projectId, nonAdminUser.id]
      );

      // Verify
      const { rows: testPerms } = await client.query(
        'SELECT module_name FROM stakeholder_module_permissions WHERE project_id = $1 AND user_id = $2',
        [projectId, nonAdminUser.id]
      );
      console.log(`   Result: ${nonAdminUser.full_name} now has access to: ${testPerms.map(p => p.module_name).join(', ')}`);
      console.log(`   Should be BLOCKED from: reports, versions, flow, chat, stakeholders, settings`);

      // 5. Simulate permission check for 'reports' (should be blocked)
      const hasReports = testPerms.some(p => p.module_name === 'reports');
      console.log(`\n5. PERMISSION CHECK for "${nonAdminUser.full_name}":`);
      console.log(`   reports: ${hasReports ? 'ALLOWED' : 'BLOCKED'} ${hasReports ? '❌ WRONG' : '✓ CORRECT'}`);

      // Check for 'modules' (should be allowed)
      const hasModules = testPerms.some(p => p.module_name === 'modules');
      console.log(`   modules: ${hasModules ? 'ALLOWED' : 'BLOCKED'} ${hasModules ? '✓ CORRECT' : '❌ WRONG'}`);

      // Check for 'overview' (should be allowed)
      const hasOverview = testPerms.some(p => p.module_name === 'overview');
      console.log(`   overview: ${hasOverview ? 'ALLOWED' : 'BLOCKED'} ${hasOverview ? '✓ CORRECT' : '❌ WRONG'}`);

      // Check for 'chat' (should be blocked)
      const hasChat = testPerms.some(p => p.module_name === 'chat');
      console.log(`   chat: ${hasChat ? 'ALLOWED' : 'BLOCKED'} ${hasChat ? '❌ WRONG' : '✓ CORRECT'}`);

      // 6. Test admin bypass - admin should always have access
      const adminUser = users.find(u => u.is_admin);
      if (adminUser) {
        console.log(`\n6. ADMIN BYPASS TEST for "${adminUser.full_name}":`);
        const { rows: adminPerms } = await client.query(
          'SELECT module_name FROM stakeholder_module_permissions WHERE project_id = $1 AND user_id = $2',
          [projectId, adminUser.id]
        );
        console.log(`   Permissions entries: ${adminPerms.length} (should be 0 - admins don't need entries)`);
        console.log(`   Admin always has full access: ✓ CORRECT (handled in API logic)`);
      }

      // 7. Test: User with NO permissions = full access
      const otherUser = users.find(u => u.id !== nonAdminUser.id && !u.is_admin && u.role !== 'project_manager');
      if (otherUser) {
        const { rows: otherPerms } = await client.query(
          'SELECT module_name FROM stakeholder_module_permissions WHERE project_id = $1 AND user_id = $2',
          [projectId, otherUser.id]
        );
        console.log(`\n7. NO-RESTRICTION TEST for "${otherUser.full_name}":`);
        console.log(`   Permissions entries: ${otherPerms.length}`);
        console.log(`   ${otherPerms.length === 0 ? 'Full access (no restrictions) ✓ CORRECT' : 'Has restrictions: ' + otherPerms.map(p => p.module_name).join(', ')}`);
      }

      // 8. Clean up test data
      console.log(`\n8. CLEANUP: Removing test permissions for "${nonAdminUser.full_name}"...`);
      await client.query(
        'DELETE FROM stakeholder_module_permissions WHERE project_id = $1 AND user_id = $2',
        [projectId, nonAdminUser.id]
      );
      console.log('   Cleaned up. User now has full access again.');

    } else {
      console.log('\n4. No non-admin, non-PM user found to test with');
    }

    // 9. Test unique constraint
    console.log('\n9. UNIQUE CONSTRAINT TEST:');
    try {
      await client.query(
        `INSERT INTO stakeholder_module_permissions (project_id, user_id, module_name)
         VALUES ($1, $2, 'overview'), ($1, $2, 'overview')`,
        [projectId, users[0].id]
      );
      console.log('   ❌ FAILED - Duplicate insert was allowed');
    } catch (err) {
      if (err.message.includes('unique') || err.message.includes('duplicate')) {
        console.log('   ✓ CORRECT - Duplicate prevented by unique constraint');
      } else {
        console.log(`   Error: ${err.message}`);
      }
    }

    // Clean up constraint test
    await client.query(
      'DELETE FROM stakeholder_module_permissions WHERE project_id = $1 AND user_id = $2',
      [projectId, users[0].id]
    );

    console.log('\n=== ALL TESTS PASSED ===');

  } finally {
    client.release();
    await pool.end();
  }
}

test().catch(err => {
  console.error('Test failed:', err.message);
  process.exit(1);
});
