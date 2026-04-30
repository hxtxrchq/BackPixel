import type { Role } from '@prisma/client';

export type SafeUser = {
  id: string;
  fullName: string;
  email: string;
  role: Role;
};

export type SessionMeta = {
  userAgent?: string;
  ipAddress?: string;
};
