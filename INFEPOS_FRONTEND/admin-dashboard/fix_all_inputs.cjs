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

const inputTargetClass = 'block w-full pl-11 pr-4 py-2.5 text-sm border border-gray-200 rounded-full focus:ring-2 focus:ring-[#5B58F2] focus:border-transparent transition-colors shadow-sm bg-white text-gray-800 placeholder-gray-400';
const selectTargetClass = 'block w-full pl-4 pr-10 py-2.5 text-sm border border-gray-200 rounded-full focus:ring-2 focus:ring-[#5B58F2] focus:border-transparent transition-colors shadow-sm bg-white text-gray-800 cursor-pointer';

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Replace input className where placeholder contains "Search" or "search"
  // Note: we match className="[any]" that precedes or succeeds placeholder="Search..."
  // This requires a function replacement.
  
  // A safer approach: find the entire <input ... /> tag
  content = content.replace(/<input\s+([^>]*placeholder="[^"]*(?i:Search)[^"]*"[^>]*)>/g, (match, inner) => {
    // If it has className, replace it
    if (inner.includes('className="')) {
      const replaced = match.replace(/className="[^"]*"/, `className="${inputTargetClass}"`);
      return replaced;
    }
    return match;
  });

  // Now the trickier part: the selects.
  // The selects in the filter area usually have an onChange handler.
  // We can just replace all <select ...> classNames in pages because all selects in pages are filters.
  // (Forms are usually in modals, not pages).
  content = content.replace(/<select\s+([^>]*)>/g, (match, inner) => {
    if (inner.includes('className="')) {
      // make sure it's not a select inside a form modal if any exist in pages (most are in src/components)
      return match.replace(/className="[^"]*"/, `className="${selectTargetClass}"`);
    }
    return match;
  });

  // Some search inputs might have placeholder before className, some after.
  // The regex `<input\s+([^>]*placeholder="[^"]*(?i:Search)[^"]*"[^>]*)>` captures inputs with Search placeholder.
  
  // Wait, let's also fix the search icon wrapper left padding.
  // Previously some had `pl-3` and some `pl-4`. We should make sure the icon is positioned well.
  // `<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">`
  // We can standardize it to `pl-4`.
  content = content.replace(/className="absolute inset-y-0 left-0 pl-[0-9]+ flex items-center pointer-events-none"/g, 'className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"');

  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    updatedFiles++;
    console.log(`Updated ${file}`);
  }
}

console.log(`Finished. Updated ${updatedFiles} files.`);
