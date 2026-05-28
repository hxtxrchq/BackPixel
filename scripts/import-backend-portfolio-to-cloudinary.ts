import 'dotenv/config';

import fs from 'node:fs/promises';
import path from 'node:path';

import { PrismaClient } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';

type AssetRecord = {
  absolutePath: string;
  relativePath: string;
  categoryName: string;
  projectName: string;
  fileName: string;
  sortOrder: number;
  mimeType?: string;
};

type UploadedAsset = AssetRecord & {
  url: string;
};

const prisma = new PrismaClient();

const cleanSegment = (segment: string) =>
  segment
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const parseOrder = (fileName: string) => {
  const match = fileName.match(/(\d+)/);
  return match ? Number.parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
};

const getMimeTypeFromExtension = (fileName: string) => {
  const ext = path.extname(fileName).toLowerCase().replace('.', '');
  if (!ext) return undefined;

  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'avif'].includes(ext)) {
    return `image/${ext === 'jpg' ? 'jpeg' : ext}`;
  }

  if (['mp4', 'webm', 'mov', 'm4v'].includes(ext)) {
    return `video/${ext === 'mov' ? 'quicktime' : ext}`;
  }

  return undefined;
};

const isSupportedAsset = (fileName: string) => {
  const ext = path.extname(fileName).toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.avif', '.mp4', '.webm', '.mov', '.m4v'].includes(ext);
};

const requireEnv = (name: string) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Falta variable de entorno requerida: ${name}`);
  return value;
};

const resolveCloudConfig = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim() || process.env.NEW_CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim() || process.env.NEW_CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim() || process.env.NEW_CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      'Faltan credenciales de Cloudinary. Define CLOUDINARY_* o NEW_CLOUDINARY_* antes de ejecutar.',
    );
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  return { cloudName, apiKey, apiSecret };
};

const getArgValue = (name: string) => {
  const arg = process.argv.find((entry) => entry.startsWith(`--${name}=`));
  return arg ? arg.slice(name.length + 3) : undefined;
};

const hasFlag = (name: string) => process.argv.includes(`--${name}`);

const walkFiles = async (root: string): Promise<string[]> => {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const target = path.join(root, entry.name);
      if (entry.isDirectory()) return walkFiles(target);
      if (entry.isFile()) return [target];
      return [] as string[];
    }),
  );

  return nested.flat();
};

const collectAssets = async (portfolioRoot: string): Promise<AssetRecord[]> => {
  const allFiles = await walkFiles(portfolioRoot);

  const assets: AssetRecord[] = [];

  for (const absolutePath of allFiles) {
    const relativePath = path.relative(portfolioRoot, absolutePath);
    const normalized = relativePath.split(path.sep).join('/');
    const parts = normalized.split('/');

    if (parts.length < 3) continue;

    const fileName = parts[parts.length - 1];
    if (!isSupportedAsset(fileName)) continue;

    const categoryName = cleanSegment(parts[0]);
    const projectName = parts.slice(1, -1).map(cleanSegment).join(' / ');

    assets.push({
      absolutePath,
      relativePath: normalized,
      categoryName,
      projectName,
      fileName,
      sortOrder: parseOrder(fileName),
      mimeType: getMimeTypeFromExtension(fileName),
    });
  }

  return assets;
};

const createPublicId = (targetFolder: string, relativePath: string) => {
  const withoutExt = relativePath.replace(/\.[^.]+$/, '');
  const segments = withoutExt
    .split('/')
    .map((segment) => slugify(segment) || 'asset')
    .filter(Boolean);

  return `${targetFolder}/${segments.join('/')}`;
};

const uploadAsset = async (asset: AssetRecord, targetFolder: string): Promise<string> => {
  const publicId = createPublicId(targetFolder, asset.relativePath);

  const result = await cloudinary.uploader.upload(asset.absolutePath, {
    resource_type: 'auto',
    public_id: publicId,
    use_filename: false,
    unique_filename: false,
    overwrite: true,
  });

  if (!result.secure_url) throw new Error(`Cloudinary no devolvio secure_url para ${asset.relativePath}`);

  return result.secure_url;
};

const chooseLogo = (assets: UploadedAsset[]) =>
  assets.find((asset) => /logo|isotipo|imagotipo/i.test(asset.fileName));

async function main() {
  const apply = hasFlag('apply');
  const portfolioRoot = path.resolve(
    process.cwd(),
    getArgValue('root') || process.env.PORTFOLIO_IMPORT_ROOT || 'uploads/Portfolio',
  );
  const targetFolder = getArgValue('folder') || process.env.PORTFOLIO_IMPORT_FOLDER || 'pixelbros/Portfolio';

  const stat = await fs.stat(portfolioRoot).catch(() => null);
  if (!stat || !stat.isDirectory()) {
    throw new Error(`No existe carpeta de portfolio: ${portfolioRoot}`);
  }

  const assets = await collectAssets(portfolioRoot);
  if (assets.length === 0) {
    console.log(`No se encontraron assets soportados en ${portfolioRoot}`);
    return;
  }

  const bucketMap = new Map<string, AssetRecord[]>();

  for (const asset of assets) {
    const key = `${slugify(asset.categoryName)}::${slugify(asset.projectName)}`;
    if (!bucketMap.has(key)) bucketMap.set(key, []);
    bucketMap.get(key)!.push(asset);
  }

  console.log(`Carpeta portfolio: ${portfolioRoot}`);
  console.log(`Assets detectados: ${assets.length}`);
  console.log(`Proyectos detectados: ${bucketMap.size}`);

  if (!apply) {
    console.log('Modo simulacion activo. Ejecuta con --apply para subir a Cloudinary y actualizar BD.');
    return;
  }

  resolveCloudConfig();

  let uploaded = 0;
  let failed = 0;
  let created = 0;
  let updated = 0;

  for (const [key, projectAssets] of bucketMap.entries()) {
    const ordered = [...projectAssets].sort((a, b) => a.sortOrder - b.sortOrder || a.fileName.localeCompare(b.fileName));
    const uploadedAssets: UploadedAsset[] = [];

    for (const asset of ordered) {
      try {
        const url = await uploadAsset(asset, targetFolder);
        uploadedAssets.push({ ...asset, url });
        uploaded += 1;
      } catch (error) {
        failed += 1;
        console.error(`Fallo subiendo ${asset.relativePath}:`, error);
      }
    }

    if (uploadedAssets.length === 0) {
      continue;
    }

    const categoryName = uploadedAssets[0].categoryName;
    const projectName = uploadedAssets[0].projectName;
    const slug = `${slugify(categoryName)}-${slugify(projectName)}`;

    const mediaRows = uploadedAssets.map((asset, index) => ({
      url: asset.url,
      mimeType: asset.mimeType,
      sortOrder: Number.isFinite(asset.sortOrder) && asset.sortOrder !== Number.MAX_SAFE_INTEGER ? asset.sortOrder : index,
    }));

    const cover = mediaRows[0];
    const logoAsset = chooseLogo(uploadedAssets);

    const exists = await prisma.content.findUnique({ where: { slug }, select: { id: true } });

    await prisma.content.upsert({
      where: { slug },
      update: {
        companyName: projectName,
        title: projectName,
        category: categoryName,
        showOnPortfolio: true,
        coverUrl: cover?.url,
        coverMimeType: cover?.mimeType,
        logoUrl: logoAsset?.url,
        logoMimeType: logoAsset?.mimeType,
        galleryCount: mediaRows.length,
        medias: {
          deleteMany: {},
          create: mediaRows,
        },
      },
      create: {
        companyName: projectName,
        title: projectName,
        slug,
        category: categoryName,
        showOnHome: false,
        showOnPortfolio: true,
        coverUrl: cover?.url,
        coverMimeType: cover?.mimeType,
        logoUrl: logoAsset?.url,
        logoMimeType: logoAsset?.mimeType,
        galleryCount: mediaRows.length,
        medias: {
          create: mediaRows,
        },
      },
    });

    if (exists) updated += 1;
    else created += 1;

    console.log(`Proyecto procesado: ${key} (media: ${mediaRows.length})`);
  }

  console.log('Importacion completada.');
  console.log(`Assets subidos: ${uploaded}`);
  console.log(`Assets fallidos: ${failed}`);
  console.log(`Proyectos creados: ${created}`);
  console.log(`Proyectos actualizados: ${updated}`);
}

main()
  .catch((error) => {
    console.error('Error importando portfolio local a Cloudinary:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
