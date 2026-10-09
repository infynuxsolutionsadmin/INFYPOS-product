const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    try {
      if (fs.statSync(dirFile).isDirectory()) {
        filelist = walkSync(dirFile, filelist);
      } else {
        filelist.push(dirFile);
      }
    } catch (err) {}
  });
  return filelist;
};

const files = walkSync('./src/pages').filter(f => f.endsWith('.tsx'));
let updatedFiles = 0;

const targetInputClass = 'block w-full pl-11 pr-4 py-2.5 text-sm border border-gray-200 rounded-full focus:ring-2 focus:ring-[#5B58F2] focus:border-transparent outline-none transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-white text-gray-800 placeholder-gray-400';
const targetSelectClass = 'block w-full pl-4 pr-10 py-2.5 text-sm border border-gray-200 rounded-full focus:ring-2 focus:ring-[#5B58F2] focus:border-transparent outline-none transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-white text-gray-800 cursor-pointer';

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Since regex with [^>] fails on arrow functions, let's use a simpler approach.
  // We want to target inputs that are searches. Usually they are in the filters section.
  // We can just replace the specific className strings we know are wrong.
  
  // Or, more robustly, we match `className="[something]"` that is near `placeholder="Search`
  // Actually, we can just split by `<input` and `<select` and process them.
  
  let parts = content.split('<input');
  for (let i = 1; i < parts.length; i++) {
    // Find the end of the input tag. It could have > inside strings.
    // Instead of full parsing, if it contains `placeholder="Search`, replace its className.
    if (parts[i].match(/placeholder="[^"]*Search/i)) {
      parts[i] = parts[i].replace(/className="[^"]*"/, `className="${targetInputClass}"`);
    }
  }
  content = parts.join('<input');

  let selectParts = content.split('<select');
  for (let i = 1; i < selectParts.length; i++) {
    // We assume all selects in pages are filters that need styling.
    // Ensure we don't mess up selects inside forms if any page has them.
    // Pages mostly use forms in modals which are imported. 
    selectParts[i] = selectParts[i].replace(/className="[^"]*"/, `className="${targetSelectClass}"`);
  }
  content = selectParts.join('<select');

  // Fix the wrapper div double borders
  content = content.replace(/(<div\s+className="relative[^"]*)("[\s\S]{0,150}?<input)/g, (match, classStr, rest) => {
    let newClassStr = classStr
      .replace(/\bshadow-sm\b/g, '')
      .replace(/\brounded-2xl\b/g, '')
      .replace(/\brounded-md\b/g, '')
      .replace(/\bborder\b/g, '')
      .replace(/\bborder-gray-\d+\b/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    return newClassStr + rest;
  });

  // Ensure left padding of search icon is pl-4
  content = content.replace(/className="absolute inset-y-0 left-0 pl-[0-9]+ flex items-center pointer-events-none"/g, 'className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"');

  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    updatedFiles++;
    console.log(`Updated ${file}`);
  }
}

console.log(`Finished fixing all inputs. Updated ${updatedFiles} files.`);
