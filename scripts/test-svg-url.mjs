

const urls = [
  'https://rkrkvskjlxqujlmluciw.supabase.co/storage/v1/object/public/pixelbros/Portfolio/Diseno_de_Identidad_Visual/Dulce_Cuidado/7_v2.svg',
  'https://rkrkvskjlxqujlmluciw.supabase.co/storage/v1/object/public/pixelbros/Portfolio/Diseno_de_Identidad_Visual/Dulce_Cuidado/9_v2.svg'
];

async function main() {
  for (const url of urls) {
    console.log(`Fetching ${url}...`);
    try {
      const res = await fetch(url);
      console.log(`Status: ${res.status} ${res.statusText}`);
      console.log(`Content-Type: ${res.headers.get('content-type')}`);
      console.log(`Content-Length: ${res.headers.get('content-length')}`);
      if (res.status === 200) {
        const body = await res.text();
        console.log(`Body starts with: ${body.slice(0, 100)}`);
      }
    } catch (e) {
      console.error(e);
    }
    console.log('---');
  }
}

main();
