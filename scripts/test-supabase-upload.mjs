import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';

const prisma = new PrismaClient();
const BUCKET_NAME = 'pixelbros';

async function main() {
  console.log('Setting up Supabase Storage Bucket...');
  try {
    // Create bucket if not exists
    await prisma.$executeRawUnsafe(`
      INSERT INTO storage.buckets (id, name, public)
      VALUES ('${BUCKET_NAME}', '${BUCKET_NAME}', true)
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log('✅ Bucket created or already exists.');
  } catch (error) {
    console.error('❌ Database storage setup failed:', error.message);
  }

  // Try uploading a test file
  const testFilePath = 'scripts/test-supabase-upload.mjs';
  const fileBuffer = fs.readFileSync(testFilePath);

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;

  const uploadUrl = `${supabaseUrl}/storage/v1/object/${BUCKET_NAME}/test_file.js`;

  console.log('Uploading test file to:', uploadUrl);

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/javascript',
      'x-upsert': 'true',
    },
    body: fileBuffer,
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`❌ Upload failed: ${response.status} ${response.statusText} - ${text}`);
  } else {
    const data = await response.json();
    console.log('✅ Upload succeeded! Response data:', data);
    console.log(`Public URL: ${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/test_file.js`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
