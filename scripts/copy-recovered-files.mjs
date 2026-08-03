import fs from 'node:fs';
import path from 'node:path';

const recycleDir = 'd:/$RECYCLE.BIN/S-1-5-21-2194752990-3686485303-751804132-1001/$R9AXEWT/DRA_YURIKO';
const destYurikoDir = 'uploads/Portfolio/Social Media/DOCTORA YURIKO';

const srcBrandingDir = '../Cagar archivos/Branding/Dulce Cuidado';
const destBrandingDir = 'uploads/Portfolio/Branding/Dulce Cuidado';

function copyFolderSync(from, to) {
  if (!fs.existsSync(to)) {
    fs.mkdirSync(to, { recursive: true });
  }
  const entries = fs.readdirSync(from);
  for (const entry of entries) {
    const fromPath = path.join(from, entry);
    const toPath = path.join(to, entry);
    fs.copyFileSync(fromPath, toPath);
    console.log(`Copied: ${entry} to ${to}`);
  }
}

async function main() {
  console.log('Copying recovered DRA. YURIKO files from Recycle Bin...');
  try {
    copyFolderSync(recycleDir, destYurikoDir);
    console.log('✅ Recovered DRA. YURIKO files copied.');
  } catch (error) {
    console.error('❌ Failed to copy DRA. YURIKO files:', error.message);
  }

  console.log('\nCopying new SVGs for Dulce Cuidado from Cagar archivos...');
  try {
    if (!fs.existsSync(destBrandingDir)) {
      fs.mkdirSync(destBrandingDir, { recursive: true });
    }
    // Copy BANNER_DESTACADOS.svg to 7.svg
    fs.copyFileSync(path.join(srcBrandingDir, 'BANNER_DESTACADOS.svg'), path.join(destBrandingDir, '7.svg'));
    console.log('Copied BANNER_DESTACADOS.svg to 7.svg');

    // Copy BANNER_ICON.svg to 9.svg
    fs.copyFileSync(path.join(srcBrandingDir, 'BANNER_ICON.svg'), path.join(destBrandingDir, '9.svg'));
    console.log('Copied BANNER_ICON.svg to 9.svg');
    
    console.log('✅ SVGs copied.');
  } catch (error) {
    console.error('❌ Failed to copy SVGs:', error.message);
  }
}

main();
