const fs = require('fs');
const filePath = 'C:/Users/PCS/pms/app/dashboard/project/[id]/reports/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Update modal title to show report number
content = content.replace(
  `<h3 className={\`text-lg md:text-xl font-bold truncate \${selectedReport.is_deleted ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}\`}>
                      {selectedReport.title}
                    </h3>`,
  `<h3 className={\`text-lg md:text-xl font-bold truncate \${selectedReport.is_deleted ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}\`}>
                      {selectedReport.report_number && <span className="text-indigo-600 dark:text-indigo-400">#{selectedReport.report_number}</span>} {selectedReport.title}
                    </h3>`
);

fs.writeFileSync(filePath, content);
console.log('Modal title updated!');
