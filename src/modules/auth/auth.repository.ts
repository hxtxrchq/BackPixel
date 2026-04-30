import type { Prisma, User } from '@prisma/client';
import { prisma } from '../../db/prisma.js';
import type { SessionMeta } from './auth.types.js';

const userSelect = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  isActive: true,
  passwordHash: true,
} satisfies Prisma.UserSelect;

export class AuthRepository {
  async findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: userSelect,
    });
  }

  async findUserById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: userSelect,
    });
  }

  async createSession(params: {
    userId: string;
    refreshTokenHash: string;
    expiresAt: Date;
    meta: SessionMeta;
  }) {
    return prisma.session.create({
      data: {
        userId: params.userId,
        refreshTokenHash: params.refreshTokenHash,
        expiresAt: params.expiresAt,
        userAgent: params.meta.userAgent,
        ipAddress: params.meta.ipAddress,
      },
    });
  }

  async findSessionByRefreshHash(refreshTokenHash: string) {
    return prisma.session.findUnique({
      where: { refreshTokenHash },
    });
  }

  async revokeSessionByRefreshHash(refreshTokenHash: string) {
    return prisma.session.updateMany({
      where: {
        refreshTokenHash,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  async revokeAllSessionsForUser(userId: string) {
    return prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  async createUser(userData: Pick<User, 'fullName' | 'email' | 'passwordHash' | 'role'>) {
    return prisma.user.create({
      data: {
        ...userData,
        email: userData.email.toLowerCase(),
      },
    });
  }
}
