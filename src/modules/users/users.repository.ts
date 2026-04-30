import { prisma } from '../../db/prisma.js';
import type { Prisma, Role } from '@prisma/client';

const userSelect = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export class UsersRepository {
  async listUsers() {
    return prisma.user.findMany({
      select: userSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: userSelect,
    });
  }

  async createUser(data: { fullName: string; email: string; passwordHash: string; role: Role; isActive?: boolean }) {
    return prisma.user.create({
      data: {
        fullName: data.fullName,
        email: data.email.toLowerCase(),
        passwordHash: data.passwordHash,
        role: data.role,
        isActive: data.isActive ?? true,
      },
      select: userSelect,
    });
  }

  async updateUser(userId: string, data: { fullName?: string; role?: Role; isActive?: boolean }) {
    return prisma.user.update({
      where: { id: userId },
      data,
      select: userSelect,
    });
  }
}
