const fs = require('fs');
const path = 'C:/Users/PCS/pms/app/dashboard/project/[id]/modules/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Add isMasterAdmin helper function after canManageModules
const oldCanManage = `const canManageModules = () => {
    if (!currentUser) return false;
    return currentUser.is_admin ||
           currentUser.role === 'project_manager' ||
           currentUser.role === 'cto' ||
           currentUser.role === 'consultant';
  };`;

const newCanManage = `const canManageModules = () => {
    if (!currentUser) return false;
    return currentUser.is_admin ||
           currentUser.role === 'project_manager' ||
           currentUser.role === 'cto' ||
           currentUser.role === 'consultant';
  };

  // Check if current user is the master admin (only they can delete)
  const isMasterAdmin = () => {
    return currentUser?.id === MASTER_ADMIN_ID;
  };`;

content = content.replace(oldCanManage, newCanManage);
fs.writeFileSync(path, content);
console.log('Added isMasterAdmin helper function');
