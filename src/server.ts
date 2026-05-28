import { app } from './app.js';
import { env } from './config/env.js';
import { ensurePrismaConnected, prismaRaw } from './db/prisma.js';

const startServer = async () => {
  const server = app.listen(env.PORT, () => {
    console.log(`API running on http://localhost:${env.PORT}${env.API_PREFIX}`);
  });

  server.on('error', (error) => {
    console.error('[SERVER_ERROR]', error);
  });

  ensurePrismaConnected({
    maxAttempts: 10,
    initialDelayMs: 700,
  })
    .then(() => {
      console.log('[BOOT] Base de datos lista para operaciones.');
    })
    .catch((error) => {
      console.error('[BOOT] Base de datos no disponible al iniciar:', error);
    });

  // Keeps the event loop alive — prevents accidental drainage
  const keepAlive = setInterval(() => {}, 30_000);

  const shutdown = async (signal: string) => {
    console.log(`[SHUTDOWN] Recibido ${signal}, cerrando servidor...`);
    clearInterval(keepAlive);
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
      setTimeout(() => resolve(), 10_000);
    });
    await prismaRaw.$disconnect().catch(() => undefined);
    console.log('[SHUTDOWN] Servidor cerrado.');
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  process.on('unhandledRejection', (reason) => {
    console.error('[UNHANDLED_REJECTION]', reason);
  });

  process.on('uncaughtException', (error) => {
    console.error('[UNCAUGHT_EXCEPTION]', error);
    process.exit(1);
  });

  process.on('exit', (code) => {
    console.log(`[EXIT] Proceso saliendo con codigo ${code}`);
  });
};

startServer().catch((error) => {
  console.error('[BOOT] No se pudo iniciar el servidor:', error);
  process.exit(1);
});

