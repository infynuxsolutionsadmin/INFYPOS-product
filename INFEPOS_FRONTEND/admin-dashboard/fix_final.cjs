const fs = require('fs');

// Fix InventoryPage
let inv = fs.readFileSync('src/pages/inventory/InventoryPage.tsx', 'utf8');
inv = inv.replace(/\)\}\r?\n\s*<\/td>\r?\n\s*<\/tr>/, ')}\n                      </div>\n                      </td>\n                    </tr>');
fs.writeFileSync('src/pages/inventory/InventoryPage.tsx', inv);

// Fix StoresPage
let stores = fs.readFileSync('src/pages/stores/StoresPage.tsx', 'utf8');
stores = stores.replace(/\)\}\r?\n\s*<\/td>\r?\n\s*<\/tr>/, ')}\n                      </div>\n                    </td>\n                  </tr>');
fs.writeFileSync('src/pages/stores/StoresPage.tsx', stores);

// Fix ShiftsPage
let shifts = fs.readFileSync('src/pages/shifts/ShiftsPage.tsx', 'utf8');
shifts = shifts.replace(
  '                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Opening Float</th>',
  '                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider bg-[#f8f9fc]">Opening Float</th>'
);
shifts = shifts.replace(
  '                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Closing Cash</th>',
  '                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider bg-[#f8f9fc]">Closing Cash</th>'
);
shifts = shifts.replace(
  '                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Variance</th>',
  '                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider bg-[#f8f9fc]">Variance</th>'
);
shifts = shifts.replace(
  '                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>',
  '                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider bg-[#f8f9fc] last:rounded-r-[16px]">Status</th>'
);
shifts = shifts.replace(
  /<tr key=\{shift\.id\} className="hover:bg-slate-50\/50 transition-colors">/g,
  '<tr key={shift.id} className="group hover:-translate-y-[1px] transition-transform duration-200">'
);
shifts = shifts.replace(
  /<td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-\[#5B58F2\]">/g,
  '<td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-[#5B58F2] bg-white border-y border-gray-100 first:border-l first:rounded-l-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow">'
);
shifts = shifts.replace(
  /<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">/g,
  '<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500 bg-white border-y border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow">'
);
shifts = shifts.replace(
  /<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">/g,
  '<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-500 bg-white border-y border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow">'
);
shifts = shifts.replace(
  /<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium bg-white border-y border-r border-gray-100 last:rounded-r-\[24px\] shadow-\[0_2px_10px_rgba\(0,0,0,0\.02\)\] group-hover:shadow-\[0_4px_20px_rgba\(0,0,0,0\.04\)\] transition-shadow">\s*<div className="flex items-center justify-end space-x-2 pr-2">/g,
  '<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium bg-white border-y border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow">'
);
// Fix the Status td which wrongly got the closing div from repair.cjs
shifts = shifts.replace(
  /<td className="px-6 py-4 whitespace-nowrap text-center">\s*<span className={`px-2 py-1 text-xs font-medium rounded-full \$\{shift\.status === 'OPEN' \? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'\}`}>\s*\{shift\.status\}\s*<\/span>\s*<\/div>\s*<\/td>/g,
  '<td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium bg-white border-y border-r border-gray-100 last:rounded-r-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow">\n                      <span className={`px-3 py-1 inline-flex text-xs font-bold rounded-full ${shift.status === \'OPEN\' ? \'bg-green-100 text-green-700\' : \'bg-gray-100 text-gray-600\'}`}>\n                        {shift.status}\n                      </span>\n                    </td>'
);
fs.writeFileSync('src/pages/shifts/ShiftsPage.tsx', shifts);
