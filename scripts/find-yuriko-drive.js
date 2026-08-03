import fs from 'node:fs';
import path from 'node:path';

const searchDirs = ['d:/PROGRAMACION', 'd:/', 'd:/Descargas'];

function scanForYurikoFolders(baseDir) {
  let entries;
  try {
    entries = fs.readdirSync(baseDir, { withFileTypes: true });
  } catch (e) {
    return;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const nameLower = entry.name.toLowerCase();
      if (nameLower.includes('yuriko') || nameLower.includes('cargasdearchivos') || nameLower.includes('cargas')) {
        console.log(`Found matching folder: ${path.join(baseDir, entry.name)}`);
      }
      // Scan up to depth 3
      if (baseDir.split(path.sep).length < 5) {
        scanForYurikoFolders(path.join(baseDir, entry.name));
      }
    }
  }
}

console.log('Scanning directories...');
for (const dir of searchDirs) {
  scanForYurikoFolders(dir);
}
console.log('Scan completed.');
