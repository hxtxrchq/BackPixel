import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { env } from './config/env.js';
import { router } from './routes/index.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { prisma } from './db/prisma.js';

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (env.FRONTEND_ORIGINS.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin no permitido por CORS'));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'backend',
    uptimeSeconds: Math.round(process.uptime()),
  });
});

app.get('/health/db', async (_req, res) => {
  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.status(200).json({
      status: 'ok',
      db: 'connected',
      latencyMs: Date.now() - startedAt,
    });
  } catch {
    return res.status(503).json({
      status: 'error',
      db: 'unreachable',
      latencyMs: Date.now() - startedAt,
    });
  }
});

app.use(env.API_PREFIX, router);
app.use(errorHandler);
