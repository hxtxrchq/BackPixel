import { Role } from '@prisma/client';
import { z } from 'zod';

export const monthSchema = z
  .preprocess((value) => {
    if (Array.isArray(value)) return value[0];
    return value;
  }, z.string())
  .refine((value) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value), 'Mes invalido. Usa formato YYYY-MM');

const dashboardPanelsSchema = z.array(z.string().min(1).max(40)).max(50);

export const createUserSchema = z.object({
  fullName: z.string().min(2).max(120).optional(),
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().min(1).max(80).optional(),
  email: z.string().email(),
  password: z.string().min(8).max(128).optional(),
  role: z.nativeEnum(Role),
  isActive: z.boolean().optional(),
  dashboardPanels: dashboardPanelsSchema.optional(),
});

export const updateUserSchema = z
  .object({
    fullName: z.string().min(2).max(120).optional(),
    firstName: z.string().min(1).max(80).optional(),
    lastName: z.string().min(1).max(80).optional(),
    email: z.string().email().max(160).optional(),
    password: z.string().min(8).max(128).optional(),
    role: z.nativeEnum(Role).optional(),
    isActive: z.boolean().optional(),
    dashboardPanels: dashboardPanelsSchema.nullable().optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, 'Debes enviar al menos un campo para actualizar');
