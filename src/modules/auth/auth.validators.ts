import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const updateProfileSchema = z
  .object({
    fullName: z.string().min(2).max(120).optional(),
    email: z.string().email().max(160).optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, 'Debes enviar al menos un campo para actualizar');

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8).max(128),
  newPassword: z.string().min(8).max(128),
});

export const monthSchema = z
  .preprocess((value) => {
    if (Array.isArray(value)) return value[0];
    return value;
  }, z.string())
  .refine((value) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value), 'Mes invalido. Usa formato YYYY-MM');
