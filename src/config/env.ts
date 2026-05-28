import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  API_PREFIX: z.string().default('/api/v1'),
  FRONTEND_ORIGINS: z
    .string()
    .default('http://localhost:5173,https://pixelbros.pe,https://www.pixelbros.pe')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  FRONTEND_ORIGIN_SUFFIXES: z
    .string()
    .default('.pixelbros.pe')
    .transform((value) =>
      value
        .split(',')
        .map((suffix) => suffix.trim().toLowerCase())
        .filter(Boolean),
    ),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatorio'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET debe tener minimo 32 caracteres'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET debe tener minimo 32 caracteres'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),
  REFRESH_COOKIE_NAME: z.string().default('pixelbros_refresh_token'),
  REFRESH_COOKIE_SECURE: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
  REFRESH_COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),

  // Optional: enable persistent media uploads via Cloudinary (recommended for serverless hosts like Vercel)
  CLOUDINARY_URL: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_FOLDER: z.string().default('pixelbros'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Error de variables de entorno: ${parsed.error.message}`);
}

export const env = parsed.data;
