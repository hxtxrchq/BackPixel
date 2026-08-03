import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const dc1 = await prisma.content.updateMany({
    where: { slug: 'diseno-de-identidad-visual-dulce-cuidado' },
    data: { logoUrl: '/logos/DulceCuidado.png' }
  });
  const dc2 = await prisma.content.updateMany({
    where: { slug: 'fotografia-dulce-cuidado' },
    data: { logoUrl: '/logos/DulceCuidado.png' }
  });
  const ent = await prisma.content.updateMany({
    where: { slug: 'diseno-de-identidad-visual-entrepenauta' },
    data: { logoUrl: '/logos/entepenauta.png' }
  });
  const lab = await prisma.content.updateMany({
    where: { slug: 'diseno-de-identidad-visual-laboralis' },
    data: { logoUrl: '/logos/Laboralis.png' }
  });

  console.log('Successfully updated remaining project logos in the database.');
  console.log('Dulce Cuidado (Visual):', dc1);
  console.log('Dulce Cuidado (Photo):', dc2);
  console.log('Entrepenauta:', ent);
  console.log('Laboralis:', lab);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
