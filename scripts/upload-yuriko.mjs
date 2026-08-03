import 'dotenv/config';
import { v2 as cloudinary } from 'cloudinary';
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { execSync } from 'node:child_process';
import sharp from 'sharp';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const prisma = new PrismaClient();

const SOURCE_DIR = path.resolve('../CargasdeArchivos/DRA_YURIKO');
const MANIFEST_PATH = path.resolve('../Frontend/src/config/cloudinaryManifest.json');
const CLOUD_FOLDER = 'pixelbros/content';
const TMP_DIR = path.resolve('./uploads/_temp_yuriko');

if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

async function uploadFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const isVideo = ['.mp4', '.mov', '.avi', '.webm'].includes(ext);
  const resourceType = isVideo ? 'video' : 'image';
  const publicId = `${Date.now()}_${randomBytes(3).toString('hex')}_${path.basename(filePath, ext).replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  console.log(`Uploading ${path.basename(filePath)} as ${resourceType}...`);

  if (isVideo) {
    let finalPath = filePath;
    let isTemp = false;

    if (fs.statSync(filePath).size > 95 * 1024 * 1024) {
      console.log(`Video is large (${(fs.statSync(filePath).size/1024/1024).toFixed(1)}MB). Compressing with ffmpeg...`);
      const tempOut = path.join(TMP_DIR, `compressed_${path.basename(filePath)}`);
      execSync(
        `ffmpeg -i "${filePath}" -vcodec libx264 -crf 25 -preset fast -profile:v main -level 4.0 -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -acodec aac -b:a 128k -movflags +faststart -y "${tempOut}"`,
        { stdio: 'pipe' }
      );
      finalPath = tempOut;
      isTemp = true;
      console.log(`Compressed video to ${(fs.statSync(finalPath).size/1024/1024).toFixed(1)}MB`);
    }

    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_large(finalPath, {
        folder: CLOUD_FOLDER,
        public_id: publicId,
        resource_type: 'video',
        chunk_size: 20 * 1024 * 1024,
      }, (error, res) => {
        if (error || !res) return reject(error ?? new Error('Upload large failed'));
        resolve(res);
      });
    });

    if (isTemp) {
      fs.unlinkSync(finalPath);
    }

    return { url: result.secure_url, mimeType: `video/mp4` };
  } else {
    let fileBuffer = fs.readFileSync(filePath);
    let mimeType = `image/${ext.slice(1) || 'jpeg'}`;
    
    if (fileBuffer.length > 10 * 1024 * 1024) {
      console.log(`Image is large (${(fileBuffer.length/1024/1024).toFixed(1)}MB). Compressing with sharp...`);
      fileBuffer = await sharp(filePath)
        .webp({ quality: 85 })
        .toBuffer();
      mimeType = 'image/webp';
    }

    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: CLOUD_FOLDER,
          public_id: publicId,
          resource_type: 'image',
        },
        (error, res) => {
          if (error || !res) return reject(error ?? new Error('Upload failed'));
          resolve(res);
        }
      ).end(fileBuffer);
    });
    return { url: result.secure_url, mimeType };
  }
}

async function main() {
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`Source directory not found: ${SOURCE_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(SOURCE_DIR)
    .filter(f => {
      const ext = path.extname(f).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.mp4', '.mov', '.avi', '.webm'].includes(ext);
    })
    .sort(); // Sort so cover file order is deterministic

  console.log(`Found ${files.length} files to process for DOCTORA YURIKO`);

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  const uploadedMedias = [];

  for (const fileName of files) {
    const filePath = path.join(SOURCE_DIR, fileName);
    const manifestKey = `/Portfolio/Social Media/DOCTORA YURIKO/${fileName}`;
    
    if (manifest[manifestKey]) {
      console.log(`Skipping ${fileName} (already in manifest: ${manifest[manifestKey]})`);
      uploadedMedias.push({
        url: manifest[manifestKey],
        mimeType: fileName.toLowerCase().endsWith('.mp4') ? 'video/mp4' : 'image/png',
      });
      continue;
    }

    try {
      const result = await uploadFile(filePath);
      manifest[manifestKey] = result.url;
      
      uploadedMedias.push({
        url: result.url,
        mimeType: result.mimeType,
      });
    } catch (err) {
      console.error(`Failed to upload ${fileName}:`, err.message || err);
    }
  }

  // Write updated manifest back
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
  console.log('Manifest updated!');

  // Update DB entry
  const slug = 'social-media-doctora-yuriko';
  const existing = await prisma.content.findUnique({
    where: { slug },
  });

  if (!existing) {
    console.error(`Project with slug ${slug} not found in DB`);
    process.exit(1);
  }

  // Determine cover: prioritize saludos video if available
  let cover = uploadedMedias.find(m => m.url.includes('SALUDOS')) || 
                uploadedMedias.find(m => m.mimeType.startsWith('video')) || 
                uploadedMedias[0];

  await prisma.content.update({
    where: { id: existing.id },
    data: {
      coverUrl: cover.url,
      coverMimeType: cover.mimeType,
      galleryCount: uploadedMedias.length,
      medias: {
        deleteMany: {},
        create: uploadedMedias.map((m, idx) => ({
          url: m.url,
          mimeType: m.mimeType,
          sortOrder: idx,
        })),
      },
    },
  });

  console.log('Database updated successfully for DOCTORA YURIKO!');

  // Cleanup temp dir
  try {
    fs.rmSync(TMP_DIR, { recursive: true });
  } catch {}
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
