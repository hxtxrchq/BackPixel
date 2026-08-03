import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const BUCKET_NAME = 'pixelbros';

const svgs = [
  {
    local: 'uploads/Portfolio/Branding/Dulce Cuidado/7.svg',
    storage: 'Portfolio/Diseno_de_Identidad_Visual/Dulce_Cuidado/7.svg'
  },
  {
    local: 'uploads/Portfolio/Branding/Dulce Cuidado/9.svg',
    storage: 'Portfolio/Diseno_de_Identidad_Visual/Dulce_Cuidado/9.svg'
  }
];

async function main() {
  for (const svg of svgs) {
    const fileUrl = `${supabaseUrl}/storage/v1/object/${BUCKET_NAME}/${svg.storage}`;
    console.log(`\nProcessing ${svg.storage}...`);

    // 1. Delete the existing file
    try {
      console.log(`  Deleting file from Supabase...`);
      const delRes = await fetch(fileUrl, {
        method: 'DELETE',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`
        }
      });
      console.log(`  Delete status: ${delRes.status} ${delRes.statusText}`);
    } catch (e) {
      console.warn(`  Delete failed (might not exist): ${e.message}`);
    }

    // 2. Upload the file from scratch
    console.log(`  Uploading file from scratch: ${svg.local}...`);
    const fileBuffer = fs.readFileSync(svg.local);
    const uploadRes = await fetch(fileUrl, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'image/svg+xml'
      },
      body: fileBuffer
    });
    
    if (uploadRes.ok) {
      console.log(`  ✅ Successfully uploaded!`);
    } else {
      const text = await uploadRes.text();
      console.error(`  ❌ Upload failed: ${uploadRes.status} - ${text}`);
    }
  }
}

main();
