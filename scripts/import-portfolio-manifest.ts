import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '../src/db/prisma.js';

type Manifest = Record<string, string>;

type MediaItem = {
  url: string;
  mimeType?: string;
  fileName: string;
  sortOrder: number | null;
};

type ProjectBucket = {
  categoryName: string;
  projectName: string;
  medias: MediaItem[];
};

const cleanFolder = (segment: string) =>
  segment
    .replace(/^\d+[_. ]+/, '')
    .replace(/[_ ]+$/, '')
    .replace(/_/g, ' ')
    .trim();

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const orderFromFileName = (fileName: string) => {
  const match = fileName.match(/(\d+)/);
  return match ? Number.parseInt(match[1], 10) : null;
};

const getMimeTypeFromFileName = (fileName: string) => {
  const ext = fileName.match(/\.([^.]+)$/)?.[1]?.toLowerCase() ?? '';

  if (['mp4', 'webm', 'mov', 'm4v'].includes(ext)) return `video/${ext === 'mov' ? 'quicktime' : ext}`;
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'avif'].includes(ext)) return `image/${ext === 'jpg' ? 'jpeg' : ext}`;

  return undefined;
};

const manifestPath = path.resolve(process.cwd(), '..', 'Frontend', 'src', 'config', 'cloudinaryManifest.json');

const readManifest = (): Manifest => {
  const content = fs.readFileSync(manifestPath, 'utf8');
  return JSON.parse(content) as Manifest;
};

const buildBuckets = (manifest: Manifest) => {
  const buckets = new Map<string, ProjectBucket>();

  for (const [rawKey, url] of Object.entries(manifest)) {
    const key = rawKey.replace(/\\/g, '/');
    const match = key.match(/^\/Portfolio\/([^/]+)\/([^/]+)\/(.+)$/);
    if (!match) continue;

    const [, categorySegment, projectSegment, rest] = match;
    const categoryName = cleanFolder(categorySegment);
    const projectName = cleanFolder(projectSegment);
    const fileName = rest.split('/').pop() || '';

    const bucketKey = `${slugify(categoryName)}::${slugify(projectName)}`;

    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, {
        categoryName,
        projectName,
        medias: [],
      });
    }

    const bucket = buckets.get(bucketKey)!;
    bucket.medias.push({
      url,
      fileName,
      mimeType: getMimeTypeFromFileName(fileName),
      sortOrder: orderFromFileName(fileName),
    });
  }

  return buckets;
};

async function main() {
  const manifest = readManifest();
  const buckets = buildBuckets(manifest);

  let created = 0;
  let updated = 0;
  let mediaTotal = 0;

  for (const bucket of buckets.values()) {
    const medias = [...bucket.medias]
      .sort((a, b) => {
        const orderA = a.sortOrder ?? 2_000_000_000;
        const orderB = b.sortOrder ?? 2_000_000_000;
        return orderA - orderB || a.fileName.localeCompare(b.fileName);
      })
      .map((media, index) => ({
        url: media.url,
        mimeType: media.mimeType,
        sortOrder: Number.isFinite(media.sortOrder) ? media.sortOrder : index,
      }));

    const slug = `${slugify(bucket.categoryName)}-${slugify(bucket.projectName)}`;
    const cover = medias[0];
    mediaTotal += medias.length;

    const existing = await prisma.content.findUnique({
      where: { slug },
      select: { id: true },
    });

    await prisma.content.upsert({
      where: { slug },
      update: {
        companyName: bucket.projectName,
        title: bucket.projectName,
        category: bucket.categoryName,
        showOnPortfolio: true,
        coverUrl: cover?.url,
        coverMimeType: cover?.mimeType,
        galleryCount: medias.length,
        medias: {
          deleteMany: {},
          create: medias,
        },
      },
      create: {
        companyName: bucket.projectName,
        title: bucket.projectName,
        slug,
        category: bucket.categoryName,
        showOnHome: false,
        showOnPortfolio: true,
        coverUrl: cover?.url,
        coverMimeType: cover?.mimeType,
        galleryCount: medias.length,
        medias: {
          create: medias,
        },
      },
    });

    if (existing) {
      updated += 1;
    } else {
      created += 1;
    }
  }

  console.log(`Importacion completada. Creados: ${created}, actualizados: ${updated}, total proyectos: ${buckets.size}, total archivos: ${mediaTotal}`);
}

main()
  .catch((error) => {
    console.error('Error en importacion de portfolio:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
