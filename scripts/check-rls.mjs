import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Check RLS on storage.objects
    const rls = await prisma.$queryRaw`
      SELECT relname, relrowsecurity 
      FROM pg_class 
      JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace 
      WHERE nspname = 'storage' AND relname IN ('objects', 'buckets')
    `;
    console.log('RLS Status:', rls);

    // Let's also check if we can query policies
    const policies = await prisma.$queryRaw`
      SELECT * FROM pg_policies WHERE schemaname = 'storage'
    `;
    console.log('Storage Policies:', policies);
  } catch (error) {
    console.error('Error:', error);
  }
}

main().finally(() => prisma.$disconnect());
