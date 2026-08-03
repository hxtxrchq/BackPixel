import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const BUCKET_NAME = 'pixelbros';

const MANIFEST_PATH = path.resolve('../Frontend/src/config/cloudinaryManifest.json');

const svgs = [
  {
    manifestKey: '/Portfolio/Diseño de Identidad Visual/Dulce Cuidado/7.svg',
    local: 'uploads/Portfolio/Branding/Dulce Cuidado/7.svg',
    storage: 'Portfolio/Diseno_de_Identidad_Visual/Dulce_Cuidado/7_v2.svg'
  },
  {
    manifestKey: '/Portfolio/Diseño de Identidad Visual/Dulce Cuidado/9.svg',
    local: 'uploads/Portfolio/Branding/Dulce Cuidado/9.svg',
    storage: 'Portfolio/Diseno_de_Identidad_Visual/Dulce_Cuidado/9_v2.svg'
  }
];

async function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

  for (const svg of svgs) {
    const fileUrl = `${supabaseUrl}/storage/v1/object/${BUCKET_NAME}/${svg.storage}`;
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${svg.storage}`;
    console.log(`\nUploading ${svg.storage} from ${svg.local}...`);

    const fileBuffer = fs.readFileSync(svg.local);
    const uploadRes = await fetch(fileUrl, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'image/svg+xml',
        'x-upsert': 'true'
      },
      body: fileBuffer
    });

    if (!uploadRes.ok) {
      const text = await uploadRes.text();
      console.error(`  ❌ Upload failed: ${uploadRes.status} - ${text}`);
      continue;
    }
    console.log(`  ✅ Successfully uploaded to Supabase: ${publicUrl}`);

    // Update manifest
    const oldUrl = manifest[svg.manifestKey];
    manifest[svg.manifestKey] = publicUrl;
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
    console.log(`  💾 Manifest updated for key: ${svg.manifestKey}`);

    // Update database
    let coverUpdates = 0;
    let logoUpdates = 0;
    let mediaUpdates = 0;

    await prisma.$transaction(async (tx) => {
      const contentsWithCover = await tx.content.findMany({ where: { coverUrl: oldUrl } });
      for (const content of contentsWithCover) {
        await tx.content.update({ where: { id: content.id }, data: { coverUrl: publicUrl } });
        coverUpdates++;
      }
      const contentsWithLogo = await tx.content.findMany({ where: { logoUrl: oldUrl } });
      for (const content of contentsWithLogo) {
        await tx.content.update({ where: { id: content.id }, data: { logoUrl: publicUrl } });
        logoUpdates++;
      }
      const mediasWithUrl = await tx.contentMedia.findMany({ where: { url: oldUrl } });
      for (const media of mediasWithUrl) {
        await tx.contentMedia.update({ where: { id: media.id }, data: { url: publicUrl } });
        mediaUpdates++;
      }
    });

    console.log(`  ✅ Database updated: coverUrl (${coverUpdates}), logoUrl (${logoUpdates}), mediaUrl (${mediaUpdates})`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
