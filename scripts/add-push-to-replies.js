const fs = require('fs');
const path = 'C:/Users/PCS/pms/app/api/reports/[reportId]/replies/route.ts';
let content = fs.readFileSync(path, 'utf8');

// Add import
if (!content.includes('sendPushToUsers')) {
  content = content.replace(
    "import { cookies } from 'next/headers';",
    "import { cookies } from 'next/headers';\nimport { sendPushToUsers } from '@/lib/firebase';"
  );
  console.log('Added firebase import');
}

// Add push notification after reply is created
if (!content.includes('Send push notification')) {
  const insertPoint = "return NextResponse.json(reply);";
  const pushCode = `// Send push notification to report creator and other participants
    (async () => {
      try {
        // Get report details including project info
        const { data: report } = await supabase
          .from('project_reports')
          .select('title, reported_by, project_id')
          .eq('id', reportId)
          .single();

        if (report) {
          // Get project name
          const { data: project } = await supabase
            .from('projects')
            .select('name')
            .eq('id', report.project_id)
            .single();

          // Get all users who have replied to this report
          const { data: allReplies } = await supabase
            .from('report_replies')
            .select('user_id')
            .eq('report_id', reportId);

          // Collect unique user IDs (reporter + all repliers)
          const userIds = new Set<string>();
          if (report.reported_by) userIds.add(report.reported_by);
          allReplies?.forEach(r => userIds.add(r.user_id));

          // Get replier's name
          const { data: replier } = await supabase
            .from('user_profiles')
            .select('full_name')
            .eq('id', userId)
            .single();

          const replierName = replier?.full_name || 'Someone';
          const projectName = project?.name || 'a project';

          await sendPushToUsers(supabase, Array.from(userIds), {
            title: \`Reply in \${projectName}\`,
            body: \`\${replierName} replied to: \${report.title?.substring(0, 30)}\`,
            data: {
              type: 'report_reply',
              reportId: reportId,
              projectId: report.project_id
            }
          }, userId);
        }
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
