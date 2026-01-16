const fs = require('fs');
const filePath = 'C:/Users/PCS/pms/app/api/projects/[id]/route.ts';
let content = fs.readFileSync(filePath, 'utf8');

const oldCode = `    // Update team members only if team_members array is provided in the request
    if (team_members !== undefined) {
      // Delete all existing members for this project
      const { error: deleteError } = await supabaseAdmin
        .from('project_members')
        .delete()
        .eq('project_id', id);

      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
      }

      // Insert new members if any are provided
      if (Array.isArray(team_members) && team_members.length > 0) {
        const memberInserts = team_members.map((userId: string) => ({
          project_id: id,
          user_id: userId,
          role: null
        }));

        const { error: membersError } = await supabaseAdmin
          .from('project_members')
          .insert(memberInserts);

        if (membersError) {
          return NextResponse.json({ error: membersError.message }, { status: 500 });
        }
      }
    }`;

const newCode = `    // Update team members only if team_members array is provided in the request
    // team_members can be either:
    // - Array of user IDs (legacy): ["user1", "user2"]
    // - Array of objects with roles: [{user_id: "user1", project_roles: ["tester", "developer"]}]
    if (team_members !== undefined) {
      // Delete all existing members for this project
      const { error: deleteError } = await supabaseAdmin
        .from('project_members')
        .delete()
        .eq('project_id', id);

      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
      }

      // Insert new members if any are provided
      if (Array.isArray(team_members) && team_members.length > 0) {
        const memberInserts = team_members.map((member: string | { user_id: string; project_roles?: string[] }) => {
          // Support both legacy format (just user_id string) and new format (object with roles)
          if (typeof member === 'string') {
            return {
              project_id: id,
              user_id: member,
              role: null,
              project_roles: []
            };
          } else {
            return {
              project_id: id,
              user_id: member.user_id,
              role: null,
              project_roles: member.project_roles || []
            };
          }
        });

        const { error: membersError } = await supabaseAdmin
          .from('project_members')
          .insert(memberInserts);

        if (membersError) {
          return NextResponse.json({ error: membersError.message }, { status: 500 });
        }
      }
    }`;

content = content.replace(oldCode, newCode);
fs.writeFileSync(filePath, content);
console.log('Updated project API');
