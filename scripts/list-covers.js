import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const contents = await prisma.content.findMany({
    select: {
      id: true,
      slug: true,
      title: true,
      category: true,
      coverUrl: true,
      coverMimeType: true,
      logoUrl: true,
    },
    orderBy: {
      slug: 'asc',
    },
  });

  console.log('--- DATABASE COVER IMAGES/VIDEOS ---');
  for (const c of contents) {
    console.log(`- Slug: ${c.slug} | Cover MIME: ${c.coverMimeType} | Cover: ${c.coverUrl}`);
  }
}

main()
  .catch((err) => console.error(err))
  .finally(() => prisma.$disconnect());
