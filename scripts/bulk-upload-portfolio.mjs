/**
 * bulk-upload-portfolio.mjs
 * Uploads all portfolio projects to Cloudinary and creates DB entries.
 * Run: node scripts/bulk-upload-portfolio.mjs
 */

import 'dotenv/config';
import { v2 as cloudinary } from 'cloudinary';
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';

// ── Config ──────────────────────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const prisma = new PrismaClient();

const PORTFOLIO_ROOT = path.resolve('uploads/Portfolio');
const LOGOS_ROOT = path.resolve('../Frontend/public/logos');

// ── Logo mapping ─────────────────────────────────────────────────────────────
const LOGO_MAP = {
  'barbarian bar':    'Barbarian Bar.png',
  'barbarian':        'Barbarian Bar.png',
  'frissagio':        'Frissagio.png',
  'ginecofeme':       'Ginecofeme.png',
  'design market':    'Design Market.png',
  'gms':              'GMS.png',
  'gms perú':         'GMS.png',
  'gms peru':         'GMS.png',
  'la vieja taberna': 'LaViejaTaberna.png',
  'laviejataberna':   'LaViejaTaberna.png',
  'r&c arquitectos':  'RYC arquitectos.png',
  'ryc arquitectos':  'RYC arquitectos.png',
  'elevaria':         'Elevaria Logo.png',
  'corte87':          'Corte87.png',
  'dgary':            'DGary.png',
  'kanagawa':         'Kanagawa Nikkei.png',
  'smashboy':         'smashboyburger.png',
};

function findLogo(companyName) {
  const lower = companyName.toLowerCase();
  for (const [key, file] of Object.entries(LOGO_MAP)) {
    if (lower.includes(key)) {
      const logoPath = path.join(LOGOS_ROOT, file);
      if (fs.existsSync(logoPath)) return logoPath;
    }
  }
  return null;
}

// ── Projects to upload (skip already-uploaded ones) ──────────────────────────
// Set to true to skip, false to upload
const SKIP = new Set([
  // Already uploaded by the user via dashboard:
  'AudioVisual/Elevaria Servido Con Proposito',
  'AudioVisual/FOF Trujillo',
]);

// ── Helpers ──────────────────────────────────────────────────────────────────
function slugify(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/** Recursively collect all image/video files from a directory */
function collectFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(full));
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.mp4', '.mov', '.avi', '.webm'].includes(ext)) {
        files.push(full);
      }
    }
  }
  return files;
}

/** Upload a single file to Cloudinary */
async function uploadFile(filePath, folder) {
  const ext = path.extname(filePath).toLowerCase();
  const isVideo = ['.mp4', '.mov', '.avi', '.webm'].includes(ext);
  const isSvg = ext === '.svg';

  const resourceType = isVideo ? 'video' : 'image';
  const publicId = `${Date.now()}_${randomBytes(3).toString('hex')}_${path.basename(filePath, ext).replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  console.log(`    ↑ Uploading ${path.basename(filePath)} (${resourceType})...`);

  if (isVideo) {
    // Use upload_large for videos to support chunked uploads (handles 100MB+ files)
    const result = await cloudinary.uploader.upload_large(filePath, {
      folder,
      public_id: publicId,
      resource_type: 'video',
      chunk_size: 20 * 1024 * 1024, // 20MB chunks
    });
    return { url: result.secure_url, mimeType: `video/${ext.slice(1) || 'mp4'}` };
  }

  // Images & GIFs: regular stream upload
  const result = await new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: 'image',
        ...(isSvg ? { format: 'svg' } : {}),
      },
      (error, res) => {
        if (error || !res) return reject(error ?? new Error('Upload failed'));
        resolve(res);
      }
    ).end(fs.readFileSync(filePath));
  });

  return { url: result.secure_url, mimeType: `image/${ext.slice(1) || 'jpeg'}` };
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Starting bulk portfolio upload...\n');

  const categories = ['Branding', 'AudioVisual', 'Fotografia', 'Menu digital', 'Social Media'];

  let totalCreated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const category of categories) {
    const categoryDir = path.join(PORTFOLIO_ROOT, category);
    if (!fs.existsSync(categoryDir)) {
      console.log(`⚠️  Category folder not found: ${category}`);
      continue;
    }

    const projectFolders = fs.readdirSync(categoryDir, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => e.name);

    console.log(`\n📁 Category: ${category} (${projectFolders.length} projects)`);

    for (const projectName of projectFolders) {
      const skipKey = `${category}/${projectName}`;
      if (SKIP.has(skipKey)) {
        console.log(`  ⏭️  Skipping: ${projectName}`);
        totalSkipped++;
        continue;
      }

      const projectDir = path.join(categoryDir, projectName);
      const cleanName = projectName.replace(/^\d+_/, '').replace(/_$/, '').trim();
      const companyName = cleanName;

      console.log(`\n  📦 Project: ${companyName}`);

      try {
        const allFiles = collectFiles(projectDir);
        if (allFiles.length === 0) {
          console.log(`    ⚠️  No files found, skipping`);
          totalSkipped++;
          continue;
        }

        console.log(`    Found ${allFiles.length} files`);

        const cloudFolder = `pixelbros/content`;

        // Upload cover (first image file, or first video if no images)
        const imageFiles = allFiles.filter(f => {
          const ext = path.extname(f).toLowerCase();
          return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
        });
        const videoFiles = allFiles.filter(f => {
          const ext = path.extname(f).toLowerCase();
          return ['.mp4', '.mov', '.avi', '.webm'].includes(ext);
        });

        let coverUrl = undefined;
        let coverMimeType = undefined;
        let galleryFiles = [...allFiles];

        // Use first image as cover
        if (imageFiles.length > 0) {
          const coverResult = await uploadFile(imageFiles[0], cloudFolder);
          coverUrl = coverResult.url;
          coverMimeType = coverResult.mimeType;
          galleryFiles = allFiles.filter(f => f !== imageFiles[0]);
        } else if (videoFiles.length > 0) {
          // No images, use first video as cover
          const coverResult = await uploadFile(videoFiles[0], cloudFolder);
          coverUrl = coverResult.url;
          coverMimeType = coverResult.mimeType;
          galleryFiles = allFiles.filter(f => f !== videoFiles[0]);
        }

        // Upload logo if found
        let logoUrl = undefined;
        let logoMimeType = undefined;
        const logoPath = findLogo(companyName);
        if (logoPath) {
          console.log(`    🏷️  Found logo: ${path.basename(logoPath)}`);
          const logoResult = await uploadFile(logoPath, cloudFolder);
          logoUrl = logoResult.url;
          logoMimeType = logoResult.mimeType;
        }

        // Upload gallery
        const gallery = [];
        for (let i = 0; i < galleryFiles.length; i++) {
          try {
            const result = await uploadFile(galleryFiles[i], cloudFolder);
            gallery.push({ url: result.url, mimeType: result.mimeType, sortOrder: i });
          } catch (err) {
            console.log(`    ⚠️  Failed to upload ${path.basename(galleryFiles[i])}: ${err.message}`);
          }
        }

        // Create DB entry
        const uid = randomBytes(4).toString('hex');
        const slug = `${slugify(category)}-${slugify(companyName)}-${uid}`;

        await prisma.content.create({
          data: {
            companyName,
            title: companyName,
            slug,
            category,
            showOnHome: false,
            showOnPortfolio: true,
            coverUrl,
            coverMimeType,
            logoUrl,
            logoMimeType,
            galleryCount: gallery.length,
            medias: {
              create: gallery,
            },
          },
        });

        console.log(`    ✅ Created: ${companyName} (cover: ${coverUrl ? '✓' : '✗'}, logo: ${logoUrl ? '✓' : '✗'}, gallery: ${gallery.length} files)`);
        totalCreated++;

      } catch (err) {
        console.error(`    ❌ Error processing ${companyName}: ${err.message}`);
        totalErrors++;
      }
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ Created:  ${totalCreated}`);
  console.log(`⏭️  Skipped:  ${totalSkipped}`);
  console.log(`❌ Errors:   ${totalErrors}`);
  console.log('Done!');

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('Fatal error:', err);
  await prisma.$disconnect();
  process.exit(1);
});
