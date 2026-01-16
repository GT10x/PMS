const fs = require('fs');
const filePath = 'C:/Users/PCS/pms/app/api/projects/route.ts';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add project_roles to the select query
content = content.replace(
  `// Get all project members with user details
    const { data: projectMembers, error: membersError } = await supabaseAdmin
      .from('project_members')
      .select(\`
        project_id,
        user_id,
        role,
        user_profiles (
          id,
          full_name,
          role
        )
      \`);`,
  `// Get all project members with user details
    const { data: projectMembers, error: membersError } = await supabaseAdmin
      .from('project_members')
      .select(\`
        project_id,
        user_id,
        role,
        project_roles,
        user_profiles (
          id,
          full_name,
          role
        )
      \`);`
);

// 2. Include project_roles in the mapping
content = content.replace(
  `.map(pm => ({
          user_id: pm.user_id,
          full_name: pm.user_profiles?.full_name || 'Unknown',
          role: pm.user_profiles?.role || 'Unknown'
        }))`,
  `.map(pm => ({
          user_id: pm.user_id,
          full_name: pm.user_profiles?.full_name || 'Unknown',
          role: pm.user_profiles?.role || 'Unknown',
          project_roles: pm.project_roles || []
        }))`
);

// 3. Update POST to support new format with project_roles
content = content.replace(
  `// Assign team members
    if (team_members && team_members.length > 0) {
      const memberInserts = team_members.map((userId: string) => ({
        project_id: project.id,
        user_id: userId,
        role: null
      }));`,
  `// Assign team members
    // team_members can be either:
    // - Array of user IDs (legacy): ["user1", "user2"]
    // - Array of objects with roles: [{user_id: "user1", project_roles: ["tester", "developer"]}]
    if (team_members && team_members.length > 0) {
      const memberInserts = team_members.map((member: string | { user_id: string; project_roles?: string[] }) => {
        if (typeof member === 'string') {
          return {
            project_id: project.id,
            user_id: member,
            role: null,
            project_roles: []
          };
        } else {
          return {
            project_id: project.id,
            user_id: member.user_id,
            role: null,
            project_roles: member.project_roles || []
          };
        }
      });`
);

fs.writeFileSync(filePath, content);
console.log('Updated projects API with project_roles support');
