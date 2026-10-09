const fs = require('fs');
const path = require('path');

function getFiles(dir, files = []) {
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getFiles(fullPath, files);
    } else if (file.endsWith('Modal.tsx')) {
      files.push(fullPath);
    }
  }
  return files;
}

const files = getFiles('src/components');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  // Outer Wrapper
  content = content.replace(
    /bg-white rounded-lg text-left overflow-hidden shadow-xl/g,
    'bg-white rounded-[30px] text-left overflow-hidden shadow-[0px_8px_40px_rgba(0,0,0,0.08)] border border-gray-100'
  );

  // Inner Padding
  content = content.replace(
    /bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4/g,
    'bg-white px-6 pt-6 pb-6 sm:p-8 sm:pb-8'
  );

  // Titles
  content = content.replace(
    /text-lg leading-6 font-medium text-gray-900/g,
    'text-xl font-bold text-[#1a1f36]'
  );

  // Labels
  content = content.replace(
    /block text-sm font-medium text-gray-700/g,
    'block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5'
  );

  // Text/Email Inputs & Selects
  content = content.replace(
    /mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm/g,
    'block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm'
  );
  
  content = content.replace(
    /mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md/g,
    'block w-full pl-4 pr-10 py-2.5 text-sm font-medium text-gray-800 border-gray-200 bg-gray-50/50 rounded-2xl focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm'
  );

  // Checkboxes
  content = content.replace(
    /h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded/g,
    'h-4 w-4 text-[#5B58F2] focus:ring-[#5B58F2] border-gray-300 rounded-md'
  );

  // Bottom Button Bar
  content = content.replace(
    /bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse mt-5 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 rounded-b-lg/g,
    'bg-slate-50/50 px-4 py-4 sm:px-8 sm:flex sm:flex-row-reverse mt-8 -mx-6 sm:-mx-8 -mb-6 sm:-mb-8 rounded-b-[30px] border-t border-gray-100'
  );
  // Alternative Button Bar (some don't have -mx -mb)
  content = content.replace(
    /bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse/g,
    'bg-slate-50/50 px-6 py-5 sm:px-8 sm:flex sm:flex-row-reverse border-t border-gray-100 rounded-b-[30px]'
  );

  // Buttons - Primary
  content = content.replace(
    /w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50/g,
    'w-full inline-flex justify-center rounded-full border border-transparent shadow-[0_4px_14px_0_rgba(99,102,241,0.39)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.23)] px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-base font-bold text-white hover:from-indigo-600 hover:to-purple-700 focus:outline-none hover:-translate-y-0.5 transition-all sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:pointer-events-none'
  );

  // Buttons - Secondary
  content = content.replace(
    /mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50/g,
    'mt-3 w-full inline-flex justify-center rounded-full border border-gray-200 shadow-sm px-6 py-2.5 bg-white text-base font-bold text-gray-700 hover:bg-gray-50 focus:outline-none hover:-translate-y-0.5 transition-all sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:pointer-events-none'
  );
  // Secondary (no ml-3)
  content = content.replace(
    /mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm disabled:opacity-50/g,
    'mt-3 w-full inline-flex justify-center rounded-full border border-gray-200 shadow-sm px-6 py-2.5 bg-white text-base font-bold text-gray-700 hover:bg-gray-50 focus:outline-none hover:-translate-y-0.5 transition-all sm:mt-0 sm:w-auto sm:text-sm disabled:opacity-50 disabled:pointer-events-none'
  );

  // Buttons - Danger
  content = content.replace(
    /w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50/g,
    'w-full inline-flex justify-center rounded-full border border-transparent shadow-[0_4px_14px_0_rgba(239,68,68,0.39)] hover:shadow-[0_6px_20px_rgba(239,68,68,0.23)] px-6 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-base font-bold text-white hover:from-red-600 hover:to-red-700 focus:outline-none hover:-translate-y-0.5 transition-all sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:pointer-events-none'
  );
  
  // Backdrops
  content = content.replace(
    /bg-gray-500 opacity-75/g,
    'bg-slate-900/40 backdrop-blur-sm'
  );

  fs.writeFileSync(file, content);
}
