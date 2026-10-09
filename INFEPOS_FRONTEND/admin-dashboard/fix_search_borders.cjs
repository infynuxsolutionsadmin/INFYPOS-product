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
      // ignore
    }
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

  // 1. Clean the wrapper divs
  // Look for `<div className="relative...` that contains an `<input` inside it shortly after
  content = content.replace(/(<div\s+className="relative[^"]*)("[\s\S]{0,100}?<input)/g, (match, classStr, rest) => {
    // Remove bad classes from the wrapper
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

  // 2. Replace input classes
  content = content.replace(/<input\s+([^>]*placeholder="[^"]*(?i:Search)[^"]*"[^>]*)>/g, (match, inner) => {
    if (inner.includes('className="')) {
      return match.replace(/className="[^"]*"/, `className="${targetInputClass}"`);
    }
    return match;
  });

  // 3. Replace select classes
  content = content.replace(/<select\s+([^>]*)>/g, (match, inner) => {
    if (inner.includes('className="')) {
      return match.replace(/className="[^"]*"/, `className="${targetSelectClass}"`);
    }
    return match;
  });

  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    updatedFiles++;
    console.log(`Updated ${file}`);
  }
}

console.log(`Finished. Updated ${updatedFiles} files.`);
