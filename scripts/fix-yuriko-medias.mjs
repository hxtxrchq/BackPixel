import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Fixing Yuriko Cruz media lists in database...');

  // 1. Fix social-media-doctora-yuriko
  const smYuriko = await prisma.content.findUnique({
    where: { slug: 'social-media-doctora-yuriko' }
  });

  if (smYuriko) {
    const smMedias = [
      { url: 'https://res.cloudinary.com/drbiifrto/video/upload/v1780681643/pixelbros/content/1780681632622_a07fad_DRAYURIKO_SALUDOS.mp4', mimeType: 'video/mp4', sortOrder: 0 },
      { url: 'https://res.cloudinary.com/drbiifrto/video/upload/v1780681677/pixelbros/content/1780681667882_8bd07b_DRA_YURIKO_SOP.mp4', mimeType: 'video/mp4', sortOrder: 1 },
      { url: 'https://res.cloudinary.com/drbiifrto/video/upload/v1780681732/pixelbros/content/1780681732945_9c75fc_DRA_YURIKO_STORYTIME.mp4', mimeType: 'video/mp4', sortOrder: 2 },
      { url: 'https://res.cloudinary.com/drbiifrto/image/upload/v1780681701/pixelbros/content/1780681702056_2317cd__Sab_as_que...-03.png', mimeType: 'image/png', sortOrder: 3 },
      { url: 'https://res.cloudinary.com/drbiifrto/image/upload/v1780681702/pixelbros/content/1780681702997_23f0c5__Sab_as_que...-04.png', mimeType: 'image/png', sortOrder: 4 },
      { url: 'https://res.cloudinary.com/drbiifrto/image/upload/v1780681707/pixelbros/content/1780681704145_7253c4__Sab_as_que....webp', mimeType: 'image/webp', sortOrder: 5 }
    ];

    await prisma.$transaction([
      prisma.contentMedia.deleteMany({ where: { contentId: smYuriko.id } }),
      prisma.contentMedia.createMany({
        data: smMedias.map(m => ({ ...m, contentId: smYuriko.id }))
      }),
      prisma.content.update({
        where: { id: smYuriko.id },
        data: {
          coverUrl: smMedias[0].url,
          coverMimeType: 'video/mp4',
          galleryCount: smMedias.length
        }
      })
    ]);

    console.log('✅ Social Media Yuriko Cruz media list and cover fixed.');
  }

  // 2. Fix fotografia-doctora-yuriko
  const fotoYuriko = await prisma.content.findUnique({
    where: { slug: 'fotografia-doctora-yuriko' }
  });

  if (fotoYuriko) {
    const fotoMedias = [
      { url: 'https://res.cloudinary.com/drbiifrto/image/upload/v1781722845/pixelbros/content/1781722844312_2fd980_yuriko_foto_dsc06344-png.webp', mimeType: 'image/webp', sortOrder: 0 },
      { url: 'https://res.cloudinary.com/drbiifrto/image/upload/v1781722847/pixelbros/content/1781722847000_62a325_yuriko_foto_dsc06359-png.webp', mimeType: 'image/webp', sortOrder: 1 },
      { url: 'https://res.cloudinary.com/drbiifrto/image/upload/v1781722850/pixelbros/content/1781722849269_fec0d6_yuriko_foto_dsc09529-png.webp', mimeType: 'image/webp', sortOrder: 2 },
      { url: 'https://res.cloudinary.com/drbiifrto/image/upload/v1781722852/pixelbros/content/1781722851761_be7a97_yuriko_foto_dsc09545-png.webp', mimeType: 'image/webp', sortOrder: 3 },
      { url: 'https://res.cloudinary.com/drbiifrto/image/upload/v1781722855/pixelbros/content/1781722854262_bffca9_yuriko_foto_dsc09550-png.webp', mimeType: 'image/webp', sortOrder: 4 }
    ];

    await prisma.$transaction([
      prisma.contentMedia.deleteMany({ where: { contentId: fotoYuriko.id } }),
      prisma.contentMedia.createMany({
        data: fotoMedias.map(m => ({ ...m, contentId: fotoYuriko.id }))
      }),
      prisma.content.update({
        where: { id: fotoYuriko.id },
        data: {
          coverUrl: fotoMedias[0].url,
          coverMimeType: 'image/webp',
          galleryCount: fotoMedias.length
        }
      })
    ]);

    console.log('✅ Fotografía Yuriko Cruz media list and cover fixed.');
  }

  console.log('✨ All fixes completed!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
