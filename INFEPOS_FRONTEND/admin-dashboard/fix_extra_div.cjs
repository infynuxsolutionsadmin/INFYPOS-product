const fs = require('fs');
const files = [
  'src/pages/stores/StoresPage.tsx',
  'src/pages/inventory/InventoryPage.tsx',
  'src/pages/sales/SalesPage.tsx',
  'src/pages/salesReturns/SalesReturnsPage.tsx',
  'src/pages/shifts/ShiftsPage.tsx',
  'src/pages/users/UsersPage.tsx',
  'src/pages/roles/RolesPermissionsPage.tsx'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  
  // Revert the extra </div> inserted before Modals
  content = content.replace(/\r?\n\s*<\/div>\r?\n(\s*<[A-Za-z]+Modal)/, '\n$1');
  
  // Revert the extra </div> inserted at the very end if no modal
  content = content.replace(/\r?\n\s*<\/div>\r?\n\s*<\/div>\r?\n\s*\);\r?\n};\r?\n/, '\n    </div>\n  );\n};\n');

  fs.writeFileSync(file, content);
}
