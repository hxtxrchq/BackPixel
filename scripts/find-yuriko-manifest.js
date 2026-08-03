import fs from 'node:fs';
import path from 'node:path';

const manifestPath = path.resolve('../Frontend/src/config/cloudinaryManifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

console.log('Searching manifest keys for Yuriko:');
let found = 0;
for (const [key, value] of Object.entries(manifest)) {
  if (key.toLowerCase().includes('yuriko')) {
    console.log(`Key: ${key} | Value: ${value}`);
    found++;
  }
}
console.log(`Found ${found} keys.`);
