import fs from 'node:fs';
import path from 'node:path';

const searchDir = 'd:/PROGRAMACION/PROYECTOS/PixelBros';

function findMedia(dir, mediaFiles = []) {
  if (dir.includes('node_modules') || dir.includes('.git') || dir.includes('.next') || dir.includes('dist')) {
    return mediaFiles;
  }
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return mediaFiles;
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findMedia(fullPath, mediaFiles);
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.mp4', '.mov'].includes(ext)) {
        mediaFiles.push({
          path: fullPath,
          size: fs.statSync(fullPath).size
        });
      }
    }
  }
  return mediaFiles;
}

const media = findMedia(searchDir);
console.log(`Found ${media.length} media files in workspace:`);
const grouped = {};
for (const m of media) {
  const rel = path.relative(searchDir, m.path);
  const topDir = rel.split(path.sep)[0];
  grouped[topDir] = (grouped[topDir] || 0) + 1;
}
console.log(grouped);
console.log('Sample files:');
media.slice(0, 20).forEach(m => {
  console.log(` - ${path.relative(searchDir, m.path)} (${(m.size / 1024 / 1024).toFixed(2)} MB)`);
});
