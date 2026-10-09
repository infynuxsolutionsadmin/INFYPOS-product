const fs = require('fs');

const file = 'src/components/users/UserFormModal.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /<div className="flex justify-between items-center mb-5 border-b pb-3">\s*<h3 className="text-lg font-medium text-gray-900">/g,
  `<div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-[#1a1f36]">`
);

content = content.replace(
  /mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500/g,
  'block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm disabled:opacity-50'
);

content = content.replace(
  /mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm focus:ring-blue-500 focus:border-blue-500/g,
  'block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm'
);

const footerRegex = /<div className="bg-gray-50 px-4 py-3 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 rounded-b-lg border-t flex flex-row-reverse gap-3">[\s\S]*?<\/div>\s*<\/form>/;
const newFooter = `<div className="bg-slate-50/50 px-4 py-4 sm:px-8 sm:flex sm:flex-row-reverse mt-8 -mx-6 sm:-mx-8 -mb-6 sm:-mb-8 rounded-b-[30px] border-t border-gray-100">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex justify-center rounded-full border border-transparent shadow-[0_4px_14px_0_rgba(99,102,241,0.39)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.23)] px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-base font-bold text-white hover:from-indigo-600 hover:to-purple-700 focus:outline-none hover:-translate-y-0.5 transition-all sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:pointer-events-none"
                >
                  {loading ? 'Saving...' : isEdit ? 'Update User' : 'Create User'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="mt-3 w-full inline-flex justify-center rounded-full border border-gray-200 shadow-sm px-6 py-2.5 bg-white text-base font-bold text-gray-700 hover:bg-gray-50 focus:outline-none hover:-translate-y-0.5 transition-all sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:pointer-events-none"
                >
                  Cancel
                </button>
              </div>
            </form>`;
content = content.replace(footerRegex, newFooter);

fs.writeFileSync(file, content);
