import 'dotenv/config';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

async function main() {
  try {
    const result = await cloudinary.api.ping();
    console.log('Ping result:', result);
    
    const resources = await cloudinary.api.resources({ max_results: 5 });
    console.log('Resources found:', resources.resources.length);
    if (resources.resources.length > 0) {
      console.log('Sample resource:', resources.resources[0]);
    }
  } catch (error) {
    console.error('Cloudinary API Error:', error);
  }
}

main();
