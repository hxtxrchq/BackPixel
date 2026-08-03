import 'dotenv/config';
import { v2 as cloudinary } from 'cloudinary';
import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { execSync } from 'node:child_process';

const prisma = new PrismaClient();

// Configure new Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const MANIFEST_PATH = path.resolve('../Frontend/src/config/cloudinaryManifest.json');
const COMPRESSED_DIR = path.resolve('./uploads/_compressed');
const UPLOADS_DIR = path.resolve('./uploads');
const WORKSPACE_DIR = path.resolve('..');
const BUCKET_NAME = 'pixelbros';

if (!fs.existsSync(COMPRESSED_DIR)) {
  fs.mkdirSync(COMPRESSED_DIR, { recursive: true });
}

// Build workspace file map for fast lookup
function buildFileMap(dir, map = new Map()) {
  if (dir.includes('node_modules') || dir.includes('.git') || dir.includes('.next') || dir.includes('dist')) {
    return map;
  }
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return map;
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      buildFileMap(fullPath, map);
    } else {
      const name = entry.name.toLowerCase();
      if (!map.has(name)) {
        map.set(name, []);
      }
      map.get(name).push(fullPath);
    }
  }
  return map;
}

// Setup Supabase bucket via direct SQL
async function setupSupabaseStorage() {
  console.log('🔧 Setting up Supabase Storage Bucket and RLS policies...');
  try {
    // Create bucket if not exists
    await prisma.$executeRawUnsafe(`
      INSERT INTO storage.buckets (id, name, public)
      VALUES ('${BUCKET_NAME}', '${BUCKET_NAME}', true)
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log('✅ Bucket created or already exists.');

    // Disable RLS on storage tables to allow direct REST API access with the anon key
    await prisma.$executeRawUnsafe(`ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE storage.buckets DISABLE ROW LEVEL SECURITY;`);
    console.log('✅ Disabled Row Level Security (RLS) on storage tables.');
  } catch (error) {
    console.error('❌ Error setting up Supabase Storage:', error.message);
  }
}

// Compress Image using sharp
async function compressImage(inputPath, outputName) {
  const outputPath = path.join(COMPRESSED_DIR, outputName);
  if (fs.existsSync(outputPath)) {
    return outputPath;
  }
  console.log(`    🗜️  Compressing image: ${path.basename(inputPath)}`);
  
  const ext = path.extname(inputPath).toLowerCase();
  
  if (ext === '.gif') {
    // WebP or copy GIF
    fs.copyFileSync(inputPath, outputPath);
    return outputPath;
  }
  if (ext === '.svg') {
    fs.copyFileSync(inputPath, outputPath);
    return outputPath;
  }

  await sharp(inputPath)
    .resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(outputPath);

  return outputPath;
}

// Compress Video using ffmpeg
function compressVideo(inputPath, outputName) {
  const outputPath = path.join(COMPRESSED_DIR, outputName);
  if (fs.existsSync(outputPath)) {
    return outputPath;
  }
  const sizeMB = fs.statSync(inputPath).size / 1024 / 1024;
  if (sizeMB < 15) {
    console.log(`    ⏭️  Video is small (${sizeMB.toFixed(1)}MB), skipping compression.`);
    fs.copyFileSync(inputPath, outputPath);
    return outputPath;
  }

  console.log(`    🗜️  Compressing video: ${path.basename(inputPath)} (${sizeMB.toFixed(1)}MB)`);
  execSync(
    `ffmpeg -i "${inputPath}" -vcodec libx264 -crf 26 -preset fast -profile:v main -level 4.0 -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -acodec aac -b:a 128k -movflags +faststart -y "${outputPath}"`,
    { stdio: 'pipe' }
  );
  return outputPath;
}

// Upload to Supabase Storage via REST API
async function uploadToSupabase(filePath, storagePath) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  const fileBuffer = fs.readFileSync(filePath);
  
  const ext = path.extname(filePath).toLowerCase();
  let contentType = 'application/octet-stream';
  if (['.jpg', '.jpeg'].includes(ext)) contentType = 'image/jpeg';
  else if (ext === '.png') contentType = 'image/png';
  else if (ext === '.webp') contentType = 'image/webp';
  else if (ext === '.gif') contentType = 'image/gif';
  else if (ext === '.svg') contentType = 'image/svg+xml';
  else if (ext === '.mp4') contentType = 'video/mp4';

  const uploadUrl = `${supabaseUrl}/storage/v1/object/${BUCKET_NAME}/${storagePath}`;

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': contentType,
      'x-upsert': 'true',
    },
    body: fileBuffer,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase upload failed: ${response.status} ${response.statusText} - ${text}`);
  }

  return `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${storagePath}`;
}

// Upload to Cloudinary
async function uploadToCloudinary(filePath, resourceType) {
  const ext = path.extname(filePath).toLowerCase();
  const publicId = `${Date.now()}_${randomBytes(3).toString('hex')}_${path.basename(filePath, ext).replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  if (resourceType === 'video') {
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_large(filePath, {
        folder: 'pixelbros/content',
        public_id: publicId,
        resource_type: 'video',
        chunk_size: 20 * 1024 * 1024,
      }, (error, res) => {
        if (error || !res) return reject(error ?? new Error('Video upload failed'));
        resolve(res);
      });
    });
    return result.secure_url;
  } else {
    const buffer = fs.readFileSync(filePath);
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: 'pixelbros/content', public_id: publicId, resource_type: 'image' },
        (error, res) => {
          if (error || !res) return reject(error ?? new Error('Image upload failed'));
          resolve(res);
        }
      ).end(buffer);
    });
    return result.secure_url;
  }
}

async function main() {
  const apply = process.argv.includes('--apply');
  
  console.log('🚀 Starting Upload and Migration Script...');
  console.log(`Apply changes mode: ${apply ? 'YES' : 'NO (Dry run)'}`);

  try {
    const pingRes = await cloudinary.api.ping();
    console.log('✅ Cloudinary Connection verified successfully:', pingRes);
  } catch (error) {
    console.warn('⚠️  Cloudinary connection failed (it might be disabled). Skipping Cloudinary uploads:', error.message || error);
  }

  // Setup Supabase
  await setupSupabaseStorage();

  console.log('📁 Scanning workspace for local files...');
  const fileMap = buildFileMap(WORKSPACE_DIR);
  console.log(`Indexed ${fileMap.size} unique filenames.`);

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  const updatedManifest = { ...manifest };

  let processedCount = 0;
  let successCount = 0;
  let failCount = 0;

  for (const [manifestKey, oldUrl] of Object.entries(manifest)) {
    processedCount++;
    console.log(`\n[${processedCount}/${Object.keys(manifest).length}] Processing key: ${manifestKey}`);

    const isForced = manifestKey.toLowerCase().includes('dulce cuidado') || manifestKey.toLowerCase().includes('doctora yuriko');
    if (oldUrl.includes('supabase.co') && !isForced) {
      console.log(`  ⏭️  Skipping ${manifestKey} (already migrated to Supabase: ${oldUrl})`);
      successCount++;
      continue;
    }

    const fileName = manifestKey.split('/').pop();
    const cleanFileName = fileName.toLowerCase();

    // 1. Locate local file
    let localPath = null;
    
    // Normalize helper
    const normalizeStr = (str) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    
    // Try to get project folder segment from manifest key (e.g. "Entrepenauta" from "/Portfolio/Branding/Entrepenauta/4.jpg")
    const parts = manifestKey.split('/').filter(Boolean);
    const projectName = parts.length >= 2 ? parts[parts.length - 2] : '';
    const normProjectName = normalizeStr(projectName).replace(/[^a-z0-9]/g, '');

    // Search in candidates by checking project name path segment match
    if (fileMap.has(cleanFileName)) {
      const candidates = fileMap.get(cleanFileName);
      for (const cand of candidates) {
        const normCandPath = normalizeStr(cand).replace(/[^a-z0-9]/g, '');
        if (normProjectName && normCandPath.includes(normProjectName)) {
          localPath = cand;
          break;
        }
      }
      
      // Fallback: If name is unique (not a generic number like 1.jpg, 2.jpg) and there's only 1 candidate
      if (!localPath) {
        const isGenericName = /^\d+\.(jpg|jpeg|png|webp|gif|svg|mp4|mov)$/i.test(fileName);
        if (!isGenericName && candidates.length === 1) {
          localPath = candidates[0];
        }
      }
    }

    // Direct path lookup fallback
    if (!localPath) {
      const possiblePaths = [
        path.join(UPLOADS_DIR, manifestKey.replace(/^\//, '')),
        path.join(UPLOADS_DIR, manifestKey.replace(/^\/Portfolio/, '')),
        path.join(WORKSPACE_DIR, 'Cagar archivos', manifestKey.replace(/^\/Portfolio\//, '')),
        path.join(WORKSPACE_DIR, 'Cagar archivos', manifestKey.replace(/^\//, ''))
      ];

      for (const p of possiblePaths) {
        if (fs.existsSync(p) && fs.statSync(p).isFile()) {
          localPath = p;
          break;
        }
      }
    }

    if (!localPath) {
      console.warn(`  ⚠️  Local file not found for manifest key: ${manifestKey}`);
      failCount++;
      continue;
    }

    console.log(`  📍 Found local file: ${localPath}`);

    if (!apply) {
      successCount++;
      continue;
    }

    try {
      const supabasePath = manifestKey.replace(/^\//, '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9/._-]/g, '_');
      let newSupabaseUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${supabasePath}`;

      let existsOnSupabase = false;
      if (!isForced) {
        try {
          const headRes = await fetch(newSupabaseUrl, { method: 'HEAD' });
          if (headRes.status === 200) {
            existsOnSupabase = true;
          }
        } catch (e) {}
      }

      if (existsOnSupabase) {
        console.log(`  ⚡ Already exists on Supabase: ${newSupabaseUrl}`);
        
        // Save to manifest and update DB immediately
        updatedManifest[manifestKey] = newSupabaseUrl;
        fs.writeFileSync(MANIFEST_PATH, JSON.stringify(updatedManifest, null, 2), 'utf8');

        let coverUpdates = 0;
        let logoUpdates = 0;
        let mediaUpdates = 0;

        await prisma.$transaction(async (tx) => {
          const contentsWithCover = await tx.content.findMany({ where: { coverUrl: oldUrl } });
          for (const content of contentsWithCover) {
            await tx.content.update({ where: { id: content.id }, data: { coverUrl: newSupabaseUrl } });
            coverUpdates++;
          }
          const contentsWithLogo = await tx.content.findMany({ where: { logoUrl: oldUrl } });
          for (const content of contentsWithLogo) {
            await tx.content.update({ where: { id: content.id }, data: { logoUrl: newSupabaseUrl } });
            logoUpdates++;
          }
          const mediasWithUrl = await tx.contentMedia.findMany({ where: { url: oldUrl } });
          for (const media of mediasWithUrl) {
            await tx.contentMedia.update({ where: { id: media.id }, data: { url: newSupabaseUrl } });
            mediaUpdates++;
          }
        });

        if (coverUpdates || logoUpdates || mediaUpdates) {
          console.log(`  ✅ Database updated: coverUrl (${coverUpdates}), logoUrl (${logoUpdates}), mediaUrl (${mediaUpdates})`);
        }

        successCount++;
        continue;
      }

      // 2. Compress/Optimize
      const ext = path.extname(localPath).toLowerCase();
      const isVideo = ['.mp4', '.mov', '.webm', '.avi'].includes(ext);
      const isGif = ext === '.gif';
      const isSvg = ext === '.svg';
      const outputExt = isVideo ? '.mp4' : (isGif ? '.gif' : (isSvg ? '.svg' : '.webp'));
      const outputName = `${path.basename(localPath, ext)}_${Date.now()}${outputExt}`;
      
      let optimizedPath = localPath;
      if (isVideo) {
        optimizedPath = compressVideo(localPath, outputName);
      } else {
        optimizedPath = await compressImage(localPath, outputName);
      }

      console.log(`  🗜️  Optimized size: ${(fs.statSync(optimizedPath).size / 1024 / 1024).toFixed(2)} MB`);

      // 3. Upload to Cloudinary (optional)
      let newCloudinaryUrl = null;
      try {
        console.log(`  ☁️  Uploading to Cloudinary...`);
        newCloudinaryUrl = await uploadToCloudinary(optimizedPath, isVideo ? 'video' : 'image');
        console.log(`  ✅ Cloudinary URL: ${newCloudinaryUrl}`);
      } catch (cloudinaryErr) {
        console.warn(`  ⚠️  Cloudinary upload failed: ${cloudinaryErr.message || cloudinaryErr}. Skipping Cloudinary URL.`);
      }

      // 4. Upload to Supabase
      console.log(`  ⚡ Uploading to Supabase...`);
      newSupabaseUrl = await uploadToSupabase(optimizedPath, supabasePath);
      console.log(`  ✅ Supabase URL: ${newSupabaseUrl}`);

      // Save to manifest immediately
      updatedManifest[manifestKey] = newSupabaseUrl;
      fs.writeFileSync(MANIFEST_PATH, JSON.stringify(updatedManifest, null, 2), 'utf8');

      // Sincronizar en Base de datos inmediatamente
      let coverUpdates = 0;
      let logoUpdates = 0;
      let mediaUpdates = 0;

      await prisma.$transaction(async (tx) => {
        // coverUrl
        const contentsWithCover = await tx.content.findMany({ where: { coverUrl: oldUrl } });
        for (const content of contentsWithCover) {
          await tx.content.update({ where: { id: content.id }, data: { coverUrl: newSupabaseUrl } });
          coverUpdates++;
        }

        // logoUrl
        const contentsWithLogo = await tx.content.findMany({ where: { logoUrl: oldUrl } });
        for (const content of contentsWithLogo) {
          await tx.content.update({ where: { id: content.id }, data: { logoUrl: newSupabaseUrl } });
          logoUpdates++;
        }

        // mediaUrl
        const mediasWithUrl = await tx.contentMedia.findMany({ where: { url: oldUrl } });
        for (const media of mediasWithUrl) {
          await tx.contentMedia.update({ where: { id: media.id }, data: { url: newSupabaseUrl } });
          mediaUpdates++;
        }
      });

      if (coverUpdates || logoUpdates || mediaUpdates) {
        console.log(`  ✅ Database updated: coverUrl (${coverUpdates}), logoUrl (${logoUpdates}), mediaUrl (${mediaUpdates})`);
      }

      successCount++;
    } catch (err) {
      console.error(`  ❌ Error processing ${manifestKey}:`, err.message || err);
      failCount++;
    }
  }

  console.log('\n🏁 Process Finished!');
  console.log(`Total processed: ${processedCount}`);
  console.log(`Success: ${successCount}`);
  console.log(`Failures/Missing: ${failCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
