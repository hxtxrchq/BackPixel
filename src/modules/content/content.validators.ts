import { z } from 'zod';

const removeMediaIdsSchema = z.preprocess((value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return [trimmed];
    }

    return [trimmed];
  }

  return [];
}, z.array(z.string().min(1)).default([]));

export const createContentSchema = z.object({
  companyName: z.string().min(2).max(120),
  title: z.string().min(2).max(140).optional(),
  category: z.string().min(2).max(80),
  showOnHome: z.coerce.boolean().default(false),
  showOnPortfolio: z.coerce.boolean().default(true),
  logoLabel: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().min(1).max(120).optional(),
  ),
});

export const updateContentSchema = z
  .object({
    companyName: z.string().min(2).max(120).optional(),
    title: z.string().min(2).max(140).optional(),
    category: z.string().min(2).max(80).optional(),
    showOnHome: z.coerce.boolean().optional(),
    showOnPortfolio: z.coerce.boolean().optional(),
    logoLabel: z.preprocess(
      (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
      z.string().trim().min(1).max(120).nullable().optional(),
    ),
    removeCover: z.coerce.boolean().optional(),
    removeLogo: z.coerce.boolean().optional(),
    removeMediaIds: removeMediaIdsSchema.optional(),
  });
