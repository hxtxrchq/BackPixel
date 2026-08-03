import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;

async function main() {
  console.log('Supabase URL:', supabaseUrl);
  console.log('Supabase Key (anon):', supabaseKey ? `${supabaseKey.slice(0, 10)}...` : 'undefined');

  // Let's call the Storage API to list buckets
  const res = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`
    }
  });

  console.log('Status:', res.status);
  try {
    const data = await res.json();
    console.log('Data:', data);
  } catch (e) {
    console.log('Error parsing response:', e.message);
    const text = await res.text();
    console.log('Raw text:', text);
  }
}

main().catch(console.error);
