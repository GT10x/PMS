const fs = require('fs');

// Add cache headers to /api/users/[id]/projects
const userProjectsPath = 'C:/Users/PCS/pms/app/api/users/[id]/projects/route.ts';

try {
  let content = fs.readFileSync(userProjectsPath, 'utf8');
  
  // Find the return statement and add cache headers
  const oldReturn = `return NextResponse.json({ projects });`;
  const newReturn = `return NextResponse.json({ projects }, {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' }
    });`;

  if (content.includes(oldReturn)) {
    content = content.replace(oldReturn, newReturn);
    fs.writeFileSync(userProjectsPath, content);
    console.log('Updated /api/users/[id]/projects with cache headers');
  } else {
    console.log('/api/users/[id]/projects - pattern not found');
  }
} catch (e) {
  console.log('File not found or error:', e.message);
}

// Add cache headers to /api/projects/[id]/view
const projectViewPath = 'C:/Users/PCS/pms/app/api/projects/[id]/view/route.ts';

try {
  let content = fs.readFileSync(projectViewPath, 'utf8');
  
  // Look for return statement pattern
  if (content.includes('return NextResponse.json(project)')) {
    content = content.replace(
      'return NextResponse.json(project)',
      `return NextResponse.json(project, {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' }
    })`
    );
    fs.writeFileSync(projectViewPath, content);
    console.log('Updated /api/projects/[id]/view with cache headers');
  } else {
    console.log('/api/projects/[id]/view - pattern not found or already updated');
  }
} catch (e) {
  console.log('View route not found or error:', e.message);
}

console.log('Done!');
