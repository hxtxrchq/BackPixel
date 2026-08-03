import fs from 'node:fs';
import path from 'node:path';

const manifestPath = 'd:/PROGRAMACION/PROYECTOS/PixelBros/Frontend/src/config/cloudinaryManifest.json';
const uploadsDir = 'd:/PROGRAMACION/PROYECTOS/PixelBros/Backend/uploads';

try {
  const content = fs.readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(content);
  
  let matchCount = 0;
  let missingCount = 0;
  const missingFiles = [];

  for (const manifestKey of Object.keys(manifest)) {
    // manifestKey is e.g. "/Portfolio/AudioVisual/FOF Trujillo/1.mp4"
    // Let's see if we can find it under uploadsDir + manifestKey or similar.
    // Sometimes the folder names differ slightly (e.g. Branding vs Diseño de Identidad Visual)
    // Let's do some normalized matching.
    const normalizedKey = manifestKey.replace(/^\//, ''); // "Portfolio/AudioVisual/FOF Trujillo/1.mp4"
    const possiblePaths = [
      path.join(uploadsDir, normalizedKey),
      path.join(uploadsDir, normalizedKey.replace('Diseño de Identidad Visual', 'Branding')),
      path.join(uploadsDir, normalizedKey.replace('Diseño de Identidad Visual', 'Diseno de Identidad Visual')),
      path.join(uploadsDir, normalizedKey.replace('Menu digital', 'Menu Digital')),
      path.join('d:/PROGRAMACION/PROYECTOS/PixelBros', normalizedKey),
      path.join('d:/PROGRAMACION/PROYECTOS/PixelBros', normalizedKey.replace('Diseño de Identidad Visual', 'Branding')),
      path.join('d:/PROGRAMACION/PROYECTOS/PixelBros', 'Cagar archivos', normalizedKey.replace('Portfolio/', ''))
    ];

    let foundPath = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        foundPath = p;
        break;
      }
    }

    if (foundPath) {
      matchCount++;
    } else {
      missingCount++;
      missingFiles.push(manifestKey);
    }
  }

  console.log(`Matched: ${matchCount}`);
  console.log(`Missing: ${missingCount}`);
  if (missingFiles.length > 0) {
    console.log('Sample missing files (first 20):');
    missingFiles.slice(0, 20).forEach(f => console.log(' - ' + f));
  }
} catch (error) {
  console.error('Error:', error);
}
