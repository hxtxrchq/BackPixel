import 'dotenv/config';
import { v2 as cloudinary } from 'cloudinary';
import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';
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
const MANIFEST_PATH = path.resolve('../Frontend/src/config/cloudinaryManifest.json');
const CLOUD_FOLDER = 'pixelbros/content';
const TMP_DIR = path.resolve('uploads/_compressed_new');

if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

function getMB(filePath) {
  return (fs.statSync(filePath).size / 1024 / 1024).toFixed(1);
}

function slugify(v) {
  return v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Compress video using ffmpeg
function compressVideo(inputPath, outputName) {
  const outputPath = path.join(TMP_DIR, outputName);
  if (fs.existsSync(outputPath)) {
    console.log(`    ♻️  Already compressed video: ${outputName} (${getMB(outputPath)}MB)`);
    return outputPath;
  }
  const sizeMB = parseFloat(getMB(inputPath));
  console.log(`    🗜️  Compressing video ${path.basename(inputPath)} (${sizeMB}MB) → target ~50-80MB...`);
  
  execSync(
    `ffmpeg -i "${inputPath}" -vcodec libx264 -crf 26 -preset fast -profile:v main -level 4.0 -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -acodec aac -b:a 128k -movflags +faststart -y "${outputPath}"`,
    { stdio: 'pipe' }
  );
  console.log(`    ✅ Compressed: ${outputName} → ${getMB(outputPath)}MB`);
  return outputPath;
}

// Compress image using sharp
async function compressImage(inputPath, outputName) {
  const outputPath = path.join(TMP_DIR, outputName);
  if (fs.existsSync(outputPath)) {
    return outputPath;
  }
  await sharp(inputPath)
    .resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(outputPath);
  return outputPath;
}

// Upload file to Cloudinary
async function uploadToCloudinary(filePath, resourceType) {
  const ext = path.extname(filePath).toLowerCase();
  const publicId = `${Date.now()}_${randomBytes(3).toString('hex')}_${path.basename(filePath, ext).replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  if (resourceType === 'video') {
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_large(filePath, {
        folder: CLOUD_FOLDER,
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
        { folder: CLOUD_FOLDER, public_id: publicId, resource_type: 'image' },
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
  console.log('🚀 Starting new assets upload and database updates...\n');
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

  // 1. DELETE LUXIA
  console.log('🗑️  Deleting Luxia...');
  const luxiaSlug = 'audiovisual-luxia';
  const luxia = await prisma.content.findUnique({ where: { slug: luxiaSlug } });
  if (luxia) {
    await prisma.content.delete({ where: { id: luxia.id } });
    console.log('  ✅ Luxia deleted from database.');
  } else {
    console.log('  ⏭️  Luxia already deleted from database.');
  }
  // Remove from manifest
  for (const key of Object.keys(manifest)) {
    if (key.includes('/Luxia/')) {
      delete manifest[key];
      console.log(`  Removed ${key} from manifest.`);
    }
  }

  // Helper function to process and upload a file
  async function processAndUpload(localPath, manifestKey, resourceType, compressFn) {
    if (manifest[manifestKey]) {
      console.log(`  ⏭️  Skipping ${manifestKey} (already uploaded)`);
      return manifest[manifestKey];
    }
    console.log(`  Processing ${manifestKey}...`);
    const compressed = await compressFn(localPath);
    const url = await uploadToCloudinary(compressed, resourceType);
    manifest[manifestKey] = url;
    return url;
  }

  // 2. FRISSAGIO VIDEO (Social Media)
  console.log('\n🎬 Uploading Frissagio Video...');
  const frissagioVideoUrl = await processAndUpload(
    '../Cagar archivos/Social Media/Frissagio/FRISSAGIO_VERANO.mp4',
    '/Portfolio/Social Media/Frissagio/FRISSAGIO_VERANO.mp4',
    'video',
    (p) => compressVideo(p, 'frissagio_verano.mp4')
  );

  // Update Frissagio in DB
  const frissagio = await prisma.content.findUnique({ where: { slug: 'social-media-frissagio' } });
  if (frissagio) {
    // Check if the video is already in its media
    const existingMedia = await prisma.contentMedia.findFirst({
      where: { contentId: frissagio.id, url: frissagioVideoUrl }
    });
    if (!existingMedia) {
      await prisma.contentMedia.create({
        data: {
          contentId: frissagio.id,
          url: frissagioVideoUrl,
          mimeType: 'video/mp4',
          sortOrder: -1 // Set order to start so it is cover
        }
      });
    }
    await prisma.content.update({
      where: { id: frissagio.id },
      data: {
        coverUrl: frissagioVideoUrl,
        coverMimeType: 'video/mp4',
      }
    });
    console.log('  ✅ Frissagio updated with video cover.');
  }

  // 3. GMS VIDEO (AudioVisual)
  console.log('\n🎬 Uploading GMS Video...');
  const gmsVideoUrl = await processAndUpload(
    'uploads/Portfolio/AudioVisual/GMS/1.mp4',
    '/Portfolio/AudioVisual/GMS/1.mp4',
    'video',
    (p) => compressVideo(p, 'gms_audiovisual.mp4')
  );

  // Update or create GMS in DB
  const gmsSlug = 'audiovisual-gms';
  let gms = await prisma.content.findUnique({ where: { slug: gmsSlug } });
  if (!gms) {
    gms = await prisma.content.create({
      data: {
        companyName: 'GMS',
        title: 'GMS',
        slug: gmsSlug,
        category: 'AudioVisual',
        showOnHome: false,
        showOnPortfolio: true,
        coverUrl: gmsVideoUrl,
        coverMimeType: 'video/mp4',
        logoUrl: '/logos/GMS.png',
        logoMimeType: 'image/png',
        galleryCount: 1,
        medias: {
          create: [
            { url: gmsVideoUrl, mimeType: 'video/mp4', sortOrder: 0 }
          ]
        }
      }
    });
    console.log('  ✅ GMS AudioVisual project created.');
  } else {
    await prisma.content.update({
      where: { id: gms.id },
      data: {
        coverUrl: gmsVideoUrl,
        coverMimeType: 'video/mp4'
      }
    });
    console.log('  ✅ GMS AudioVisual cover updated.');
  }

  // 4. ARQ. DANIEL RODRIGUEZ (AudioVisual)
  console.log('\n🎬 Uploading Arq. Daniel Rodriguez...');
  const danielVideoUrl = await processAndUpload(
    '../Cagar archivos/Audiovisual/Arq. Daniel Rodriguez/2_Video/ARQ_DANIEL.mp4',
    '/Portfolio/AudioVisual/Arq. Daniel Rodriguez/ARQ_DANIEL.mp4',
    'video',
    (p) => compressVideo(p, 'arq_daniel.mp4')
  );

  const danielPhotosDir = '../Cagar archivos/Audiovisual/Arq. Daniel Rodriguez/1_Fotos';
  const danielPhotoFiles = fs.readdirSync(danielPhotosDir).filter(f => /\.(png|jpg|jpeg)$/i.test(f)).sort();
  const danielUploadedPhotos = [];

  for (const file of danielPhotoFiles) {
    const localPath = path.join(danielPhotosDir, file);
    const manifestKey = `/Portfolio/AudioVisual/Arq. Daniel Rodriguez/1_Fotos/${file}`;
    const url = await processAndUpload(
      localPath,
      manifestKey,
      'image',
      (p) => compressImage(p, `daniel_${slugify(file)}.webp`)
    );
    danielUploadedPhotos.push(url);
  }

  // Create Daniel Rodriguez in DB
  const danielSlug = 'audiovisual-arq-daniel-rodriguez';
  let daniel = await prisma.content.findUnique({ where: { slug: danielSlug } });
  const danielMedias = [
    { url: danielVideoUrl, mimeType: 'video/mp4', sortOrder: 0 },
    ...danielUploadedPhotos.map((url, idx) => ({ url, mimeType: 'image/webp', sortOrder: idx + 1 }))
  ];

  if (!daniel) {
    daniel = await prisma.content.create({
      data: {
        companyName: 'Arq. Daniel Rodriguez',
        title: 'Arq. Daniel Rodriguez',
        slug: danielSlug,
        category: 'AudioVisual',
        showOnHome: false,
        showOnPortfolio: true,
        coverUrl: danielVideoUrl,
        coverMimeType: 'video/mp4',
        logoUrl: '/logos/ArquitectoDanielRodriguez.png',
        logoMimeType: 'image/png',
        galleryCount: danielMedias.length,
        medias: { create: danielMedias }
      }
    });
    console.log('  ✅ Arq. Daniel Rodriguez project created.');
  } else {
    await prisma.content.update({
      where: { id: daniel.id },
      data: {
        coverUrl: danielVideoUrl,
        coverMimeType: 'video/mp4',
        galleryCount: danielMedias.length,
        medias: {
          deleteMany: {},
          create: danielMedias
        }
      }
    });
    console.log('  ✅ Arq. Daniel Rodriguez project updated.');
  }

  // 5. UPN (AudioVisual)
  console.log('\n🎬 Uploading UPN...');
  const upnVideoUrl = await processAndUpload(
    '../Cagar archivos/Audiovisual/UPN/VIDEO/UPN_RECOPILACION.mp4',
    '/Portfolio/AudioVisual/UPN/UPN_RECOPILACION.mp4',
    'video',
    (p) => compressVideo(p, 'upn_recopilacion.mp4')
  );

  const upnPhotosDir = '../Cagar archivos/Audiovisual/UPN';
  const upnPhotoFiles = fs.readdirSync(upnPhotosDir).filter(f => /\.(png|jpg|jpeg)$/i.test(f)).sort();
  const upnUploadedPhotos = [];

  for (const file of upnPhotoFiles) {
    const localPath = path.join(upnPhotosDir, file);
    const manifestKey = `/Portfolio/AudioVisual/UPN/${file}`;
    const url = await processAndUpload(
      localPath,
      manifestKey,
      'image',
      (p) => compressImage(p, `upn_${slugify(file)}.webp`)
    );
    upnUploadedPhotos.push(url);
  }

  // Create UPN in DB
  const upnSlug = 'audiovisual-upn';
  let upnProject = await prisma.content.findUnique({ where: { slug: upnSlug } });
  const upnMedias = [
    { url: upnVideoUrl, mimeType: 'video/mp4', sortOrder: 0 },
    ...upnUploadedPhotos.map((url, idx) => ({ url, mimeType: 'image/webp', sortOrder: idx + 1 }))
  ];

  if (!upnProject) {
    upnProject = await prisma.content.create({
      data: {
        companyName: 'UPN',
        title: 'UPN',
        slug: upnSlug,
        category: 'AudioVisual',
        showOnHome: false,
        showOnPortfolio: true,
        coverUrl: upnVideoUrl,
        coverMimeType: 'video/mp4',
        logoUrl: '/logos/upn.png',
        logoMimeType: 'image/png',
        galleryCount: upnMedias.length,
        medias: { create: upnMedias }
      }
    });
    console.log('  ✅ UPN project created.');
  } else {
    await prisma.content.update({
      where: { id: upnProject.id },
      data: {
        coverUrl: upnVideoUrl,
        coverMimeType: 'video/mp4',
        galleryCount: upnMedias.length,
        medias: {
          deleteMany: {},
          create: upnMedias
        }
      }
    });
    console.log('  ✅ UPN project updated.');
  }

  // 6. BARBARIAN BAR (Fotografía)
  console.log('\n📸 Uploading Barbarian Bar (Fotografía)...');
  const barbarianPhotosDir = '../Cagar archivos/Fotografia/Barbarian Bar';
  const barbarianPhotoFiles = fs.readdirSync(barbarianPhotosDir).filter(f => /\.(png|jpg|jpeg)$/i.test(f)).sort();
  const barbarianUploadedPhotos = [];

  for (const file of barbarianPhotoFiles) {
    const localPath = path.join(barbarianPhotosDir, file);
    const manifestKey = `/Portfolio/Fotografia/Barbarian Bar/${file}`;
    const url = await processAndUpload(
      localPath,
      manifestKey,
      'image',
      (p) => compressImage(p, `barbarian_foto_${slugify(file)}.webp`)
    );
    barbarianUploadedPhotos.push(url);
  }

  // Retrieve Barbarian video from social media project to use as cover
  const barbarianSocial = await prisma.content.findUnique({
    where: { slug: 'social-media-barbarian-bar' },
    include: { medias: true }
  });
  // Prioritize BARBARIAN_LENTES
  const barbarianVideoCover = barbarianSocial?.medias.find(m => m.url.includes('LENTES'))?.url || 
                              barbarianSocial?.medias.find(m => m.mimeType.startsWith('video/'))?.url ||
                              manifest['/Portfolio/Social Media/Barbarian Bar/BARBARIAN_LENTES.mp4'];

  const barbarianSlug = 'fotografia-barbarian-bar';
  let barbarianFoto = await prisma.content.findUnique({ where: { slug: barbarianSlug } });
  const barbarianMedias = barbarianUploadedPhotos.map((url, idx) => ({ url, mimeType: 'image/webp', sortOrder: idx }));

  if (!barbarianFoto) {
    barbarianFoto = await prisma.content.create({
      data: {
        companyName: 'Barbarian Bar (Fotografía)',
        title: 'Barbarian Bar',
        slug: barbarianSlug,
        category: 'Fotografia',
        showOnHome: false,
        showOnPortfolio: true,
        coverUrl: barbarianVideoCover,
        coverMimeType: 'video/mp4',
        logoUrl: '/logos/Barbarian Bar.png',
        logoMimeType: 'image/png',
        galleryCount: barbarianMedias.length,
        medias: { create: barbarianMedias }
      }
    });
    console.log('  ✅ Barbarian Bar (Fotografía) created.');
  } else {
    await prisma.content.update({
      where: { id: barbarianFoto.id },
      data: {
        coverUrl: barbarianVideoCover,
        coverMimeType: 'video/mp4',
        galleryCount: barbarianMedias.length,
        medias: {
          deleteMany: {},
          create: barbarianMedias
        }
      }
    });
    console.log('  ✅ Barbarian Bar (Fotografía) updated.');
  }

  // 7. DRA. YURIKO CRUZ (Fotografía)
  console.log('\n📸 Uploading Dra. Yuriko Cruz (Fotografía)...');
  const yurikoPhotosDir = '../Cagar archivos/Fotografia/DRA. Yuriko';
  const yurikoPhotoFiles = fs.readdirSync(yurikoPhotosDir).filter(f => /\.(png|jpg|jpeg)$/i.test(f)).sort();
  const yurikoUploadedPhotos = [];

  for (const file of yurikoPhotoFiles) {
    const localPath = path.join(yurikoPhotosDir, file);
    const manifestKey = `/Portfolio/Fotografia/DRA. Yuriko/${file}`;
    const url = await processAndUpload(
      localPath,
      manifestKey,
      'image',
      (p) => compressImage(p, `yuriko_foto_${slugify(file)}.webp`)
    );
    yurikoUploadedPhotos.push(url);
  }

  // Retrieve Yuriko video from social media project to use as cover
  const yurikoSocial = await prisma.content.findUnique({
    where: { slug: 'social-media-doctora-yuriko' },
    include: { medias: true }
  });
  // Prioritize DRA_YURIKO_SOP
  const yurikoVideoCover = yurikoSocial?.medias.find(m => m.url.includes('SOP'))?.url || 
                           yurikoSocial?.medias.find(m => m.mimeType.startsWith('video/'))?.url ||
                           manifest['/Portfolio/Social Media/DOCTORA YURIKO/DRA_YURIKO_SOP.mp4'];

  const yurikoSlug = 'fotografia-doctora-yuriko';
  let yurikoFoto = await prisma.content.findUnique({ where: { slug: yurikoSlug } });
  const yurikoMedias = yurikoUploadedPhotos.map((url, idx) => ({ url, mimeType: 'image/webp', sortOrder: idx }));

  if (yurikoFoto) {
    await prisma.content.update({
      where: { id: yurikoFoto.id },
      data: {
        coverUrl: yurikoVideoCover,
        coverMimeType: 'video/mp4',
        galleryCount: yurikoMedias.length,
        medias: {
          deleteMany: {},
          create: yurikoMedias
        }
      }
    });
    console.log('  ✅ Dra. Yuriko Cruz (Fotografía) updated.');
  }

  // 8. SMASH BOY (Fotografía)
  console.log('\n📸 Uploading Smash Boy (Fotografía)...');
  const smashPhotosDir = '../Cagar archivos/Fotografia/Smash Boy/extracted';
  const smashPhotoFiles = fs.readdirSync(smashPhotosDir).filter(f => /\.(png|jpg|jpeg)$/i.test(f)).sort();
  const smashUploadedPhotos = [];

  for (const file of smashPhotoFiles) {
    const localPath = path.join(smashPhotosDir, file);
    const manifestKey = `/Portfolio/Fotografia/Smash Boy/${file}`;
    const url = await processAndUpload(
      localPath,
      manifestKey,
      'image',
      (p) => compressImage(p, `smash_foto_${slugify(file)}.webp`)
    );
    smashUploadedPhotos.push(url);
  }

  const smashSlug = 'fotografia-smash-boy';
  let smashFoto = await prisma.content.findUnique({ where: { slug: smashSlug } });
  const smashMedias = smashUploadedPhotos.map((url, idx) => ({ url, mimeType: 'image/webp', sortOrder: idx }));

  if (!smashFoto) {
    smashFoto = await prisma.content.create({
      data: {
        companyName: 'Smash Boy',
        title: 'Smash Boy',
        slug: smashSlug,
        category: 'Fotografia',
        showOnHome: false,
        showOnPortfolio: true,
        coverUrl: smashUploadedPhotos[0],
        coverMimeType: 'image/webp',
        logoUrl: '/logos/smashboyburger.png',
        logoMimeType: 'image/png',
        galleryCount: smashMedias.length,
        medias: { create: smashMedias }
      }
    });
    console.log('  ✅ Smash Boy (Fotografía) created.');
  } else {
    await prisma.content.update({
      where: { id: smashFoto.id },
      data: {
        coverUrl: smashUploadedPhotos[0],
        coverMimeType: 'image/webp',
        galleryCount: smashMedias.length,
        medias: {
          deleteMany: {},
          create: smashMedias
        }
      }
    });
    console.log('  ✅ Smash Boy (Fotografía) updated.');
  }

  // 9. UPDATE EXISTING PROJECTS TO USE VIDEO COVERS
  console.log('\n🎥 Setting video covers for existing projects...');

  // Ginecofeme (Social Media)
  const ginecofeme = await prisma.content.findUnique({
    where: { slug: 'social-media-ginecofeme' },
    include: { medias: true }
  });
  const ginecofemeVideo = ginecofeme?.medias.find(m => m.mimeType.startsWith('video/'));
  if (ginecofeme && ginecofemeVideo) {
    await prisma.content.update({
      where: { id: ginecofeme.id },
      data: { coverUrl: ginecofemeVideo.url, coverMimeType: 'video/mp4' }
    });
    console.log('  ✅ Ginecofeme set to video cover.');
  }

  // GMS Perú (Social Media)
  const gmsPeru = await prisma.content.findUnique({
    where: { slug: 'social-media-gms-peru' },
    include: { medias: true }
  });
  const gmsPeruVideo = gmsPeru?.medias.find(m => m.url.includes('COLLAB')) ||
                       gmsPeru?.medias.find(m => m.mimeType.startsWith('video/'));
  if (gmsPeru && gmsPeruVideo) {
    await prisma.content.update({
      where: { id: gmsPeru.id },
      data: { coverUrl: gmsPeruVideo.url, coverMimeType: 'video/mp4' }
    });
    console.log('  ✅ GMS Perú set to video cover.');
  }

  // R&C Arquitectos (Social Media)
  const ryc = await prisma.content.findUnique({
    where: { slug: 'social-media-r-c-arquitectos' },
    include: { medias: true }
  });
  const rycVideo = ryc?.medias.find(m => m.url.includes('QUIENES_SOMOS')) ||
                   ryc?.medias.find(m => m.mimeType.startsWith('video/'));
  if (ryc && rycVideo) {
    await prisma.content.update({
      where: { id: ryc.id },
      data: { coverUrl: rycVideo.url, coverMimeType: 'video/mp4' }
    });
    console.log('  ✅ R&C Arquitectos set to video cover.');
  }

  // La Vieja Taberna (Fotografía)
  const lvtFoto = await prisma.content.findUnique({
    where: { slug: 'fotografia-la-vieja-taberna' }
  });
  // Retrieve LVT video from social media
  const lvtSocial = await prisma.content.findUnique({
    where: { slug: 'social-media-la-vieja-taberna' },
    include: { medias: true }
  });
  const lvtVideo = lvtSocial?.medias.find(m => m.url.includes('COMIDA')) ||
                   lvtSocial?.medias.find(m => m.mimeType.startsWith('video/'));
  if (lvtFoto && lvtVideo) {
    await prisma.content.update({
      where: { id: lvtFoto.id },
      data: { coverUrl: lvtVideo.url, coverMimeType: 'video/mp4' }
    });
    console.log('  ✅ La Vieja Taberna (Fotografía) set to video cover.');
  }

  // Design Market (Social Media)
  const dm = await prisma.content.findUnique({
    where: { slug: 'social-media-design-market' },
    include: { medias: true }
  });
  const dmVideo = dm?.medias.find(m => m.url.includes('TENDENCIAS')) ||
                  dm?.medias.find(m => m.mimeType.startsWith('video/'));
  if (dm && dmVideo) {
    await prisma.content.update({
      where: { id: dm.id },
      data: { coverUrl: dmVideo.url, coverMimeType: 'video/mp4' }
    });
    console.log('  ✅ Design Market set to video cover.');
  }

  // Write updated manifest back
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
  console.log('\n📝 Manifest file updated successfully.');

  // Cleanup compressed directory
  try {
    fs.rmSync(TMP_DIR, { recursive: true });
    console.log('🧹 Cleaned up temporary folders.');
  } catch {}

  console.log('\n✨ Database and assets sync complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
