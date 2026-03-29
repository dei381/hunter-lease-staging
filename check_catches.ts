import fs from 'fs';

const content = fs.readFileSync('server.ts', 'utf-8');
const lines = content.split('\n');

let missingCount = 0;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('catch (error')) {
    if (i + 1 < lines.length && !lines[i + 1].includes('console.error')) {
      console.log(`Missing console.error at line ${i + 1}: ${lines[i + 1].trim()}`);
      missingCount++;
    }
  }
}

console.log(`Total missing: ${missingCount}`);
