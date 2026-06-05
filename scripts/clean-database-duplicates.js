import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SLUGS_TO_DELETE = [
  'social-media-barbarian-bar-7f99fa78',
  'social-media-design-market-96fc5b4d',
  'social-media-doctora-yuriko-48735627',
  'social-media-ellos-839354f7',
  'social-media-frissagio-97bc2369',
  'social-media-ginecofeme-ff85552d',
  'social-media-gms-peru-2171ce09',
  'social-media-la-vieja-taberna-46e0b816',
  'social-media-r-c-arquitectos-493f3bdd',
  'audiovisual-gms-25e45e03',
  'audiovisual-luxia-6810bda1',
  'audiovisual-pascual-presutti-daa79d86',
  'audiovisual-fof-trujillo-d1f143f6',
  'branding-dulce-cuidado-b2dda2b9',
  'branding-laboralis-de5ff0cc',
  'fotografia-dulce-cuidado-0e0171d2',
  'fotografia-la-vieja-taberna-fotografia-844bfd7a',
  'menu-digital-elevaria-3016388f'
];

async function main() {
  console.log('🧹 Cleaning duplicate/legacy content from database...');
  
  const result = await prisma.content.deleteMany({
    where: {
      slug: {
        in: SLUGS_TO_DELETE
      }
    }
  });

  console.log(`✅ Successfully deleted ${result.count} obsolete portfolio records from the database.`);
}

main()
  .catch((err) => console.error(err))
  .finally(() => prisma.$disconnect());
