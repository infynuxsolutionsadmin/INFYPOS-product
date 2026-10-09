const fs = require('fs');
const files = [
  'src/pages/inventory/InventoryPage.tsx',
  'src/pages/sales/SalesPage.tsx',
  'src/pages/salesReturns/SalesReturnsPage.tsx',
  'src/pages/shifts/ShiftsPage.tsx',
  'src/pages/roles/RolesPermissionsPage.tsx',
  'src/pages/users/UsersPage.tsx'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  
  // We need to add the missing </div> to close the outer search container
  // It is missing right before the table container opens:
  const searchRegex = /<\/div>\r?\n\r?\n\s*<div className="bg-white rounded-\[30px\] shadow-\[0px_4px_24px_rgba\(149,157,165,0\.08\)\] border border-gray-100 p-6 overflow-hidden">/g;
  
  if (content.match(searchRegex)) {
    content = content.replace(searchRegex, '</div>\n      </div>\n\n      <div className="bg-white rounded-[30px] shadow-[0px_4px_24px_rgba(149,157,165,0.08)] border border-gray-100 p-6 overflow-hidden">');
  }

  fs.writeFileSync(file, content);
}
