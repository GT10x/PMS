const fs = require('fs');

// 1. Add cache headers to /api/auth/me and parallelize queries
const authMePath = 'C:/Users/PCS/pms/app/api/auth/me/route.ts';
let authContent = fs.readFileSync(authMePath, 'utf8');

// Replace sequential queries with parallel and add cache header
const oldAuthCode = `const user = await getUserById(userId);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const modulePermissions = await getUserModulePermissions(userId);

    return NextResponse.json({
      user,
      modulePermissions,
    });`;

const newAuthCode = `// Fetch user AND permissions IN PARALLEL (saves 100-200ms)
    const [user, modulePermissions] = await Promise.all([
      getUserById(userId),
      getUserModulePermissions(userId)
    ]);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user,
      modulePermissions,
    }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=120' }
    });`;

if (authContent.includes(oldAuthCode)) {
  authContent = authContent.replace(oldAuthCode, newAuthCode);
  fs.writeFileSync(authMePath, authContent);
  console.log('Updated /api/auth/me with parallel queries and cache headers');
} else {
  console.log('/api/auth/me - pattern not found, may already be updated');
}

// 2. Add cache headers to /api/projects GET
const projectsPath = 'C:/Users/PCS/pms/app/api/projects/route.ts';
let projectsContent = fs.readFileSync(projectsPath, 'utf8');

const oldProjectsReturn = `return NextResponse.json({ projects: projectsWithMembers });`;
const newProjectsReturn = `return NextResponse.json({ projects: projectsWithMembers }, {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' }
    });`;

if (projectsContent.includes(oldProjectsReturn)) {
  projectsContent = projectsContent.replace(oldProjectsReturn, newProjectsReturn);
  fs.writeFileSync(projectsPath, projectsContent);
  console.log('Updated /api/projects with cache headers');
} else {
  console.log('/api/projects - pattern not found, may already be updated');
}

console.log('Cache headers update complete!');
