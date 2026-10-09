const fs = require('fs');
const path = require('path');

const files = ["src/pages/salesReturns/SalesReturnsPage.tsx","src/pages/roles/RolesPermissionsPage.tsx"];

for (const file of files) {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${file} - not found`);
    continue;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');

  // Add Lucide Store icon if stores page
  if (file.includes('StoresPage.tsx') && !content.includes('Store as StoreIcon')) {
     content = content.replace("import { Plus, Edit2, Trash2, Search } from 'lucide-react';", "import { Plus, Edit2, Trash2, Search, Store as StoreIcon, ScanBarcode } from 'lucide-react';");
  }

  // 1. Page Title and Main Padding
  content = content.replace(
    /<div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">/g,
    '<div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pb-12">'
  );
  content = content.replace(
    /className="text-2xl font-semibold text-gray-900"/g,
    'className="text-2xl font-bold text-[#1a1f36]"'
  );
  
  // 2. Primary Button
  content = content.replace(
    /className="inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-2xl text-white bg-\[#5B58F2\] hover:bg-\[#4A47E5\][^"]+"/g,
    'className="inline-flex items-center justify-center px-6 py-2.5 border border-transparent shadow-[0_4px_14px_0_rgba(99,102,241,0.39)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.23)] text-sm font-bold rounded-full text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 focus:outline-none hover:-translate-y-0.5 transition-all"'
  );
  
  // Also handle any other 'Add' buttons that might have slightly different classes
  content = content.replace(
    /className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-2xl text-white bg-\[#5B58F2\] hover:bg-\[#4A47E5\]"/g,
    'className="mt-4 inline-flex items-center px-6 py-2.5 border border-transparent shadow-[0_4px_14px_0_rgba(99,102,241,0.39)] text-sm font-bold rounded-full text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:-translate-y-0.5 transition-all"'
  );
  
  // 3. Split Search & Filter Bubble from Table
  content = content.replace(
    /<div className="bg-white rounded-\[24px\] shadow-\[0px_4px_24px_rgba\(149,157,165,0.12\)\] border border-gray-100 overflow-hidden">\s*<div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row gap-4">/g,
    '<div className="bg-white rounded-[24px] shadow-[0px_4px_24px_rgba(149,157,165,0.08)] border border-gray-100 p-6 mb-6 flex flex-col sm:flex-row gap-4 transition-all">'
  );
  
  content = content.replace(
    /<\/div>\s*\{error \? \(/g,
    '</div>\n\n      <div className="bg-white rounded-[30px] shadow-[0px_4px_24px_rgba(149,157,165,0.08)] border border-gray-100 p-6 overflow-hidden">\n        {error ? ('
  );

  // 4. Update Inputs and Selects
  content = content.replace(
    /className="focus:ring-\[#5B58F2\] focus:border-\[#5B58F2\] block w-full pl-10 sm:text-sm border-gray-300 rounded-2xl py-2 px-3 border"/g,
    'className="block w-full pl-11 pr-4 py-2.5 text-sm border border-gray-100 rounded-full focus:ring-[#5B58F2] focus:border-[#5B58F2] transition-colors shadow-[0_2px_10px_rgba(0,0,0,0.02)] bg-gray-50/50"'
  );
  content = content.replace(
    /className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-\[#5B58F2\] focus:border-\[#5B58F2\] sm:text-sm rounded-2xl border"/g,
    'className="block w-full pl-4 pr-10 py-2.5 text-sm border border-gray-100 rounded-full focus:ring-[#5B58F2] focus:border-[#5B58F2] transition-colors shadow-[0_2px_10px_rgba(0,0,0,0.02)] bg-gray-50/50 appearance-none"'
  );
  content = content.replace(
    /<div className="w-full sm:w-48">/g,
    '<div className="w-full sm:w-56">'
  );

  // 5. Table Container and Thead
  content = content.replace(
    /<div className="overflow-x-auto">/g,
    '<div className="overflow-x-auto overflow-y-visible pb-4">'
  );
  content = content.replace(
    /<table className="min-w-full divide-y divide-gray-200">/g,
    '<table className="min-w-full border-separate" style={{ borderSpacing: \'0 12px\' }}>'
  );
  content = content.replace(
    /<thead className="bg-slate-50\/50">/g,
    '<thead>'
  );
  
  content = content.replace(
    /className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"/g,
    'className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-[#f8f9fc] first:rounded-l-[16px] last:rounded-r-[16px]"'
  );
  content = content.replace(
    /<th className="relative px-6 py-3">/g,
    '<th className="px-6 py-4 relative bg-[#f8f9fc] first:rounded-l-[16px] last:rounded-r-[16px]">'
  );

  // 6. Tbody and rows
  content = content.replace(
    /<tbody className="bg-white divide-y divide-gray-200">/g,
    '<tbody>'
  );
  content = content.replace(
    /<tr key={([^}]+)}>/g,
    '<tr key={$1} className="group hover:-translate-y-[1px] transition-transform duration-200">'
  );

  // For RolesPermissions, it might use <tr key={role.id || index}>
  content = content.replace(
    /<tr key=\{([^}]+)\}>/g,
    '<tr key={$1} className="group hover:-translate-y-[1px] transition-transform duration-200">'
  );

  content = content.replace(
    /<td className="px-6 py-4 whitespace-nowrap">/g,
    '<td className="px-6 py-4 whitespace-nowrap bg-white border-y border-gray-100 first:border-l first:rounded-l-[24px] last:border-r last:rounded-r-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow">'
  );
  content = content.replace(
    /<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">/g,
    '<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500 bg-white border-y border-gray-100 first:border-l first:rounded-l-[24px] last:border-r last:rounded-r-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow">'
  );
  content = content.replace(
    /<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">/g,
    '<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium bg-white border-y border-r border-gray-100 last:rounded-r-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow">'
  );
  
  // Specific fix for Users page "flex-shrink-0 h-10 w-10" which might have a different td class
  content = content.replace(
    /<td className="px-6 py-4 whitespace-nowrap">/g,
    '<td className="px-6 py-4 whitespace-nowrap bg-white border-y border-gray-100 first:border-l first:rounded-l-[24px] last:border-r last:rounded-r-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow">'
  );

  content = content.replace(
    /className="text-sm font-medium text-gray-900"/g,
    'className="text-sm font-bold text-[#1a1f36]"'
  );
  content = content.replace(
    /className="text-sm font-medium text-gray-900 truncate"/g,
    'className="text-sm font-bold text-[#1a1f36] truncate"'
  );

  content = content.replace(
    /className="text-\[#5B58F2\] hover:text-blue-900/g,
    'className="p-2 rounded-full bg-purple-100 text-purple-600 hover:bg-purple-200 transition-colors'
  );
  content = content.replace(
    /className="text-red-600 hover:text-red-900/g,
    'className="p-2 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors'
  );
  content = content.replace(
    /className="text-gray-600 hover:text-gray-900/g,
    'className="p-2 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors'
  );
  
  content = content.replace(
    /<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium bg-white border-y border-r border-gray-100 last:rounded-r-\[24px\] shadow-\[0_2px_10px_rgba\(0,0,0,0.02\)\] group-hover:shadow-\[0_4px_20px_rgba\(0,0,0,0.04\)\] transition-shadow">\s*\{/g,
    '<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium bg-white border-y border-r border-gray-100 last:rounded-r-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow">\n                      <div className="flex items-center justify-end space-x-2 pr-2">\n                        {'
  );
  content = content.replace(
    /<\/button>\s*\}\s*<\/td>/g,
    '</button>\n                      )} \n                      </div>\n                    </td>'
  );

  // 7. Status Badges
  content = content.replace(
    /bg-green-100 text-green-800/g,
    'bg-green-100 text-green-700'
  );
  content = content.replace(
    /bg-gray-100 text-gray-800/g,
    'bg-gray-100 text-gray-600'
  );
  content = content.replace(
    /bg-red-100 text-red-800/g,
    'bg-red-100 text-red-700'
  );
  content = content.replace(
    /bg-yellow-100 text-yellow-800/g,
    'bg-yellow-100 text-yellow-700'
  );
  content = content.replace(
    /className=\{`px-2 inline-flex text-xs leading-5 font-semibold rounded-full /g,
    'className={`px-3 py-1 inline-flex text-xs font-bold rounded-full '
  );
  // specific matching for Returns and Users since they might just be inline-flex
  content = content.replace(
    /px-2 inline-flex text-xs leading-5 font-semibold rounded-full/g,
    'px-3 py-1 inline-flex text-xs font-bold rounded-full'
  );

  // 8. Pagination
  content = content.replace(
    /<div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">/g,
    '<div className="mt-4 flex items-center justify-between">'
  );
  content = content.replace(
    /<p className="text-sm text-gray-700">/g,
    '<p className="text-sm text-gray-500 bg-gray-50 px-4 py-1.5 rounded-full font-medium inline-block border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">'
  );
  content = content.replace(
    /<span className="font-medium">/g,
    '<span className="font-bold text-[#1a1f36]">'
  );
  
  content = content.replace(
    /<div>\s*<nav className="relative z-0 inline-flex rounded-2xl shadow-sm -space-x-px" aria-label="Pagination">[\s\S]*?<\/nav>\s*<\/div>/g,
    `<div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePageChange((query.page || 1) - 1)}
                      disabled={(query.page || 1) <= 1}
                      className="px-4 py-2 rounded-full border border-gray-200 bg-white text-sm font-bold text-[#1a1f36] hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm"
                    >
                      Previous
                    </button>
                    <div className="px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-bold shadow-[0_4px_14px_0_rgba(99,102,241,0.39)]">
                      {query.page || 1}
                    </div>
                    <button
                      onClick={() => handlePageChange((query.page || 1) + 1)}
                      disabled={(query.page || 1) >= totalPages}
                      className="px-4 py-2 rounded-full border border-gray-200 bg-white text-sm font-bold text-[#1a1f36] hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm"
                    >
                      Next
                    </button>
                  </div>`
  );

  if (file.includes('StoresPage.tsx')) {
    content = content.replace(
      /<div className="flex items-center">\s*<div>/g,
      `<div className="flex items-center">
                        <div className="h-12 w-12 bg-purple-50 rounded-[14px] flex items-center justify-center flex-shrink-0 mr-4 border border-purple-100/50">
                          <StoreIcon className="h-6 w-6 text-purple-600" />
                        </div>
                        <div>`
    );
  }

  if (file.includes('UsersPage.tsx')) {
    if (!content.includes('User as UserIcon')) {
       content = content.replace("import { Plus, Edit2, Trash2, Search } from 'lucide-react';", "import { Plus, Edit2, Trash2, Search, User as UserIcon } from 'lucide-react';");
    }
    content = content.replace(
      /<div className="flex items-center">\s*<div className="flex-shrink-0 h-10 w-10">\s*<div className="h-10 w-10 rounded-full bg-\[#5B58F2\] flex items-center justify-center text-white font-bold text-lg">\s*\{user.name.charAt\(0\).toUpperCase\(\)\}\s*<\/div>\s*<\/div>\s*<div className="ml-4">/g,
      `<div className="flex items-center">
                        <div className="h-12 w-12 bg-indigo-50 rounded-[14px] flex items-center justify-center flex-shrink-0 mr-4 border border-indigo-100/50">
                          <div className="text-indigo-600 font-bold text-lg">{user.name.charAt(0).toUpperCase()}</div>
                        </div>
                        <div>`
    );
    // If it doesn't have initials, fallback to UserIcon replacement
    content = content.replace(
      /<div className="flex items-center">\s*<div className="ml-4">/g,
      `<div className="flex items-center">
                        <div className="h-12 w-12 bg-indigo-50 rounded-[14px] flex items-center justify-center flex-shrink-0 mr-4 border border-indigo-100/50">
                          <UserIcon className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div>`
    );
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${file}`);
}
