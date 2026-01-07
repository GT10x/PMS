const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../app/api/projects/[id]/route.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Fix the start_date handling to convert empty string to null
const oldLine = `if (start_date !== undefined) updateData.start_date = start_date;`;
const newLine = `if (start_date !== undefined) updateData.start_date = start_date || null; // Convert empty string to null`;

content = content.replace(oldLine, newLine);
console.log('✓ Fixed start_date to convert empty string to null');

fs.writeFileSync(filePath, content, 'utf8');
console.log('✓ Done!');
