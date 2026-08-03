import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const contents = await prisma.content.findMany();
  for (const c of contents) {
    console.log(JSON.stringify(c, null, 2));
  }
}
main().finally(() => prisma.$disconnect());
