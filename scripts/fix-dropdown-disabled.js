const fs = require('fs');
const filePath = 'C:/Users/PCS/pms/app/dashboard/project/[id]/reports/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Fix the disabled logic for the status dropdown
const oldDisabled = `disabled={updatingStatus || !(
                          currentUser?.is_admin ||
                          currentUser?.role === 'project_manager' ||
                          currentUser?.role === 'cto' ||
                          (selectedReport.status === 'open' && (currentUser?.role === 'developer' || currentUser?.role === 'react_native_developer')) ||
                          (selectedReport.status === 'in_progress')
                        )}`;

const newDisabled = `disabled={updatingStatus || !(
                          currentUser?.is_admin ||
                          currentUser?.role === 'project_manager' ||
                          currentUser?.role === 'cto' ||
                          (selectedReport.status === 'open' && (currentUser?.role === 'developer' || currentUser?.role === 'react_native_developer')) ||
                          (selectedReport.status === 'in_progress' && (currentUser?.role === 'developer' || currentUser?.role === 'react_native_developer')) ||
                          (selectedReport.status === 'do_qc' && (currentUser?.role === 'tester' || currentUser?.role === 'qa' || currentUser?.role === 'developer' || currentUser?.role === 'react_native_developer')) ||
                          (selectedReport.status === 'still_issue' && (currentUser?.role === 'developer' || currentUser?.role === 'react_native_developer'))
                        )}`;

content = content.replace(oldDisabled, newDisabled);

// Also fix the status color to include still_issue
const oldColors = `: selectedReport.status === 'resolved'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'`;

const newColors = `: selectedReport.status === 'still_issue'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : selectedReport.status === 'resolved'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'`;

content = content.replace(oldColors, newColors);

fs.writeFileSync(filePath, content);
console.log('Fixed dropdown disabled logic and added still_issue color');
