import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Restoring correct covers for projects without native videos...');

  // 1. Dra. Yuriko (Fotografia) -> Set cover to first image in its gallery
  const yuriko = await prisma.content.findUnique({
    where: { slug: 'fotografia-doctora-yuriko' },
    include: { medias: { orderBy: { sortOrder: 'asc' } } }
  });
  if (yuriko && yuriko.medias.length > 0) {
    await prisma.content.update({
      where: { id: yuriko.id },
      data: {
        coverUrl: yuriko.medias[0].url,
        coverMimeType: yuriko.medias[0].mimeType || 'image/webp'
      }
    });
    console.log(`  ✅ Yuriko (Fotografia) restored to photo cover: ${yuriko.medias[0].url}`);
  }

  // 2. Barbarian Bar (Fotografia) -> Set cover to first image in its gallery
  const barbarian = await prisma.content.findUnique({
    where: { slug: 'fotografia-barbarian-bar' },
    include: { medias: { orderBy: { sortOrder: 'asc' } } }
  });
  if (barbarian && barbarian.medias.length > 0) {
    await prisma.content.update({
      where: { id: barbarian.id },
      data: {
        coverUrl: barbarian.medias[0].url,
        coverMimeType: barbarian.medias[0].mimeType || 'image/webp'
      }
    });
    console.log(`  ✅ Barbarian Bar (Fotografia) restored to photo cover: ${barbarian.medias[0].url}`);
  }

  // 3. La Vieja Taberna (Fotografia) -> Restore to its original photo cover
  const lvt = await prisma.content.findUnique({
    where: { slug: 'fotografia-la-vieja-taberna' }
  });
  if (lvt) {
    const originalLvtCover = 'https://res.cloudinary.com/drbiifrto/image/upload/v1780629724/pixelbros/Portfolio/Fotografia/LA_VIEJA_TABERNA/DSC01370.webp';
    await prisma.content.update({
      where: { id: lvt.id },
      data: {
        coverUrl: originalLvtCover,
        coverMimeType: 'image/webp'
      }
    });
    console.log(`  ✅ La Vieja Taberna (Fotografia) restored to original cover: ${originalLvtCover}`);
  }

  console.log('\n✨ Database covers fixed!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
