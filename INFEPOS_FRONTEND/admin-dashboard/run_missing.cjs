const fs = require('fs');

const files = [
  'src/pages/salesReturns/SalesReturnsPage.tsx',
  'src/pages/roles/RolesPermissionsPage.tsx'
];

let scriptContent = fs.readFileSync('refactor_bubble.cjs', 'utf8');
scriptContent = scriptContent.replace(/const files = \[[\s\S]*?\];/, `const files = ${JSON.stringify(files)};`);

fs.writeFileSync('refactor_bubble2.cjs', scriptContent);
