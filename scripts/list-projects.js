import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const contents = await prisma.content.findMany({
    select: {
      id: true,
      slug: true,
      title: true,
      category: true,
      galleryCount: true,
    },
    orderBy: {
      slug: 'asc',
    },
  });

  console.log('--- DATABASE PORTFOLIO CONTENT ---');
  for (const c of contents) {
    console.log(`- Slug: ${c.slug} | Title: ${c.title} | Category: ${c.category} | Items: ${c.galleryCount} | ID: ${c.id}`);
  }
}

main()
  .catch((err) => console.error(err))
  .finally(() => prisma.$disconnect());
