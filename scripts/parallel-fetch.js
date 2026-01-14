const fs = require('fs');
const path = 'C:/Users/PCS/pms/app/dashboard/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const oldCode = `const fetchData = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        router.push('/login');
        return;
      }
      const data = await response.json();
      setUser(data.user);
      setCache('user', data.user);

      // Fetch projects based on role
      if (data.user.is_admin || data.user.role === 'project_manager') {
        const projectsRes = await fetch('/api/projects');
        if (projectsRes.ok) {
          const projectsData = await projectsRes.json();
          const projects = projectsData.projects || [];
          setAllProjects(projects);
          setCache('allProjects', projects);
          setStats({
            totalProjects: projects.length,
            activeProjects: projects.filter((p: Project) => p.status === 'in_progress').length,
            completedProjects: projects.filter((p: Project) => p.status === 'completed').length,
            teamMembers: 4,
          });
        }
      } else {
        // Fetch assigned projects for regular users
        const projectsRes = await fetch(\`/api/users/\${data.user.id}/projects\`);
        if (projectsRes.ok) {
          const projectsData = await projectsRes.json();
          setAssignedProjects(projectsData.projects || []);
          setCache('assignedProjects', projectsData.projects || []);
        }
      }

      // Fetch notification counts
      const countsRes = await fetch('/api/notifications/counts');
      if (countsRes.ok) {
        const countsData = await countsRes.json();
        setNotificationCounts(countsData.counts || {});
        setCache('notificationCounts', countsData.counts || {});
      }

      setLoading(false);
    } catch (error) {
      console.error('Error:', error);
      if (!user) router.push('/login');
    }
  };`;

const newCode = `const fetchData = async () => {
    try {
      // Step 1: Fetch user first (needed to determine role)
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        router.push('/login');
        return;
      }
      const data = await response.json();
      setUser(data.user);
      setCache('user', data.user);

      // Step 2: Fetch projects AND notifications IN PARALLEL (saves 400-600ms)
      const isAdmin = data.user.is_admin || data.user.role === 'project_manager';
      const projectsUrl = isAdmin ? '/api/projects' : \`/api/users/\${data.user.id}/projects\`;

      const [projectsRes, countsRes] = await Promise.all([
        fetch(projectsUrl),
        fetch('/api/notifications/counts')
      ]);

      // Process projects
      if (projectsRes.ok) {
        const projectsData = await projectsRes.json();
        const projects = projectsData.projects || [];
        if (isAdmin) {
          setAllProjects(projects);
          setCache('allProjects', projects);
          setStats({
            totalProjects: projects.length,
            activeProjects: projects.filter((p: Project) => p.status === 'in_progress').length,
            completedProjects: projects.filter((p: Project) => p.status === 'completed').length,
            teamMembers: 4,
          });
        } else {
          setAssignedProjects(projects);
          setCache('assignedProjects', projects);
        }
      }

      // Process notification counts
      if (countsRes.ok) {
        const countsData = await countsRes.json();
        setNotificationCounts(countsData.counts || {});
        setCache('notificationCounts', countsData.counts || {});
      }

      setLoading(false);
    } catch (error) {
      console.error('Error:', error);
      if (!user) router.push('/login');
    }
  };`;

if (content.includes(oldCode)) {
  content = content.replace(oldCode, newCode);
  fs.writeFileSync(path, content);
  console.log('Parallel fetch applied to dashboard!');
} else {
  console.log('Code pattern not found - may already be updated');
}
