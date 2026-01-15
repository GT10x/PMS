const fs = require('fs');
const filePath = 'C:/Users/PCS/pms/app/api/reports/[reportId]/status/route.ts';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update valid statuses
content = content.replace(
  "const validStatuses = ['open', 'in_progress', 'resolved'];",
  "const validStatuses = ['open', 'in_progress', 'do_qc', 'resolved', 'wont_fix'];"
);

// 2. Update permission logic
const oldLogic = `    if (status === 'in_progress' && oldStatus === 'open') {
      // Only dev/pm/cto can change from open to in_progress
      canChangeStatus = canChangeToInProgress;
    } else if (status === 'resolved' && oldStatus === 'in_progress') {
      // Anyone can mark as resolved
      canChangeStatus = true;
    } else if (status === 'open') {
      // Only admin/pm can reopen
      canChangeStatus = user.is_admin || user.role === 'project_manager' || user.role === 'cto';
    } else if (status === 'in_progress' && oldStatus === 'resolved') {
      // Reopening from resolved - only dev/pm/cto
      canChangeStatus = canChangeToInProgress;
    }`;

const newLogic = `    if (status === 'in_progress' && oldStatus === 'open') {
      // Only dev/pm/cto can change from open to in_progress
      canChangeStatus = canChangeToInProgress;
    } else if (status === 'do_qc' && oldStatus === 'in_progress') {
      // Developer marks as ready for QC
      canChangeStatus = canChangeToInProgress;
    } else if (status === 'resolved' && (oldStatus === 'in_progress' || oldStatus === 'do_qc')) {
      // Anyone can mark as resolved after QC
      canChangeStatus = true;
    } else if (status === 'in_progress' && oldStatus === 'do_qc') {
      // Tester can send back to in_progress if QC fails
      canChangeStatus = true;
    } else if (status === 'open') {
      // Only admin/pm can reopen
      canChangeStatus = user.is_admin || user.role === 'project_manager' || user.role === 'cto';
    } else if (status === 'in_progress' && oldStatus === 'resolved') {
      // Reopening from resolved - only dev/pm/cto
      canChangeStatus = canChangeToInProgress;
    } else if (status === 'wont_fix') {
      // Only admin/pm can mark as won't fix
      canChangeStatus = user.is_admin || user.role === 'project_manager' || user.role === 'cto';
    }`;

content = content.replace(oldLogic, newLogic);

fs.writeFileSync(filePath, content);
console.log('API updated!');
