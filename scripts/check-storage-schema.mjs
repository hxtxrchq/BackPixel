import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // List tables in storage schema
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'storage'
    `;
    console.log('Storage tables:', tables);

    // List existing buckets
    const buckets = await prisma.$queryRaw`
      SELECT * FROM storage.buckets
    `;
    console.log('Storage buckets:', buckets);
  } catch (error) {
    console.error('Database query error:', error);
  }
}

main().finally(() => prisma.$disconnect());
