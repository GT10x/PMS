const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../app/dashboard/project/[id]/modules/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Change the feature list to use ordered list with numbers
const oldFeatureList = `                      <ul className="space-y-2">
                        {descriptionLines.map((line, idx) => {
                          const isEditing = editingFeature?.moduleId === module.id && editingFeature?.index === idx;
                          const cleanLine = line.replace(/^[•\\-\\*]\\s*/, '');

                          return (
                            <li key={idx} className="flex items-start gap-2 group">
                              <span className="text-indigo-500 mt-2">•</span>`;

const newFeatureList = `                      <ol className="space-y-2">
                        {descriptionLines.map((line, idx) => {
                          const isEditing = editingFeature?.moduleId === module.id && editingFeature?.index === idx;
                          const cleanLine = line.replace(/^[•\\-\\*\\d\\.]+\\s*/, '');

                          return (
                            <li key={idx} className="flex items-start gap-2 group">
                              <span className="text-indigo-600 dark:text-indigo-400 font-medium min-w-[24px] mt-1 text-sm">{idx + 1}.</span>`;

content = content.replace(oldFeatureList, newFeatureList);
console.log('✓ Changed to numbered list');

// 2. Close the ol tag instead of ul
const oldCloseUl = `                        })}
                      </ul>

                      {/* Add Feature */}`;

const newCloseOl = `                        })}
                      </ol>

                      {/* Add Feature */}`;

content = content.replace(oldCloseUl, newCloseOl);
console.log('✓ Updated closing tag');

// 3. Update the add feature input to show next number
const oldAddFeature = `                          {addingFeature === module.id ? (
                            <div className="flex items-center gap-2">
                              <span className="text-indigo-500">•</span>`;

const newAddFeature = `                          {addingFeature === module.id ? (
                            <div className="flex items-center gap-2">
                              <span className="text-indigo-600 dark:text-indigo-400 font-medium min-w-[24px] text-sm">{descriptionLines.length + 1}.</span>`;

content = content.replace(oldAddFeature, newAddFeature);
console.log('✓ Updated add feature number');

// 4. Also update the cleanLine regex to strip numbers at the beginning
const oldCleanLine = `const cleanLine = line.replace(/^[•\\-\\*]\\s*/, '');`;
const newCleanLine = `const cleanLine = line.replace(/^[•\\-\\*\\d\\.]+\\s*/, '');`;

// This was already done in step 1, but let's make sure any other occurrences are updated
content = content.replace(new RegExp(oldCleanLine.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newCleanLine);
console.log('✓ Updated cleanLine regex');

fs.writeFileSync(filePath, content, 'utf8');
console.log('\n✓ Done! Features now show with numbers (1. 2. 3. etc.)');
