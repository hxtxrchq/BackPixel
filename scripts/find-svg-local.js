import fs from 'node:fs';
import path from 'node:path';

const searchDir = 'd:/PROGRAMACION/PROYECTOS/PixelBros/Cagar archivos';

function findSvgs(dir, files = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return files;
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findSvgs(fullPath, files);
    } else {
      if (entry.name.toLowerCase().endsWith('.svg')) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

const found = findSvgs(searchDir);
console.log('Found SVGs:', found);
