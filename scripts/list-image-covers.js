import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const contents = await prisma.content.findMany({
    where: {
      OR: [
        { coverMimeType: { not: { startsWith: 'video/' } } },
        { coverMimeType: null }
      ]
    },
    select: {
      id: true,
      slug: true,
      title: true,
      category: true,
      coverUrl: true,
      coverMimeType: true,
      medias: {
        select: {
          url: true,
          mimeType: true
        }
      }
    },
    orderBy: {
      slug: 'asc',
    },
  });

  console.log('--- PROJECTS WITH IMAGE COVERS ---');
  for (const c of contents) {
    console.log(`\nSlug: ${c.slug} | Title: ${c.title} | Category: ${c.category}`);
    console.log(`Current Cover Url: ${c.coverUrl} (Mime: ${c.coverMimeType})`);
    const videos = c.medias.filter(m => m.mimeType?.startsWith('video/'));
    console.log(`Videos in gallery: ${videos.length}`);
    for (const v of videos) {
      console.log(`  - ${v.url}`);
    }
  }
}

main()
  .catch((err) => console.error(err))
  .finally(() => prisma.$disconnect());
