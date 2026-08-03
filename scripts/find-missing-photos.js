import fs from 'node:fs';
import path from 'node:path';

const searchDirs = ['d:/PROGRAMACION', 'd:/', 'd:/Descargas'];

function scanForPhotos(baseDir) {
  let entries;
  try {
    entries = fs.readdirSync(baseDir, { withFileTypes: true });
  } catch (e) {
    return;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      // Scan up to depth 4
      if (baseDir.split(path.sep).length < 6) {
        scanForPhotos(path.join(baseDir, entry.name));
      }
    } else {
      const nameLower = entry.name.toLowerCase();
      if (nameLower.includes('dsc03202') || nameLower.includes('dsc04028') || nameLower.includes('dsc04043')) {
        console.log(`Found photo: ${path.join(baseDir, entry.name)}`);
      }
    }
  }
}

console.log('Scanning directories...');
for (const dir of searchDirs) {
  scanForPhotos(dir);
}
console.log('Scan completed.');
