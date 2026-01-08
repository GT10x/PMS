const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../app/dashboard/project/[id]/modules/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Fix: Focus on new input after pressing Enter - in BOTH Add and Edit modals
// The issue is the same in both places, so fix both

const oldEnterHandler = `onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            setFeaturesList([...featuresList, '']);
                          }
                        }}`;

const newEnterHandler = `onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            setFeaturesList([...featuresList, '']);
                            // Focus on new input after React re-renders
                            setTimeout(() => {
                              const inputs = document.querySelectorAll('input[placeholder*="feature"], input[placeholder*="Feature"]');
                              const lastInput = inputs[inputs.length - 1] as HTMLInputElement;
                              if (lastInput) lastInput.focus();
                            }, 50);
                          }
                        }}`;

// Replace all occurrences (both Add and Edit modals)
content = content.split(oldEnterHandler).join(newEnterHandler);

console.log('✓ Fixed Enter key to auto-focus new input (both modals)');

fs.writeFileSync(filePath, content, 'utf8');
console.log('✓ Done!');
