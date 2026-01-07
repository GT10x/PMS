const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../app/api/projects/[id]/modules/route.ts');
let content = fs.readFileSync(filePath, 'utf8');

const oldLine = `if (eta !== undefined) updateData.eta = eta;`;
const newLine = `if (eta !== undefined) updateData.eta = eta || null; // Convert empty string to null`;

content = content.replace(oldLine, newLine);
console.log('✓ Fixed modules eta to convert empty string to null');

fs.writeFileSync(filePath, content, 'utf8');
console.log('✓ Done!');
