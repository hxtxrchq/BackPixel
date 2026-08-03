import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const projects = await prisma.content.findMany({
    where: {
      OR: [
        { slug: { contains: 'yuriko' } },
        { slug: { contains: 'ginecofeme' } }
      ]
    },
    include: {
      medias: true
    }
  });

  console.log(JSON.stringify(projects, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
