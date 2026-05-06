import type { Role } from '@prisma/client';

export type SafeUser = {
  id: string;
  fullName: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  role: Role;
  dashboardPanels?: unknown;
};

export type SessionMeta = {
  userAgent?: string;
  ipAddress?: string;
};
