const fs = require('fs');

// 1. Update login page to save user_id to localStorage
const loginPath = 'C:/Users/PCS/pms/app/login/page.tsx';
let loginContent = fs.readFileSync(loginPath, 'utf8');

if (!loginContent.includes('localStorage.setItem')) {
  loginContent = loginContent.replace(
    "router.push('/dashboard');",
    `// Save user_id to localStorage for Capacitor session persistence
      if (data.user?.id) {
        localStorage.setItem('pms_user_id', data.user.id);
      }
      router.push('/dashboard');`
  );
  fs.writeFileSync(loginPath, loginContent);
  console.log('Updated login page');
} else {
  console.log('Login page already updated');
}

// 2. Update auth/me API to accept header as fallback
const mePath = 'C:/Users/PCS/pms/app/api/auth/me/route.ts';
let meContent = fs.readFileSync(mePath, 'utf8');

if (!meContent.includes('x-user-id')) {
  // Add request parameter to GET function
  meContent = meContent.replace(
    'export async function GET() {',
    'export async function GET(request: Request) {'
  );

  // Add fallback for header
  meContent = meContent.replace(
    "const userId = cookieStore.get('user_id')?.value;",
    `let userId = cookieStore.get('user_id')?.value;

    // Fallback to header for Capacitor apps where cookies may not persist
    if (!userId) {
      userId = request.headers.get('x-user-id') || undefined;
    }`
  );

  fs.writeFileSync(mePath, meContent);
  console.log('Updated auth/me API');
} else {
  console.log('Auth/me API already updated');
}

// 3. Update DashboardLayout to send user_id header
const dashboardPath = 'C:/Users/PCS/pms/components/DashboardLayout.tsx';
let dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

if (!dashboardContent.includes('pms_user_id')) {
  dashboardContent = dashboardContent.replace(
    "const response = await fetch('/api/auth/me');",
    `// Try to get user_id from localStorage for Capacitor persistence
      const storedUserId = localStorage.getItem('pms_user_id');
      const headers: HeadersInit = {};
      if (storedUserId) {
        headers['x-user-id'] = storedUserId;
      }
      const response = await fetch('/api/auth/me', { headers });`
  );
  fs.writeFileSync(dashboardPath, dashboardContent);
  console.log('Updated DashboardLayout');
} else {
  console.log('DashboardLayout already updated');
}

console.log('Done!');
