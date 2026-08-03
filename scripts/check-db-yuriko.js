import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const contents = await prisma.content.findMany({
    where: {
      slug: {
        in: ['social-media-doctora-yuriko', 'social-media-ginecofeme', 'fotografia-doctora-yuriko']
      }
    }
  });

  console.log('--- DB ENTRIES DETAILS ---');
  for (const c of contents) {
    console.log(`Slug: ${c.slug}`);
    console.log(`  Title: ${c.title}`);
    console.log(`  CompanyName: ${c.companyName}`);
    console.log(`  LogoLabel: ${c.logoLabel}`);
    console.log(`  LogoUrl: ${c.logoUrl}`);
    console.log(`  CoverUrl: ${c.coverUrl}`);
    console.log(`  Category: ${c.category}`);
  }
}

main()
  .catch((err) => console.error(err))
  .finally(() => prisma.$disconnect());
