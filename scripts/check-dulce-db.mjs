import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const content = await prisma.content.findUnique({
    where: { slug: 'diseno-de-identidad-visual-dulce-cuidado' },
    include: {
      medias: {
        orderBy: { sortOrder: 'asc' }
      }
    }
  });

  if (!content) {
    console.log('Dulce Cuidado project not found in DB!');
    return;
  }

  console.log(`Project: ${content.title} | Cover: ${content.coverUrl} | Logo: ${content.logoUrl}`);
  console.log('Media items in DB:');
  content.medias.forEach((m, i) => {
    console.log(` - [${i}] ID: ${m.id} | Url: ${m.url} | Mime: ${m.mimeType}`);
  });
}

main().finally(() => prisma.$disconnect());
