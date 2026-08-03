import fs from 'node:fs';
import path from 'node:path';

const manifestPath = 'd:/PROGRAMACION/PROYECTOS/PixelBros/Frontend/src/config/cloudinaryManifest.json';
const workspaceDir = 'd:/PROGRAMACION/PROYECTOS/PixelBros';

function buildFileMap(dir, map = new Map()) {
  if (dir.includes('node_modules') || dir.includes('.git') || dir.includes('.next') || dir.includes('dist')) {
    return map;
  }
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return map;
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      buildFileMap(fullPath, map);
    } else {
      const name = entry.name.toLowerCase();
      if (!map.has(name)) {
        map.set(name, []);
      }
      map.get(name).push(fullPath);
    }
  }
  return map;
}

try {
  console.log('Building workspace file map...');
  const fileMap = buildFileMap(workspaceDir);
  console.log(`Unique filenames indexed: ${fileMap.size}`);

  const content = fs.readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(content);
  
  let foundCount = 0;
  let missingCount = 0;
  const missing = [];

  for (const [key, url] of Object.entries(manifest)) {
    const fileName = key.split('/').pop().toLowerCase();
    
    // Check if filename exists in our workspace map
    if (fileMap.has(fileName)) {
      foundCount++;
    } else {
      missingCount++;
      missing.push({ key, url });
    }
  }

  console.log(`Found by filename: ${foundCount}`);
  console.log(`Missing entirely: ${missingCount}`);
  if (missing.length > 0) {
    console.log('Sample missing files (first 20):');
    missing.slice(0, 20).forEach(m => console.log(` - ${m.key} -> ${m.url}`));
  }
} catch (error) {
  console.error('Error:', error);
}
