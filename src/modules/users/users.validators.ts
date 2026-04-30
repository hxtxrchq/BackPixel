import { Role } from '@prisma/client';
import { z } from 'zod';

export const createUserSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  role: z.nativeEnum(Role),
});

export const updateUserSchema = z
  .object({
    fullName: z.string().min(2).max(120).optional(),
    role: z.nativeEnum(Role).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, 'Debes enviar al menos un campo para actualizar');
