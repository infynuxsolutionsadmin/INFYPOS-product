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
  
  // Add mb-6 to the search/filter card wrapper
  content = content.replace(
    /<div className="bg-white rounded-\[24px\] shadow-\[0px_4px_24px_rgba\(149,157,165,0\.12\)\] border border-gray-100 overflow-hidden">/g,
    '<div className="bg-white rounded-[24px] shadow-[0px_4px_24px_rgba(149,157,165,0.12)] border border-gray-100 overflow-hidden mb-6">'
  );

  fs.writeFileSync(file, content);
}
