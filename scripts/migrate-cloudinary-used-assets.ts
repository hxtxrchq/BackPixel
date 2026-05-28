import 'dotenv/config';

import { v2 as cloudinary } from 'cloudinary';
import { PrismaClient } from '@prisma/client';

type CloudConfig = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

type MigrationOptions = {
  apply: boolean;
  targetFolder?: string;
};

const prisma = new PrismaClient();

const requireEnv = (name: string) => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Falta variable de entorno requerida: ${name}`);
  }
  return value;
};

const getCloudConfig = (prefix: 'OLD' | 'NEW'): CloudConfig => ({
  cloudName: requireEnv(`${prefix}_CLOUDINARY_CLOUD_NAME`),
  apiKey: requireEnv(`${prefix}_CLOUDINARY_API_KEY`),
  apiSecret: requireEnv(`${prefix}_CLOUDINARY_API_SECRET`),
});

const getOptions = (): MigrationOptions => {
  const apply = process.argv.includes('--apply');
  const folderArg = process.argv.find((arg) => arg.startsWith('--folder='));
  const targetFolder = folderArg ? folderArg.split('=')[1]?.trim() : process.env.MIGRATION_TARGET_FOLDER?.trim();

  return {
    apply,
    targetFolder: targetFolder || undefined,
  };
};

const configureCloudinary = (config: CloudConfig) => {
  cloudinary.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
    secure: true,
  });
};

const normalizeUrl = (url: string) => url.trim();

const main = async () => {
  const oldCloud = getCloudConfig('OLD');
  const newCloud = getCloudConfig('NEW');
  const options = getOptions();

  const oldCloudBase = `https://res.cloudinary.com/${oldCloud.cloudName}/`;

  const contents = await prisma.content.findMany({
    select: {
      id: true,
      coverUrl: true,
      logoUrl: true,
      medias: {
        select: {
          id: true,
          url: true,
        },
      },
    },
  });

  const oldUrls = new Set<string>();

  for (const content of contents) {
    if (content.coverUrl && normalizeUrl(content.coverUrl).startsWith(oldCloudBase)) {
      oldUrls.add(normalizeUrl(content.coverUrl));
    }

    if (content.logoUrl && normalizeUrl(content.logoUrl).startsWith(oldCloudBase)) {
      oldUrls.add(normalizeUrl(content.logoUrl));
    }

    for (const media of content.medias) {
      if (media.url && normalizeUrl(media.url).startsWith(oldCloudBase)) {
        oldUrls.add(normalizeUrl(media.url));
      }
    }
  }

  if (oldUrls.size === 0) {
    console.log('No se encontraron URLs del cloud viejo en la base de datos.');
    return;
  }

  console.log(`URLs detectadas para migrar: ${oldUrls.size}`);

  if (!options.apply) {
    console.log('Modo simulacion activo. No se subieron archivos ni se actualizo la base de datos.');
    console.log('Ejecuta con --apply para aplicar cambios reales.');
    return;
  }

  configureCloudinary(newCloud);

  const urlMap = new Map<string, string>();

  let index = 0;
  for (const oldUrl of oldUrls) {
    index += 1;
    process.stdout.write(`Migrando ${index}/${oldUrls.size}: ${oldUrl}\n`);

    try {
      const uploadResult = await cloudinary.uploader.upload(oldUrl, {
        resource_type: 'auto',
        folder: options.targetFolder,
        use_filename: true,
        unique_filename: true,
        overwrite: false,
      });

      if (!uploadResult.secure_url) {
        throw new Error('Cloudinary no devolvio secure_url');
      }

      urlMap.set(oldUrl, uploadResult.secure_url);
    } catch (error) {
      process.stdout.write(`Fallo migrando URL: ${oldUrl}\n`);
      throw error;
    }
  }

  let coverUpdates = 0;
  let logoUpdates = 0;
  let mediaUpdates = 0;

  await prisma.$transaction(async (tx) => {
    for (const content of contents) {
      if (content.coverUrl) {
        const normalized = normalizeUrl(content.coverUrl);
        const migrated = urlMap.get(normalized);
        if (migrated && migrated !== normalized) {
          await tx.content.update({
            where: { id: content.id },
            data: { coverUrl: migrated },
          });
          coverUpdates += 1;
        }
      }

      if (content.logoUrl) {
        const normalized = normalizeUrl(content.logoUrl);
        const migrated = urlMap.get(normalized);
        if (migrated && migrated !== normalized) {
          await tx.content.update({
            where: { id: content.id },
            data: { logoUrl: migrated },
          });
          logoUpdates += 1;
        }
      }

      for (const media of content.medias) {
        const normalized = normalizeUrl(media.url);
        const migrated = urlMap.get(normalized);
        if (migrated && migrated !== normalized) {
          await tx.contentMedia.update({
            where: { id: media.id },
            data: { url: migrated },
          });
          mediaUpdates += 1;
        }
      }
    }
  });

  console.log('Migracion completada.');
  console.log(`coverUrl actualizadas: ${coverUpdates}`);
  console.log(`logoUrl actualizadas: ${logoUpdates}`);
  console.log(`media.url actualizadas: ${mediaUpdates}`);
};

main()
  .catch((error) => {
    console.error('Error en la migracion de Cloudinary:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
