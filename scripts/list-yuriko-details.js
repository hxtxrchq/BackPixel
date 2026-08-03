import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const contents = await prisma.content.findMany({
    where: {
      OR: [
        { title: { contains: 'Yuriko', mode: 'insensitive' } },
        { companyName: { contains: 'Yuriko', mode: 'insensitive' } }
      ]
    }
  });

  console.log('--- YURIKO DATABASE ENTRIES ---');
  for (const c of contents) {
    console.log(`ID: ${c.id} | Slug: ${c.slug} | Category: ${c.category} | Title: ${c.title} | Cover: ${c.coverUrl}`);
  }
}

main()
  .catch((err) => console.error(err))
  .finally(() => prisma.$disconnect());
