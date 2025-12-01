// Script to create a test user and assign them to existing projects
// This helps test the project tabs feature for non-admin users

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('🔧 Creating test user and assigning to projects...\n');

  // Step 1: Get all existing projects
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, name')
    .limit(3);

  if (projectsError) {
    console.error('❌ Error fetching projects:', projectsError.message);
    return;
  }

  if (!projects || projects.length === 0) {
    console.error('❌ No projects found. Please create at least one project first.');
    return;
  }

  console.log(`✅ Found ${projects.length} project(s):`);
  projects.forEach(p => console.log(`   - ${p.name} (${p.id})`));
  console.log();

  // Step 2: Check if test user already exists
  const { data: existingUser } = await supabase
    .from('user_profiles')
    .select('id, username, full_name')
    .eq('username', 'testdev')
    .single();

  let userId;

  if (existingUser) {
    console.log(`✅ Test user already exists: ${existingUser.full_name} (${existingUser.username})`);
    userId = existingUser.id;
  } else {
    // Create test user
    const passwordHash = await bcrypt.hash('test123', 10);

    const { data: newUser, error: userError } = await supabase
      .from('user_profiles')
      .insert({
        username: 'testdev',
        full_name: 'Test Developer',
        email: 'testdev@example.com',
        role: 'developer',
        is_admin: false,
        password_hash: passwordHash
      })
      .select()
      .single();

    if (userError) {
      console.error('❌ Error creating user:', userError.message);
      return;
    }

    console.log(`✅ Created test user: ${newUser.full_name} (${newUser.username})`);
    console.log(`   Login credentials: username=testdev, password=test123`);
    userId = newUser.id;
  }

  console.log();

  // Step 3: Assign user to all projects
  for (const project of projects) {
    // Check if already assigned
    const { data: existingMembership } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', project.id)
      .eq('user_id', userId)
      .single();

    if (existingMembership) {
      console.log(`⏭️  User already assigned to: ${project.name}`);
    } else {
      const { error: memberError } = await supabase
        .from('project_members')
        .insert({
          project_id: project.id,
          user_id: userId,
          role: null
        });

      if (memberError) {
        console.error(`❌ Error assigning to ${project.name}:`, memberError.message);
      } else {
        console.log(`✅ Assigned user to: ${project.name}`);
      }
    }
  }

  console.log('\n✅ Setup complete!');
  console.log('\n📝 Next steps:');
  console.log('1. Logout from your current admin account');
  console.log('2. Login with: username=testdev, password=test123');
  console.log('3. You should see project tab buttons on the dashboard');
  console.log('4. Open browser console (F12) to see debug logs');
}

main().catch(console.error);
