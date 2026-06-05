/**
 * fix-large-uploads.mjs
 * Uploads large files (>100MB videos, >10MB photos) using chunked upload_large.
 * Handles:
 *   - AudioVisual/GMS (154MB video) → CREATE new entry
 *   - Design Market → ADD missing DM_CASA_R2.mp4 (110MB) to existing entry
 *   - GMS Perú → ADD missing GMS_HCO.mp4 (186MB) to existing entry
 *   - Fotografia/DULCE CUIDADO → CREATE new entry
 *   - Fotografia/LA VIEJA TABERNA → CREATE new entry
 */

import 'dotenv/config';
import { v2 as cloudinary } from 'cloudinary';
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const prisma = new PrismaClient();
const PORTFOLIO_ROOT = path.resolve('uploads/Portfolio');
const LOGOS_ROOT = path.resolve('../Frontend/public/logos');
const CLOUD_FOLDER = 'pixelbros/content';

function slugify(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function collectFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...collectFiles(full));
    else {
      const ext = path.extname(entry.name).toLowerCase();
      if (['.jpg','.jpeg','.png','.gif','.webp','.svg','.mp4','.mov','.avi','.webm'].includes(ext))
        files.push(full);
    }
  }
  return files;
}

/** Upload any file using upload_large (chunked, supports any size) */
async function uploadLarge(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const isVideo = ['.mp4','.mov','.avi','.webm'].includes(ext);
  const resourceType = isVideo ? 'video' : 'image';
  const publicId = `${Date.now()}_${randomBytes(3).toString('hex')}_${path.basename(filePath, ext).replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const sizeMB = (fs.statSync(filePath).size / 1024 / 1024).toFixed(1);

  console.log(`    ↑ ${path.basename(filePath)} (${sizeMB}MB, ${resourceType}, chunked)...`);

  const result = await cloudinary.uploader.upload_large(filePath, {
    folder: CLOUD_FOLDER,
    public_id: publicId,
    resource_type: resourceType,
    chunk_size: 20 * 1024 * 1024, // 20MB chunks
  });

  return {
    url: result.secure_url,
    mimeType: isVideo ? `video/${ext.slice(1)||'mp4'}` : `image/${ext.slice(1)||'jpeg'}`,
  };
}

// ── 1. CREATE AudioVisual/GMS ────────────────────────────────────────────────
async function createGMSAudiovisual() {
  console.log('\n📦 Creating: GMS (AudioVisual)');
  const filePath = path.join(PORTFOLIO_ROOT, 'AudioVisual', 'GMS', '1.mp4');
  const { url, mimeType } = await uploadLarge(filePath);
  const uid = randomBytes(4).toString('hex');
  await prisma.content.create({
    data: {
      companyName: 'GMS',
      title: 'GMS',
      slug: `audiovisual-gms-${uid}`,
      category: 'AudioVisual',
      showOnHome: false,
      showOnPortfolio: true,
      coverUrl: url,
      coverMimeType: mimeType,
      galleryCount: 0,
    },
  });
  console.log('  ✅ Created GMS AudioVisual');
}

// ── 2. ADD DM_CASA_R2.mp4 to existing Design Market ─────────────────────────
async function addDesignMarketVideo() {
  console.log('\n📦 Adding missing video to: Design Market');
  const filePath = path.join(PORTFOLIO_ROOT, 'Social Media', 'Design Market', 'DM_CASA_R2.mp4');
  const { url, mimeType } = await uploadLarge(filePath);

  const entry = await prisma.content.findFirst({
    where: { companyName: 'Design Market' },
    include: { medias: { orderBy: { sortOrder: 'desc' }, take: 1 } },
  });

  if (!entry) { console.log('  ⚠️  Design Market entry not found in DB, skipping'); return; }

  const nextOrder = (entry.medias[0]?.sortOrder ?? -1) + 1;
  await prisma.contentMedia.create({
    data: { contentId: entry.id, url, mimeType, sortOrder: nextOrder },
  });
  await prisma.content.update({
    where: { id: entry.id },
    data: { galleryCount: entry.galleryCount + 1 },
  });
  console.log('  ✅ Added DM_CASA_R2.mp4 to Design Market');
}

// ── 3. ADD GMS_HCO.mp4 to existing GMS Perú ─────────────────────────────────
async function addGMSHCO() {
  console.log('\n📦 Adding missing video to: GMS Perú');
  const filePath = path.join(PORTFOLIO_ROOT, 'Social Media', 'GMS Perú', 'GMS_HCO.mp4');
  const { url, mimeType } = await uploadLarge(filePath);

  const entry = await prisma.content.findFirst({
    where: { companyName: 'GMS Perú' },
    include: { medias: { orderBy: { sortOrder: 'desc' }, take: 1 } },
  });

  if (!entry) { console.log('  ⚠️  GMS Perú entry not found in DB, skipping'); return; }

  const nextOrder = (entry.medias[0]?.sortOrder ?? -1) + 1;
  await prisma.contentMedia.create({
    data: { contentId: entry.id, url, mimeType, sortOrder: nextOrder },
  });
  await prisma.content.update({
    where: { id: entry.id },
    data: { galleryCount: entry.galleryCount + 1 },
  });
  console.log('  ✅ Added GMS_HCO.mp4 to GMS Perú');
}

// ── 4. CREATE Fotografia projects ────────────────────────────────────────────
async function createFotografia(folderName, companyName, logoFile) {
  console.log(`\n📦 Creating: ${companyName} (Fotografia)`);
  const dir = path.join(PORTFOLIO_ROOT, 'Fotografia', folderName);
  const files = collectFiles(dir);

  if (files.length === 0) { console.log('  ⚠️  No files found'); return; }
  console.log(`  Found ${files.length} files`);

  // Upload cover (first file)
  const { url: coverUrl, mimeType: coverMimeType } = await uploadLarge(files[0]);

  // Upload logo if provided
  let logoUrl, logoMimeType;
  if (logoFile) {
    const logoPath = path.join(LOGOS_ROOT, logoFile);
    if (fs.existsSync(logoPath)) {
      console.log(`  🏷️  Logo: ${logoFile}`);
      const r = await uploadLarge(logoPath);
      logoUrl = r.url; logoMimeType = r.mimeType;
    }
  }

  // Upload gallery (remaining files)
  const gallery = [];
  for (let i = 1; i < files.length; i++) {
    try {
      const r = await uploadLarge(files[i]);
      gallery.push({ url: r.url, mimeType: r.mimeType, sortOrder: i - 1 });
    } catch (e) {
      console.log(`  ⚠️  Failed: ${path.basename(files[i])}: ${e.message}`);
    }
  }

  const uid = randomBytes(4).toString('hex');
  await prisma.content.create({
    data: {
      companyName,
      title: companyName,
      slug: `fotografia-${slugify(companyName)}-${uid}`,
      category: 'Fotografia',
      showOnHome: false,
      showOnPortfolio: true,
      coverUrl, coverMimeType, logoUrl, logoMimeType,
      galleryCount: gallery.length,
      medias: { create: gallery },
    },
  });
  console.log(`  ✅ Created ${companyName} (cover ✓, gallery: ${gallery.length} files)`);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Fixing large file uploads (chunked)...\n');

  try { await createGMSAudiovisual(); } catch(e) { console.error('  ❌ GMS AudioVisual:', e.message); }
  try { await addDesignMarketVideo(); } catch(e) { console.error('  ❌ Design Market video:', e.message); }
  try { await addGMSHCO(); } catch(e) { console.error('  ❌ GMS HCO video:', e.message); }
  try { await createFotografia('DULCE CUIDADO', 'Dulce Cuidado (Fotografía)', null); } catch(e) { console.error('  ❌ Fotografia Dulce Cuidado:', e.message); }
  try { await createFotografia('LA VIEJA TABERNA', 'La Vieja Taberna (Fotografía)', 'LaViejaTaberna.png'); } catch(e) { console.error('  ❌ Fotografia La Vieja Taberna:', e.message); }

  console.log('\n✅ Done!');
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Fatal:', e);
  await prisma.$disconnect();
  process.exit(1);
});
