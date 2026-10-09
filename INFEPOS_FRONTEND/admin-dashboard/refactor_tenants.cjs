const fs = require('fs');
const files = [
  'src/components/tenants/TenantFormModal.tsx',
  'src/components/tenants/EditTenantModal.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  // Outer Wrapper
  content = content.replace(
    /bg-white rounded-lg shadow-xl w-full max-w-lg p-6 overflow-hidden/g,
    'bg-white rounded-[30px] shadow-[0px_8px_40px_rgba(0,0,0,0.08)] border border-gray-100 w-full max-w-lg p-8 overflow-hidden'
  );
  
  content = content.replace(
    /bg-white rounded-lg shadow-xl w-full max-w-md p-6 overflow-hidden/g,
    'bg-white rounded-[30px] shadow-[0px_8px_40px_rgba(0,0,0,0.08)] border border-gray-100 w-full max-w-md p-8 overflow-hidden'
  );

  // Backdrop
  content = content.replace(
    /bg-gray-500 bg-opacity-75/g,
    'bg-slate-900/40 backdrop-blur-sm'
  );

  // Inputs
  content = content.replace(
    /mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm/g,
    'block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm'
  );
  
  content = content.replace(
    /block w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm/g,
    'block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm'
  );

  // Cancel Button
  content = content.replace(
    /mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm/g,
    'mt-3 w-full inline-flex justify-center rounded-full border border-gray-200 shadow-sm px-6 py-2.5 bg-white text-base font-bold text-gray-700 hover:bg-gray-50 focus:outline-none hover:-translate-y-0.5 transition-all sm:mt-0 sm:w-auto sm:text-sm'
  );

  fs.writeFileSync(file, content);
}
