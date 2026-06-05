/**
 * upload-fotografia.mjs
 * Compresses and uploads photography projects to Cloudinary.
 * Uses sharp for minimal-loss JPEG compression (quality 92, max 4000px wide).
 * Takes up to MAX_PHOTOS images per project.
 */

import 'dotenv/config';
import { v2 as cloudinary } from 'cloudinary';
import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';
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
const FOTOGRAFIA_ROOT = path.resolve('uploads/Portfolio/Fotografia');
const LOGOS_ROOT = path.resolve('../Frontend/public/logos');
const TMP_DIR = path.resolve('uploads/_foto_compressed');
const CLOUD_FOLDER = 'pixelbros/content';
const MAX_PHOTOS = 15;
const JPEG_QUALITY = 92; // Very high quality, minimal compression

if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

function getMB(filePath) {
  return (fs.statSync(filePath).size / 1024 / 1024).toFixed(1);
}

function slugify(v) {
  return v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/** Compress image with sharp — converts PNG→JPEG, max 4000px, quality 92 */
async function compressImage(inputPath, outputName) {
  const outputPath = path.join(TMP_DIR, outputName);

  if (fs.existsSync(outputPath)) {
    console.log(`    ♻️  Already compressed: ${outputName} (${getMB(outputPath)}MB)`);
    return outputPath;
  }

  const inputMB = getMB(inputPath);
  process.stdout.write(`    🗜️  ${path.basename(inputPath)} (${inputMB}MB) → `);

  await sharp(inputPath)
    .resize({ width: 4000, height: 4000, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toFile(outputPath);

  const outputMB = getMB(outputPath);
  console.log(`${outputMB}MB ✓`);
  return outputPath;
}

/** Upload image buffer to Cloudinary */
async function uploadImage(filePath, label) {
  process.stdout.write(`    ↑ Uploading ${label}...`);
  const buffer = fs.readFileSync(filePath);

  const result = await new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: CLOUD_FOLDER, resource_type: 'image' },
      (error, res) => {
        if (error || !res) return reject(error ?? new Error('No response'));
        resolve(res);
      }
    ).end(buffer);
  });

  if (!result.secure_url) throw new Error('No URL returned');
  console.log(` ✓ (${getMB(filePath)}MB)`);
  return result.secure_url;
}

/** Process one Fotografia project */
async function uploadFotografiaProject({ folderName, companyName, logoFile, category }) {
  console.log(`\n📸 Project: ${companyName}`);

  const dir = path.join(FOTOGRAFIA_ROOT, folderName);
  const allFiles = fs.readdirSync(dir)
    .filter(f => /\.(jpg|jpeg|png)$/i.test(f))
    .sort()
    .slice(0, MAX_PHOTOS)
    .map(f => path.join(dir, f));

  if (allFiles.length === 0) {
    console.log('  ⚠️  No files found');
    return;
  }
  console.log(`  Using ${allFiles.length} of ${fs.readdirSync(dir).length} photos`);

  // Check for existing entry to avoid duplicates
  const existing = await prisma.content.findFirst({
    where: { companyName, category: 'Fotografia' },
  });
  if (existing?.coverUrl) {
    console.log('  ⏭️  Already uploaded, skipping');
    return;
  }

  // Compress all photos
  const compressedPaths = [];
  for (let i = 0; i < allFiles.length; i++) {
    const outName = `foto_${slugify(companyName)}_${String(i).padStart(2, '0')}.jpg`;
    try {
      const compressed = await compressImage(allFiles[i], outName);
      compressedPaths.push(compressed);
    } catch (e) {
      console.log(`    ⚠️  Compression failed for ${path.basename(allFiles[i])}: ${e.message}`);
    }
  }

  // Upload cover (first photo)
  const coverUrl = await uploadImage(compressedPaths[0], 'cover');

  // Upload logo if found
  let logoUrl;
  if (logoFile) {
    const logoPath = path.join(LOGOS_ROOT, logoFile);
    if (fs.existsSync(logoPath)) {
      console.log(`  🏷️  Logo: ${logoFile}`);
      const outName = `logo_${slugify(companyName)}.jpg`;
      const compressedLogo = await compressImage(logoPath, outName);
      logoUrl = await uploadImage(compressedLogo, 'logo');
    }
  }

  // Upload gallery (remaining photos)
  const gallery = [];
  for (let i = 1; i < compressedPaths.length; i++) {
    try {
      const url = await uploadImage(compressedPaths[i], `photo ${i + 1}`);
      gallery.push({ url, mimeType: 'image/jpeg', sortOrder: i - 1 });
    } catch (e) {
      console.log(`    ⚠️  Upload failed: ${e.message}`);
    }
  }

  // Create or update DB entry
  const uid = randomBytes(4).toString('hex');
  if (existing) {
    await prisma.content.update({
      where: { id: existing.id },
      data: {
        coverUrl,
        coverMimeType: 'image/jpeg',
        logoUrl,
        logoMimeType: logoUrl ? 'image/jpeg' : undefined,
        galleryCount: gallery.length,
        medias: { create: gallery },
      },
    });
    console.log(`  ✅ Updated ${companyName} (cover ✓, logo: ${logoUrl ? '✓' : '✗'}, gallery: ${gallery.length})`);
  } else {
    await prisma.content.create({
      data: {
        companyName,
        title: companyName,
        slug: `fotografia-${slugify(companyName)}-${uid}`,
        category: 'Fotografia',
        showOnHome: false,
        showOnPortfolio: true,
        coverUrl,
        coverMimeType: 'image/jpeg',
        logoUrl,
        logoMimeType: logoUrl ? 'image/jpeg' : undefined,
        galleryCount: gallery.length,
        medias: { create: gallery },
      },
    });
    console.log(`  ✅ Created ${companyName} (cover ✓, logo: ${logoUrl ? '✓' : '✗'}, gallery: ${gallery.length})`);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`🚀 Uploading Fotografia projects (max ${MAX_PHOTOS} photos each, JPEG q${JPEG_QUALITY})\n`);

  const projects = [
    { folderName: 'DULCE CUIDADO', companyName: 'Dulce Cuidado', logoFile: null, category: 'Fotografia' },
    { folderName: 'LA VIEJA TABERNA', companyName: 'La Vieja Taberna (Fotografía)', logoFile: 'LaViejaTaberna.png', category: 'Fotografia' },
  ];

  for (const project of projects) {
    try {
      await uploadFotografiaProject(project);
    } catch (e) {
      console.error(`  ❌ ${project.companyName}: ${e.message}`);
    }
  }

  // Cleanup
  try { fs.rmSync(TMP_DIR, { recursive: true }); } catch {}

  console.log('\n✅ All done!');
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Fatal:', e);
  await prisma.$disconnect();
  process.exit(1);
});
