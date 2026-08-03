import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const contents = await prisma.content.findMany({
    include: {
      medias: true
    },
    orderBy: {
      slug: 'asc',
    },
  });

  console.log('--- DATABASE PROJECTS AND MEDIA ---');
  for (const c of contents) {
    console.log(`\nProject: ${c.title} (Slug: ${c.slug}, Category: ${c.category})`);
    console.log(`Cover URL: ${c.coverUrl} (MIME: ${c.coverMimeType})`);
    console.log('Gallery Medias:');
    for (const m of c.medias) {
      console.log(`  - Url: ${m.url} | MIME: ${m.mimeType}`);
    }
  }
}

main()
  .catch((err) => console.error(err))
  .finally(() => prisma.$disconnect());
