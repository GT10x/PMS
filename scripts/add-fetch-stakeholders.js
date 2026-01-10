const fs = require('fs');
let c = fs.readFileSync('app/dashboard/project/[id]/modules/page.tsx', 'utf8');
c = c.replace(/\r\n/g, '\n');

// Add fetchProjectStakeholders call in useEffect
if (!c.includes('fetchProjectStakeholders();')) {
  c = c.replace(
    'fetchProject();\n    fetchModules();',
    'fetchProject();\n    fetchProjectStakeholders();\n    fetchModules();'
  );
  console.log('Added fetchProjectStakeholders call');
}

// Add fetchProjectStakeholders function after fetchProject if it doesn't exist
if (!c.includes('const fetchProjectStakeholders')) {
  const oldFetch = `const fetchProject = async () => {
    try {
      const response = await fetch(\`/api/projects/\${projectId}/view\`);
      if (response.ok) {
        const data = await response.json();
        setProject(data);
      }
    } catch (error) {
      console.error('Error fetching project:', error);
    }
  };

  const fetchModules`;

  const newFetch = `const fetchProject = async () => {
    try {
      const response = await fetch(\`/api/projects/\${projectId}/view\`);
      if (response.ok) {
        const data = await response.json();
        setProject(data);
      }
    } catch (error) {
      console.error('Error fetching project:', error);
    }
  };

  const fetchProjectStakeholders = async () => {
    try {
      const response = await fetch(\`/api/projects/\${projectId}\`);
      if (response.ok) {
        const data = await response.json();
        setProjectStakeholders(data.project.stakeholders || []);
      }
    } catch (error) {
      console.error('Error fetching stakeholders:', error);
    }
  };

  const fetchModules`;

  c = c.replace(oldFetch, newFetch);
  console.log('Added fetchProjectStakeholders function');
}

fs.writeFileSync('app/dashboard/project/[id]/modules/page.tsx', c);
console.log('Done');
