const fs = require('fs');
const path = 'C:/Users/PCS/pms/app/api/projects/[id]/chat/route.ts';
let content = fs.readFileSync(path, 'utf8');

// Add push notification code after message is created
const insertPoint = '// Build response';
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
        const senderName = sender?.full_name || 'Someone';
        const projectName = project?.name || 'a project';
        const messagePreview = content?.substring(0, 50) || (attachment_url ? '📎 Attachment' : 'New message');

        await sendPushToUsers(supabaseAdmin, memberIds, {
          title: \`\${senderName} in \${projectName}\`,
          body: messagePreview,
          data: {
            type: 'chat',
            projectId: projectId,
            messageId: newMessage.id
          }
        }, currentUser.id);
      } catch (e) {
        console.error('Push notification error:', e);
      }
    })();

    `;

if (!content.includes('Send push notifications')) {
  content = content.replace(insertPoint, pushCode + insertPoint);
  fs.writeFileSync(path, content);
  console.log('Added push notification code');
} else {
  console.log('Push notification code already exists');
}
