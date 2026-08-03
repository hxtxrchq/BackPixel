import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const contents = await prisma.content.findMany({
    where: {
      OR: [
        { slug: { contains: 'yuriko' } },
        { title: { contains: 'Yuriko' } }
      ]
    },
    include: {
      medias: {
        orderBy: { sortOrder: 'asc' }
      }
    }
  });

  console.log(`Found ${contents.length} Yuriko projects:`);
  for (const c of contents) {
    console.log(`\nProject: ${c.title} | Category: ${c.category} | Slug: ${c.slug}`);
    console.log(`Cover: ${c.coverUrl}`);
    console.log(`Logo: ${c.logoUrl}`);
    console.log('Medias:');
    c.medias.forEach((m, idx) => {
      console.log(` - [${idx}] ${m.url}`);
    });
  }
}

main().finally(() => prisma.$disconnect());
