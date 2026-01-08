const fs = require('fs');
const path = require('path');

// 1. Fix globals.css - Modal responsiveness
console.log('Fixing globals.css...');
const globalsPath = path.join(__dirname, '../app/globals.css');
let globals = fs.readFileSync(globalsPath, 'utf8');

const oldModal = `/* Modal Styles */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1rem;
  overflow-y: auto;
}

.modal-content {
  background: white;
  border-radius: 1.25rem;
  width: 100%;
  max-height: calc(100vh - 2rem);
  overflow-y: auto;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  padding: 1.5rem;
  margin: auto;
}

/* Modal size variants - use max-w-* classes to override */
.modal-content.max-w-2xl {
  max-width: 42rem;
}

.modal-content.max-w-3xl {
  max-width: 48rem;
}

.modal-content.max-w-4xl {
  max-width: 56rem;
}

.modal-content.max-w-5xl {
  max-width: 64rem;
}`;

const newModal = `/* Modal Styles - Mobile First */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 0.5rem;
  overflow-y: auto;
}

@media (min-width: 640px) {
  .modal-overlay {
    padding: 1rem;
  }
}

.modal-content {
  background: white;
  border-radius: 0.75rem;
  width: 100%;
  max-width: 100%;
  max-height: calc(100vh - 1rem);
  overflow-y: auto;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  padding: 1rem;
  margin: auto;
}

@media (min-width: 640px) {
  .modal-content {
    border-radius: 1.25rem;
    max-height: calc(100vh - 2rem);
    padding: 1.5rem;
  }
}

/* Modal size variants - full width on mobile, constrained on larger screens */
.modal-content.max-w-lg,
.modal-content.max-w-2xl,
.modal-content.max-w-3xl,
.modal-content.max-w-4xl,
.modal-content.max-w-5xl {
  max-width: 100%;
}

@media (min-width: 640px) {
  .modal-content.max-w-lg { max-width: 32rem; }
  .modal-content.max-w-2xl { max-width: 42rem; }
  .modal-content.max-w-3xl { max-width: 48rem; }
  .modal-content.max-w-4xl { max-width: 56rem; }
  .modal-content.max-w-5xl { max-width: 64rem; }
}`;

globals = globals.replace(oldModal, newModal);
fs.writeFileSync(globalsPath, globals, 'utf8');
console.log('✓ Fixed modal responsiveness');

// 2. Fix projects page - form grids
console.log('\\nFixing projects page...');
const projectsPath = path.join(__dirname, '../app/dashboard/projects/page.tsx');
let projects = fs.readFileSync(projectsPath, 'utf8');

// Fix 2-column grids to be responsive
projects = projects.replace(
  /className="grid grid-cols-2 gap-4"/g,
  'className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4"'
);

// Fix member selection grid
projects = projects.replace(
  /className="grid grid-cols-2 max-h-48/g,
  'className="grid grid-cols-1 sm:grid-cols-2 max-h-48'
);

fs.writeFileSync(projectsPath, projects, 'utf8');
console.log('✓ Fixed projects page grids');

// 3. Fix modules page - form grids
console.log('\\nFixing modules page...');
const modulesPath = path.join(__dirname, '../app/dashboard/project/[id]/modules/page.tsx');
let modules = fs.readFileSync(modulesPath, 'utf8');

// Fix 2-column grids
modules = modules.replace(
  /className="grid grid-cols-2 gap-4"/g,
  'className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4"'
);

// Fix gaps to be responsive
modules = modules.replace(
  /className="flex flex-wrap items-center gap-4 mt-3/g,
  'className="flex flex-wrap items-center gap-2 sm:gap-4 mt-3'
);

fs.writeFileSync(modulesPath, modules, 'utf8');
console.log('✓ Fixed modules page grids');

// 4. Fix dashboard page
console.log('\\nFixing dashboard page...');
const dashboardPath = path.join(__dirname, '../app/dashboard/page.tsx');
let dashboard = fs.readFileSync(dashboardPath, 'utf8');

// Fix stats grid - add sm breakpoint
dashboard = dashboard.replace(
  /grid-cols-1 md:grid-cols-2 lg:grid-cols-4/g,
  'grid-cols-2 sm:grid-cols-2 md:grid-cols-4'
);

// Fix quick actions grid
dashboard = dashboard.replace(
  /grid-cols-1 md:grid-cols-3/g,
  'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
);

// Fix project cards grid
dashboard = dashboard.replace(
  /grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4/g,
  'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
);

// Fix text sizes
dashboard = dashboard.replace(
  /text-2xl font-bold/g,
  'text-xl sm:text-2xl font-bold'
);

dashboard = dashboard.replace(
  /text-3xl font-bold/g,
  'text-2xl sm:text-3xl font-bold'
);

fs.writeFileSync(dashboardPath, dashboard, 'utf8');
console.log('✓ Fixed dashboard page');

// 5. Fix DashboardLayout - sidebar margins
console.log('\\nFixing DashboardLayout...');
const layoutPath = path.join(__dirname, '../components/DashboardLayout.tsx');
let layout = fs.readFileSync(layoutPath, 'utf8');

// Fix sidebar margin transition
layout = layout.replace(
  /lg:ml-20/g,
  'md:ml-20'
);
layout = layout.replace(
  /lg:ml-64/g,
  'md:ml-64'
);

// Fix main content padding
layout = layout.replace(
  /className="flex-1 p-4 sm:p-6"/g,
  'className="flex-1 p-3 sm:p-4 md:p-6"'
);

fs.writeFileSync(layoutPath, layout, 'utf8');
console.log('✓ Fixed DashboardLayout');

// 6. Fix Header - mobile improvements
console.log('\\nFixing Header...');
const headerPath = path.join(__dirname, '../components/Header.tsx');
let header = fs.readFileSync(headerPath, 'utf8');

// Fix mobile menu button visibility
header = header.replace(
  /className="lg:hidden/g,
  'className="md:hidden'
);

// Fix dropdown width
header = header.replace(
  /className="absolute right-0 mt-2 w-56/g,
  'className="absolute right-0 mt-2 w-48 sm:w-56'
);

fs.writeFileSync(headerPath, header, 'utf8');
console.log('✓ Fixed Header');

// 7. Fix Sidebar - mobile behavior
console.log('\\nFixing Sidebar...');
const sidebarPath = path.join(__dirname, '../components/Sidebar.tsx');
let sidebar = fs.readFileSync(sidebarPath, 'utf8');

// Fix sidebar visibility breakpoints
sidebar = sidebar.replace(
  /lg:translate-x-0/g,
  'md:translate-x-0'
);
sidebar = sidebar.replace(
  /lg:block/g,
  'md:block'
);
sidebar = sidebar.replace(
  /lg:hidden/g,
  'md:hidden'
);

fs.writeFileSync(sidebarPath, sidebar, 'utf8');
console.log('✓ Fixed Sidebar');

// 8. Fix reports page
console.log('\\nFixing reports page...');
const reportsPath = path.join(__dirname, '../app/dashboard/project/[id]/reports/page.tsx');
let reports = fs.readFileSync(reportsPath, 'utf8');

// Fix 2-column grids
reports = reports.replace(
  /className="grid grid-cols-2 gap-4"/g,
  'className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4"'
);

// Fix gaps
reports = reports.replace(
  /className="flex gap-4"/g,
  'className="flex gap-2 sm:gap-4"'
);

reports = reports.replace(
  /className="flex items-center gap-4"/g,
  'className="flex items-center gap-2 sm:gap-4"'
);

fs.writeFileSync(reportsPath, reports, 'utf8');
console.log('✓ Fixed reports page');

// 9. Fix users page
console.log('\\nFixing users page...');
const usersPath = path.join(__dirname, '../app/dashboard/users/page.tsx');
let users = fs.readFileSync(usersPath, 'utf8');

// Fix 2-column grids
users = users.replace(
  /className="grid grid-cols-2 gap-4"/g,
  'className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4"'
);

fs.writeFileSync(usersPath, users, 'utf8');
console.log('✓ Fixed users page');

console.log('\\n✅ All mobile responsive fixes applied!');
