const fs = require('fs');
const filePath = 'C:/Users/PCS/pms/app/api/projects/[id]/reports/route.ts';
let content = fs.readFileSync(filePath, 'utf8');

const oldCode = `    // Create report
    const { data: report, error } = await supabaseAdmin
      .from('project_reports')
      .insert({
        project_id: projectId,
        title,
        description,
        type,
        priority: priority || 'medium',
        status: 'open',
        browser,
        device,
        reported_by: currentUser.id,
        attachments: attachments || [],
        version_id: version_id || null
      })`;

const newCode = `    // Get next report number for this project
    const { data: maxReport } = await supabaseAdmin
      .from('project_reports')
      .select('report_number')
      .eq('project_id', projectId)
      .order('report_number', { ascending: false })
      .limit(1)
      .single();

    const nextReportNumber = (maxReport?.report_number || 0) + 1;

    // Create report
    const { data: report, error } = await supabaseAdmin
      .from('project_reports')
      .insert({
        project_id: projectId,
        report_number: nextReportNumber,
        title,
        description,
        type,
        priority: priority || 'medium',
        status: 'open',
        browser,
        device,
        reported_by: currentUser.id,
        attachments: attachments || [],
        version_id: version_id || null
      })`;

content = content.replace(oldCode, newCode);
fs.writeFileSync(filePath, content);
console.log('API updated!');
