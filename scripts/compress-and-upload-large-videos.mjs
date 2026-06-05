/**
 * compress-and-upload-large-videos.mjs
 * Compresses videos >100MB with ffmpeg to ~80MB, then uploads to Cloudinary
 * and creates/updates the DB entries.
 */

import 'dotenv/config';
import { v2 as cloudinary } from 'cloudinary';
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { execSync } from 'node:child_process';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const prisma = new PrismaClient();
const PORTFOLIO_ROOT = path.resolve('uploads/Portfolio');
const CLOUD_FOLDER = 'pixelbros/content';
const TMP_DIR = path.resolve('uploads/_compressed');

if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

function slugify(v) {
  return v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function getMB(filePath) {
  return (fs.statSync(filePath).size / 1024 / 1024).toFixed(1);
}

/** Compress video with ffmpeg — CRF 23 = good quality, ~60-80MB for large videos */
function compressVideo(inputPath, outputName) {
  const outputPath = path.join(TMP_DIR, outputName);

  if (fs.existsSync(outputPath)) {
    console.log(`    ♻️  Already compressed: ${outputName} (${getMB(outputPath)}MB)`);
    return outputPath;
  }

  const sizeMB = parseFloat(getMB(inputPath));
  console.log(`    🗜️  Compressing ${path.basename(inputPath)} (${sizeMB}MB) → target ~70MB...`);

  // H.264 Main/4.0 + yuv420p = maximum compatibility with Cloudinary
  execSync(
    `ffmpeg -i "${inputPath}" -vcodec libx264 -crf 23 -preset fast -profile:v main -level 4.0 -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -acodec aac -b:a 192k -movflags +faststart -y "${outputPath}"`,
    { stdio: 'pipe' }
  );

  console.log(`    ✅ Compressed: ${outputName} → ${getMB(outputPath)}MB`);
  return outputPath;
}

/** Upload video to Cloudinary using stream (works for any size after compression) */
async function uploadVideo(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const publicId = `${Date.now()}_${randomBytes(3).toString('hex')}_${path.basename(filePath, ext).replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  console.log(`    ↑ Uploading ${path.basename(filePath)} (${getMB(filePath)}MB)...`);

  const result = await new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: CLOUD_FOLDER, public_id: publicId, resource_type: 'video' },
      (error, res) => {
        if (error || !res) return reject(error ?? new Error('No response from Cloudinary'));
        resolve(res);
      }
    ).end(fs.readFileSync(filePath));
  });

  if (!result.secure_url) throw new Error('Upload returned no URL');
  return result.secure_url;
}

// ── 1. GMS AudioVisual (154MB → compress → create entry) ────────────────────
async function handleGMSAudiovisual() {
  // Validate: check if already exists with coverUrl
  const existing = await prisma.content.findFirst({
    where: { companyName: 'GMS', category: 'AudioVisual' },
  });
  if (existing?.coverUrl) {
    console.log('  ⏭️  GMS AudioVisual already has a video, skipping');
    return;
  }

  console.log('\n📦 GMS (AudioVisual)');
  const input = path.join(PORTFOLIO_ROOT, 'AudioVisual', 'GMS', '1.mp4');
  const compressed = compressVideo(input, 'gms_audiovisual.mp4');
  const url = await uploadVideo(compressed);

  if (existing) {
    // Update the empty entry
    await prisma.content.update({
      where: { id: existing.id },
      data: { coverUrl: url, coverMimeType: 'video/mp4' },
    });
    console.log('  ✅ Updated GMS AudioVisual with video');
  } else {
    const uid = randomBytes(4).toString('hex');
    await prisma.content.create({
      data: {
        companyName: 'GMS', title: 'GMS',
        slug: `audiovisual-gms-${uid}`,
        category: 'AudioVisual',
        showOnHome: false, showOnPortfolio: true,
        coverUrl: url, coverMimeType: 'video/mp4',
        galleryCount: 0,
      },
    });
    console.log('  ✅ Created GMS AudioVisual');
  }
}

// ── 2. Design Market: add DM_CASA_R2.mp4 (110MB) ────────────────────────────
async function handleDesignMarket() {
  console.log('\n📦 Design Market — adding DM_CASA_R2.mp4');
  const input = path.join(PORTFOLIO_ROOT, 'Social Media', 'Design Market', 'DM_CASA_R2.mp4');
  const compressed = compressVideo(input, 'dm_casa_r2.mp4');
  const url = await uploadVideo(compressed);

  const entry = await prisma.content.findFirst({
    where: { companyName: 'Design Market' },
    include: { medias: { orderBy: { sortOrder: 'desc' }, take: 1 } },
  });

  if (!entry) { console.log('  ⚠️  Design Market not found in DB'); return; }

  const nextOrder = (entry.medias[0]?.sortOrder ?? -1) + 1;
  await prisma.contentMedia.create({
    data: { contentId: entry.id, url, mimeType: 'video/mp4', sortOrder: nextOrder },
  });
  await prisma.content.update({
    where: { id: entry.id },
    data: { galleryCount: entry.galleryCount + 1 },
  });
  console.log('  ✅ Added DM_CASA_R2 to Design Market');
}

// ── 3. GMS Perú: add GMS_HCO.mp4 (186MB) ────────────────────────────────────
async function handleGMSPeru() {
  console.log('\n📦 GMS Perú — adding GMS_HCO.mp4');
  const input = path.join(PORTFOLIO_ROOT, 'Social Media', 'GMS Perú', 'GMS_HCO.mp4');
  const compressed = compressVideo(input, 'gms_hco.mp4');
  const url = await uploadVideo(compressed);

  const entry = await prisma.content.findFirst({
    where: { companyName: 'GMS Perú' },
    include: { medias: { orderBy: { sortOrder: 'desc' }, take: 1 } },
  });

  if (!entry) { console.log('  ⚠️  GMS Perú not found in DB'); return; }

  const nextOrder = (entry.medias[0]?.sortOrder ?? -1) + 1;
  await prisma.contentMedia.create({
    data: { contentId: entry.id, url, mimeType: 'video/mp4', sortOrder: nextOrder },
  });
  await prisma.content.update({
    where: { id: entry.id },
    data: { galleryCount: entry.galleryCount + 1 },
  });
  console.log('  ✅ Added GMS_HCO to GMS Perú');
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Compressing and uploading large videos...\n');

  try { await handleGMSAudiovisual(); } catch(e) { console.error('  ❌ GMS AudioVisual:', e.message); }
  try { await handleDesignMarket(); }  catch(e) { console.error('  ❌ Design Market:', e.message); }
  try { await handleGMSPeru(); }       catch(e) { console.error('  ❌ GMS Perú:', e.message); }

  // Cleanup compressed files
  try {
    fs.rmSync(TMP_DIR, { recursive: true });
    console.log('\n🧹 Cleaned up temp files');
  } catch {}

  console.log('\n✅ All done!');
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Fatal:', e);
  await prisma.$disconnect();
  process.exit(1);
});
