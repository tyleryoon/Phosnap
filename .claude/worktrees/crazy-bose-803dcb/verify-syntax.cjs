const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');

const files = [
  './src/App.jsx',
  './src/components/InstallPrompt.jsx'
];

console.log('Verifying JSX syntax...\n');

let hasErrors = false;

files.forEach((file) => {
  try {
    const content = fs.readFileSync(file, 'utf-8');
    parser.parse(content, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript']
    });
    console.log(`✓ ${file}`);
  } catch (err) {
    console.error(`✗ ${file}`);
    console.error(`  Error: ${err.message}`);
    hasErrors = true;
  }
});

console.log(hasErrors ? '\n❌ Syntax errors found!' : '\n✅ All files valid!');
process.exit(hasErrors ? 1 : 0);
