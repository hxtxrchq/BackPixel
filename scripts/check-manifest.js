import fs from 'fs';
import path from 'path';

const manifestPath = 'd:/PROGRAMACION/PROYECTOS/PixelBros/Frontend/src/config/cloudinaryManifest.json';
const content = fs.readFileSync(manifestPath, 'utf-8');
const manifest = JSON.parse(content);

console.log('Total keys:', Object.keys(manifest).length);
const keys = Object.keys(manifest).filter(k => k.toLowerCase().includes('frissagio'));
console.log('Frissagio keys:', keys);
for (const k of keys) {
  console.log(`  ${k}: ${manifest[k]}`);
}
