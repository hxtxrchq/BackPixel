import { prisma } from '../../db/prisma.js';
import type { Prisma, Role } from '@prisma/client';

const userSelect = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  isActive: true,
  dashboardPanels: true,
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

  async findById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: userSelect,
    });
  }

  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: userSelect,
    });
  }

  async createUser(data: {
    fullName: string;
    email: string;
    passwordHash: string;
    role: Role;
    isActive?: boolean;
    dashboardPanels?: Prisma.JsonValue | null;
  }) {
    return prisma.user.create({
      data: {
        fullName: data.fullName,
        email: data.email.toLowerCase(),
        passwordHash: data.passwordHash,
        role: data.role,
        isActive: data.isActive ?? true,
        dashboardPanels: data.dashboardPanels ?? undefined,
      },
      select: userSelect,
    });
  }

  async updateUser(
    userId: string,
    data: {
      fullName?: string;
      firstName?: string | null;
      lastName?: string | null;
      email?: string;
      passwordHash?: string;
      role?: Role;
      isActive?: boolean;
      dashboardPanels?: Prisma.JsonValue | null;
    },
  ) {
    return prisma.user.update({
      where: { id: userId },
      data: data as Prisma.UserUpdateInput,
      select: userSelect,
    });
  }

  async findSchedule(userId: string, month: string) {
    return prisma.userSchedule.findUnique({
      where: { userId_month: { userId, month } },
    });
  }

  async upsertSchedule(userId: string, month: string, text: string) {
    return prisma.userSchedule.upsert({
      where: { userId_month: { userId, month } },
      create: { userId, month, text },
      update: { text },
    });
  }
}
