import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();
const r = await p.content.findMany({
  where: {
    OR: [
      { companyName: 'GMS', category: 'AudioVisual' },
      { companyName: 'GMS Perú' },
      { companyName: 'Design Market' },
    ],
  },
  select: { companyName: true, category: true, coverUrl: true, galleryCount: true },
});
console.log(JSON.stringify(r, null, 2));
await p.$disconnect();
