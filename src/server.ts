import { app } from './app.js';
import { env } from './config/env.js';
import { ensurePrismaConnected, prismaRaw } from './db/prisma.js';

const startServer = async () => {
  const server = app.listen(env.PORT, () => {
    console.log(`API running on http://localhost:${env.PORT}${env.API_PREFIX}`);
  });

  ensurePrismaConnected({
    maxAttempts: 10,
    initialDelayMs: 700,
  })
    .then(() => {
      console.log('[BOOT] Base de datos lista para operaciones.');
    })
    .catch((error) => {
      console.error('[BOOT] Base de datos no disponible al iniciar. El servidor seguira activo y reintentara en consultas:', error);
    });

  const shutdown = async () => {
    await prismaRaw.$disconnect().catch(() => undefined);
    server.close();
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

startServer().catch((error) => {
  console.error('[BOOT] No se pudo iniciar el servidor:', error);
  process.exit(1);
});
