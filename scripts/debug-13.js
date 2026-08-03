import fs from 'node:fs';
import path from 'node:path';

const manifestPath = path.resolve('../Frontend/src/config/cloudinaryManifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

console.log('Manifest keys count:', Object.keys(manifest).length);

const targetUrl = 'https://res.cloudinary.com/drbiifrto/image/upload/v1780629712/pixelbros/Portfolio/Diseno_de_Identidad_Visual/Dulce_Cuidado/13.webp';

let foundKey = null;
for (const [key, value] of Object.entries(manifest)) {
  if (value === targetUrl || key.includes('13')) {
    foundKey = key;
    console.log(`Found: "${key}": "${value}"`);
  }
}

if (!foundKey) {
  console.log('Target URL not found in manifest.');
}
