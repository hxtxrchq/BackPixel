import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const manifestPath = path.resolve('../Frontend/src/config/cloudinaryManifest.json');

async function main() {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const manifestUrls = new Set(Object.values(manifest));

  console.log(`Loaded ${manifestUrls.size} URLs from manifest.`);

  // Find all URLs in DB
  const contents = await prisma.content.findMany({
    select: { coverUrl: true, logoUrl: true, medias: { select: { url: true } } }
  });

  const dbUrls = new Set();
  const missingKeysMap = new Map(); // url -> suggested manifestKey

  for (const c of contents) {
    if (c.coverUrl) dbUrls.add(c.coverUrl);
    if (c.logoUrl) dbUrls.add(c.logoUrl);
    for (const m of c.medias) {
      if (m.url) dbUrls.add(m.url);
    }
  }

  console.log(`Found ${dbUrls.size} unique URLs in database.`);

  const oldCloudBase = 'https://res.cloudinary.com/drbiifrto/';

  for (const url of dbUrls) {
    if (url.startsWith(oldCloudBase) && !manifestUrls.has(url)) {
      // It's an old Cloudinary URL not in the manifest!
      // Let's reconstruct the manifest key from the URL path.
      // e.g. "https://res.cloudinary.com/drbiifrto/image/upload/v1780629712/pixelbros/Portfolio/Diseno_de_Identidad_Visual/Dulce_Cuidado/13.webp"
      // Reconstruct key: "/Portfolio/Diseño de Identidad Visual/Dulce Cuidado/13.webp"
      const decodedUrl = decodeURIComponent(url);
      const match = decodedUrl.match(/\/pixelbros\/(.+)$/);
      if (match) {
        let relPath = match[1];
        // Clean up version numbers if any (e.g. v12345/) or upload path prefixes
        // Wait, the path after "/pixelbros/" is: "Portfolio/Diseno_de_Identidad_Visual/Dulce_Cuidado/13.webp"
        // Let's map "Diseno_de_Identidad_Visual" -> "Diseño de Identidad Visual"
        let manifestKey = '/' + relPath
          .replace('Diseno_de_Identidad_Visual', 'Diseño de Identidad Visual')
          .replace('Dulce_Cuidado', 'Dulce Cuidado');
        
        missingKeysMap.set(manifestKey, url);
      } else {
        console.log(`Could not reconstruct key for URL: ${url}`);
      }
    }
  }

  console.log(`\nFound ${missingKeysMap.size} missing keys:`);
  for (const [key, url] of missingKeysMap.entries()) {
    console.log(`"${key}": "${url}"`);
  }
}

main().finally(() => prisma.$disconnect());
