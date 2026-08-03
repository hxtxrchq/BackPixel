import fs from 'node:fs';
import path from 'node:path';

const searchDir = 'd:/PROGRAMACION/PROYECTOS/PixelBros';

function findDulce(dir, files = []) {
  if (dir.includes('node_modules') || dir.includes('.git') || dir.includes('.next') || dir.includes('dist')) {
    return files;
  }
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return files;
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findDulce(fullPath, files);
    } else {
      if (fullPath.toLowerCase().includes('dulce') || fullPath.toLowerCase().includes('cuidado')) {
        files.push({
          path: fullPath,
          size: fs.statSync(fullPath).size
        });
      }
    }
  }
  return files;
}

const found = findDulce(searchDir);
console.log(`Found ${found.length} Dulce Cuidado files in workspace:`);
found.forEach(f => {
  console.log(` - ${path.relative(searchDir, f.path)} (${(f.size / 1024).toFixed(1)} KB)`);
});
