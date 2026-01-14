const fs = require('fs');
const path = 'C:/Users/PCS/pms/app/api/projects/[id]/reports/route.ts';
let content = fs.readFileSync(path, 'utf8');

// Add import
if (!content.includes('sendPushToUsers')) {
  content = content.replace(
    "import { cookies } from 'next/headers';",
    "import { cookies } from 'next/headers';\nimport { sendPushToUsers } from '@/lib/firebase';"
  );
  console.log('Added firebase import');
}

// Add push notification after report is created
if (!content.includes('Send push notifications')) {
  const insertPoint = "return NextResponse.json({ report }, { status: 201 });";
  const pushCode = `// Send push notifications to project members (async, don't wait)
    (async () => {
      try {
        // Get project name
        const { data: project } = await supabaseAdmin
          .from('projects')
          .select('name')
          .eq('id', projectId)
          .single();

        // Get project member IDs
        const { data: members } = await supabaseAdmin
          .from('project_members')
          .select('user_id')
          .eq('project_id', projectId);

        const memberIds = members?.map(m => m.user_id) || [];

        // Send notification
        const reporterName = currentUser.full_name || 'Someone';
        const projectName = project?.name || 'a project';

        await sendPushToUsers(supabaseAdmin, memberIds, {
          title: \`New \${type} in \${projectName}\`,
          body: \`\${reporterName}: \${title.substring(0, 50)}\`,
          data: {
            type: 'report',
            projectId: projectId,
            reportId: report.id
          }
        }, currentUser.id);
      } catch (e) {
        console.error('Push notification error:', e);
      }
    })();

    `;

  content = content.replace(insertPoint, pushCode + insertPoint);
  console.log('Added push notification code');
}

fs.writeFileSync(path, content);
console.log('Done!');
