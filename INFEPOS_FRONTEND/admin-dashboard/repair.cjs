const fs = require('fs');
const path = require('path');

const files = [
  'src/pages/stores/StoresPage.tsx',
  'src/pages/inventory/InventoryPage.tsx',
  'src/pages/sales/SalesPage.tsx',
  'src/pages/salesReturns/SalesReturnsPage.tsx',
  'src/pages/shifts/ShiftsPage.tsx',
  'src/pages/users/UsersPage.tsx',
  'src/pages/roles/RolesPermissionsPage.tsx'
];

for (const file of files) {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${file} - not found`);
    continue;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');

  if (!content.includes('<!-- fixed -->')) {
    // 1. Fix missing closing div for the table container
    // We added <div className="bg-white rounded-[30px] ... overflow-hidden">
    // But we never closed it.
    // The end of the file looks like:
    //         )}
    //       </div>
    // 
    //       <ProductFormModal ... />
    //       ...
    //     </div>
    //   );
    // };
    // Let's just find `\n    </div>\n  );\n};` and replace it with `\n      </div>\n    </div>\n  );\n};`
    // Wait, the modals are OUTSIDE the table container but INSIDE the main container.
    // So the missing `</div>` should be right before the modals.
    // Let's find the FIRST `<[A-Za-z]+Modal` or `<[A-Za-z]+ConfirmModal`
    const modalMatch = content.match(/\n\s*<[A-Za-z]+Modal/);
    if (modalMatch) {
       content = content.replace(modalMatch[0], `\n      </div>` + modalMatch[0]);
    } else {
       // If no modals (like SalesPage), it should be before the final `    </div>\n  );\n};`
       content = content.replace(/\n    <\/div>\n  \);\n};/, '\n      </div>\n    </div>\n  );\n};');
    }

    // 2. Fix the unbalanced </div> inside the action <td>
    // The original replacement added `<div className="flex items-center justify-end space-x-2 pr-2">` inside the action <td>
    // And it tried to add `</div>` by replacing `</button>\n                      )} \n                      </div>\n                    </td>`
    // Let's just reset the action td's closing tag by matching `</td>\n                  </tr>`
    // First, remove ANY `</div>` right before `</td>\n                  </tr>` to avoid double closing.
    content = content.replace(/\n\s*<\/div>\n\s*<\/td>\n(\s*)<\/tr>/g, '\n                    </td>\n$1</tr>');
    
    // Now add `</div>` right before the `</td>` for the last td of the row (which is the action td).
    content = content.replace(/(\s*)<\/td>\n(\s*)<\/tr>/g, (match, p1, p2) => {
      return `${p1}  </div>\n${p1}</td>\n${p2}</tr>`;
    });

    content = content + '\n// <!-- fixed -->\n';
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
  }
}
