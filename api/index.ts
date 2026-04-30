import 'dotenv/config';
import { app } from '../src/app.js';
import { ensurePrismaConnected, prismaRaw } from '../src/db/prisma.js';

// Asegurar conexión a BD al iniciar
ensurePrismaConnected({
  maxAttempts: 5,
  initialDelayMs: 500,
})
  .then(() => {
    console.log('[BOOT] Base de datos lista para operaciones.');
  })
  .catch((error) => {
    console.error('[BOOT] Base de datos no disponible al iniciar:', error);
  });

// Graceful shutdown en Vercel
process.on('SIGTERM', async () => {
  await prismaRaw.$disconnect().catch(() => undefined);
});

export default app;
