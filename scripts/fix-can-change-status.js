const fs = require('fs');
const filePath = 'C:/Users/PCS/pms/app/dashboard/project/[id]/reports/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const oldCode = `  // Check if user can change status
  const canChangeStatus = (toStatus: string) => {
    if (!currentUser || !selectedReport) return false;

    const isAdmin = currentUser.is_admin;
    const isPM = currentUser.role === 'project_manager' || currentUser.role === 'cto';
    const isDeveloper = currentUser.role === 'developer' || currentUser.role === 'react_native_developer';
    const isTester = currentUser.role === 'tester';
    const isReporter = selectedReport.reported_by === currentUser.id;

    // Admins and PMs can do anything
    if (isAdmin || isPM) return true;

    // Developers can mark as in_progress
    if (isDeveloper && toStatus === 'in_progress') return true;

    // Testers or reporters can mark as resolved (approve)
    if ((isTester || isReporter) && toStatus === 'resolved') return true;

    return false;
  };`;

const newCode = `  // Check if user can change status
  const canChangeStatus = (toStatus: string) => {
    if (!currentUser || !selectedReport) return false;

    const isAdmin = currentUser.is_admin;
    const isPM = currentUser.role === 'project_manager' || currentUser.role === 'cto';
    const isDeveloper = currentUser.role === 'developer' || currentUser.role === 'react_native_developer';
    const isTester = currentUser.role === 'tester' || currentUser.role === 'qa' || currentUser.role === 'quality_assurance';
    const currentStatus = selectedReport.status;

    // Super admin can do anything - no restrictions
    if (isAdmin) return true;

    // PMs can do anything
    if (isPM) return true;

    // Developers can mark as in_progress, do_qc, resolved
    if (isDeveloper && ['in_progress', 'do_qc', 'resolved'].includes(toStatus)) return true;

    // Testers can change from do_qc to resolved or still_issue
    if (isTester && currentStatus === 'do_qc' && ['resolved', 'still_issue'].includes(toStatus)) return true;

    // Testers can also send back to in_progress from do_qc
    if (isTester && currentStatus === 'do_qc' && toStatus === 'in_progress') return true;

    return false;
  };`;

content = content.replace(oldCode, newCode);
fs.writeFileSync(filePath, content);
console.log('Updated canChangeStatus function');
