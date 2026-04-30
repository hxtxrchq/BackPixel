import { z } from 'zod';

export const quoteStatuses = ['Enviada', 'Aprobada', 'Rechazada', 'En negociación'] as const;

export const createQuoteSchema = z.object({
  client: z.string().trim().min(2).max(140),
  company: z.string().trim().min(2).max(140),
  serviceType: z.string().trim().min(2).max(120),
  detail: z.string().trim().min(4).max(800),
  durationMonths: z.coerce.number().int().min(1).max(60),
  basePrice: z.coerce.number().min(0),
  discount: z.coerce.number().min(0).default(0),
  observations: z.string().trim().max(1200).optional().nullable(),
});

export const updateQuoteStatusSchema = z.object({
  status: z.enum(quoteStatuses),
});
