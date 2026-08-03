import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const contents = await prisma.content.findMany({
    select: {
      slug: true,
      category: true,
      logoUrl: true,
    },
    orderBy: { slug: 'asc' }
  });
  console.log(JSON.stringify(contents, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
