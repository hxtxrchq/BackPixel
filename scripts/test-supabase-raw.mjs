import 'dotenv/config';
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;

const url = `${supabaseUrl}/storage/v1/object/authenticated/pixelbros/Portfolio/Diseno_de_Identidad_Visual/Dulce_Cuidado/7.svg`;

async function main() {
  console.log(`Fetching from authenticated API: ${url}`);
  try {
    const res = await fetch(url, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`
      }
    });
    console.log(`Status: ${res.status} ${res.statusText}`);
    console.log(`Content-Type: ${res.headers.get('content-type')}`);
    console.log(`Content-Length: ${res.headers.get('content-length')}`);
  } catch (e) {
    console.error(e);
  }
}

main();
