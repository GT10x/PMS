const fs = require('fs');
const filePath = 'app/dashboard/project/[id]/modules/page.tsx';
let c = fs.readFileSync(filePath, 'utf8');

// Step 3: Add fetchProjectStakeholders function after fetchProject
const fetchProjectFunc = `const fetchProject = async () => {
    try {
      const response = await fetch(\`/api/projects/\${projectId}/view\`);
      if (response.ok) {
        const data = await response.json();
        setProject(data);
      }
    } catch (error) {
      console.error('Error fetching project:', error);
    }
  };`;

const newFetchFuncs = `const fetchProject = async () => {
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
  };`;

c = c.replace(fetchProjectFunc, newFetchFuncs);

fs.writeFileSync(filePath, c);
console.log('Step 3 done - added fetchProjectStakeholders');
