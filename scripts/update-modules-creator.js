const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../app/dashboard/project/[id]/modules/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add creator name inline with module name
const oldModuleName = `                  {/* Module Name */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {module.name}
                    </h3>`;

const newModuleName = `                  {/* Module Name */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {module.name}
                      {module.created_by_user && (
                        <span className="ml-2 text-sm font-normal text-gray-400 dark:text-gray-500">
                          by {module.created_by_user.full_name}
                        </span>
                      )}
                    </h3>`;

content = content.replace(oldModuleName, newModuleName);
console.log('✓ Added creator name inline with module name');

// 2. Remove "Created by" from meta info section
const oldCreatedBy = `                      {module.created_by_user && (
                        <div className="flex items-center gap-1">
                          <i className="fas fa-user text-gray-400"></i>
                          <span>Created by {module.created_by_user.full_name}</span>
                        </div>
                      )}`;

content = content.replace(oldCreatedBy, '');
console.log('✓ Removed Created by from meta info section');

fs.writeFileSync(filePath, content, 'utf8');
console.log('\n✓ Done! Creator name now shows inline with module name.');
