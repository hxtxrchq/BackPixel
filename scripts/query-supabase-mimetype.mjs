import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const objects = await prisma.$queryRawUnsafe(`
    SELECT * FROM storage.objects
    WHERE bucket_id = 'pixelbros' AND name LIKE '%Dulce_Cuidado%' AND name LIKE '%.svg';
  `);
  console.log('Database storage objects (all columns):');
  for (const obj of objects) {
    console.log(`\nName: ${obj.name}`);
    for (const [k, v] of Object.entries(obj)) {
      if (k !== 'name') {
        console.log(`  ${k}:`, typeof v === 'object' ? JSON.stringify(v) : v);
      }
    }
  }
}

main().finally(() => prisma.$disconnect());
