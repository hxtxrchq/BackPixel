import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Trying to enable/create policies...');
    
    // Check what policies exist on storage.objects
    const existingPolicies = await prisma.$queryRaw`
      SELECT policyname FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage'
    `;
    console.log('Existing policies:', existingPolicies);

    // Create policy for INSERT
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Allow public insert" ON storage.objects
      FOR INSERT TO public
      WITH CHECK (bucket_id = 'pixelbros');
    `);
    console.log('✅ Created INSERT policy');

    // Create policy for SELECT
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Allow public select" ON storage.objects
      FOR SELECT TO public
      USING (bucket_id = 'pixelbros');
    `);
    console.log('✅ Created SELECT policy');

    // Create policy for UPDATE
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Allow public update" ON storage.objects
      FOR UPDATE TO public
      USING (bucket_id = 'pixelbros');
    `);
    console.log('✅ Created UPDATE policy');

    // Create policy for DELETE
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Allow public delete" ON storage.objects
      FOR DELETE TO public
      USING (bucket_id = 'pixelbros');
    `);
    console.log('✅ Created DELETE policy');

  } catch (error) {
    console.error('❌ Policy operation failed:', error.message);
  }
}

main().finally(() => prisma.$disconnect());
