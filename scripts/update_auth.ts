import fs from 'fs';
import path from 'path';

const filesToUpdate = [
  'src/components/DragDropUploader.tsx',
  'src/components/AdminDashboard.tsx',
  'src/components/BanksAdmin.tsx',
  'src/components/MediaAdmin.tsx',
  'src/components/admin/ProgramBatchesAdmin.tsx',
  'src/components/admin/LenderEligibilityModal.tsx',
  'src/components/admin/BulkUpdatesAdmin.tsx',
  'src/components/admin/OfferBuilderModal.tsx',
  'src/components/IncentivesAdmin.tsx',
  'src/components/LenderProgramsAdmin.tsx',
  'src/components/BulkEditAdmin.tsx',
  'src/store/settingsStore.ts',
  'src/pages/LeadsAdmin.tsx',
  'src/pages/FeedbackAdmin.tsx',
  'src/pages/CarsAdmin.tsx'
];

for (const file of filesToUpdate) {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if we need to import getAuthToken
    if (content.includes("localStorage.getItem('admin_token')") && !content.includes("getAuthToken")) {
      // Find the relative path to src/utils/auth
      const depth = file.split('/').length - 2;
      const relativePath = depth === 0 ? './utils/auth' : '../'.repeat(depth) + 'utils/auth';
      
      // Add import after the last import statement
      const importStatement = `import { getAuthToken } from '${relativePath}';\n`;
      const lastImportIndex = content.lastIndexOf('import ');
      if (lastImportIndex !== -1) {
        const endOfLastImport = content.indexOf('\n', lastImportIndex) + 1;
        content = content.slice(0, endOfLastImport) + importStatement + content.slice(endOfLastImport);
      } else {
        content = importStatement + content;
      }
    }
    
    // Replace localStorage.getItem('admin_token') with await getAuthToken()
    content = content.replace(/localStorage\.getItem\('admin_token'\) \|\| ''/g, 'await getAuthToken()');
    content = content.replace(/localStorage\.getItem\('admin_token'\) \|\| 'default_dev_secret'/g, 'await getAuthToken()');
    content = content.replace(/localStorage\.getItem\('admin_token'\)/g, 'await getAuthToken()');
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
  }
}
