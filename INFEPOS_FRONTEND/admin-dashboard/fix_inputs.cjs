const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    try {
      filelist = fs.statSync(dirFile).isDirectory()
        ? walkSync(dirFile, filelist)
        : filelist.concat(dirFile);
    } catch (err) {
      if (err.code === 'ENOENT') {
        // ignore
      } else throw err;
    }
  });
  return filelist;
};

const files = walkSync('./src/pages').filter(f => f.endsWith('.tsx'));

let updatedFiles = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Fix Search Inputs
  const inputClassRegex = /className="block w-full pl-11 pr-4 py-2\.5 text-sm border border-gray-100 rounded-full focus:ring-\[#5B58F2\] focus:border-\[#5B58F2\] transition-colors shadow-\[0_2px_10px_rgba\(0,0,0,0\.02\)\] bg-gray-50\/50"/g;
  content = content.replace(inputClassRegex, 'className="block w-full pl-11 pr-4 py-2.5 text-sm border border-gray-200 rounded-full focus:ring-2 focus:ring-[#5B58F2] focus:border-transparent transition-colors shadow-sm bg-white text-gray-800 placeholder-gray-400"');
  
  const inputClassRegex2 = /className="block w-full pl-11 pr-4 py-2\.5 text-sm border border-gray-100 rounded-full focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50\/50"/g;
  content = content.replace(inputClassRegex2, 'className="block w-full pl-11 pr-4 py-2.5 text-sm border border-gray-200 rounded-full focus:ring-2 focus:ring-[#5B58F2] focus:border-transparent transition-colors shadow-sm bg-white text-gray-800 placeholder-gray-400"');

  // Fix Selects
  const selectClassRegex = /className="block w-full pl-4 pr-10 py-2\.5 text-sm border border-gray-100 rounded-full focus:ring-\[#5B58F2\] focus:border-\[#5B58F2\] transition-colors shadow-\[0_2px_10px_rgba\(0,0,0,0\.02\)\] bg-gray-50\/50 appearance-none"/g;
  content = content.replace(selectClassRegex, 'className="block w-full pl-4 pr-8 py-2.5 text-sm border border-gray-200 rounded-full focus:ring-2 focus:ring-[#5B58F2] focus:border-transparent transition-colors shadow-sm bg-white text-gray-800 cursor-pointer"');
  
  const selectClassRegex2 = /className="block w-full pl-4 pr-10 py-2\.5 text-sm border border-gray-100 rounded-full focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50\/50 appearance-none"/g;
  content = content.replace(selectClassRegex2, 'className="block w-full pl-4 pr-8 py-2.5 text-sm border border-gray-200 rounded-full focus:ring-2 focus:ring-[#5B58F2] focus:border-transparent transition-colors shadow-sm bg-white text-gray-800 cursor-pointer"');

  // Also replace any variant that might be slightly different
  const inputClassVariant = /className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"/g;
  content = content.replace(inputClassVariant, 'className="block w-full pl-11 pr-4 py-2.5 text-sm border border-gray-200 rounded-full focus:ring-2 focus:ring-[#5B58F2] focus:border-transparent transition-colors shadow-sm bg-white text-gray-800 placeholder-gray-400"');

  const inputClassVariant2 = /className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"/g;
  content = content.replace(inputClassVariant2, 'className="block w-full pl-11 pr-4 py-2.5 text-sm border border-gray-200 rounded-full focus:ring-2 focus:ring-[#5B58F2] focus:border-transparent transition-colors shadow-sm bg-white text-gray-800 placeholder-gray-400"');

  // Let's also do a general replace for any search input inside the pages that has pl-10 or pl-11 and is meant to be a rounded input.
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    updatedFiles++;
    console.log(`Updated ${file}`);
  }
}

console.log(`Finished. Updated ${updatedFiles} files.`);
