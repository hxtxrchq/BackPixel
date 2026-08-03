import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.content.update({
    where: { slug: 'audiovisual-fof-trujillo' },
    data: { logoUrl: '/logos/FoF.png' }
  });
  console.log('Successfully updated logo for FOF Trujillo:', result);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
