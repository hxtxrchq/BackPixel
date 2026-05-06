import { Role } from '@prisma/client';
import { HttpError } from '../../lib/http-error.js';
import { hashPassword } from '../../lib/password.js';
import { UsersRepository } from './users.repository.js';

export class UsersService {
  constructor(private readonly usersRepository = new UsersRepository()) {}

  listUsers() {
    return this.usersRepository.listUsers();
  }

  private buildTempPassword(baseValue?: string) {
    const cleaned = (baseValue ?? '').replace(/[^a-z0-9]/gi, '');
    const base = cleaned.length > 0 ? cleaned : 'Usuario';
    const padded = base.length >= 6 ? base : base.padEnd(6, '0');
    return `${padded}01`;
  }

  async createUser(payload: {
    fullName?: string;
    firstName?: string;
    lastName?: string;
    email: string;
    password?: string;
    role: Role;
    isActive?: boolean;
    dashboardPanels?: unknown;
  }) {
    const existing = await this.usersRepository.findByEmail(payload.email);
    if (existing) {
      throw new HttpError(409, 'El correo ya esta registrado');
    }

    const firstName = payload.firstName?.trim();
    const lastName = payload.lastName?.trim();
    const fullName = (`${firstName ?? ''} ${lastName ?? ''}`).trim() || payload.fullName?.trim();
    if (!fullName) {
      throw new HttpError(400, 'Nombre invalido');
    }

    const basePassword = payload.password?.trim();
    const generatedPassword = basePassword ?? this.buildTempPassword(firstName ?? fullName ?? payload.email);
    const passwordHash = await hashPassword(generatedPassword);
    const user = await this.usersRepository.createUser({
      fullName,
      email: payload.email,
      passwordHash,
      role: payload.role,
      isActive: payload.isActive,
      dashboardPanels: payload.dashboardPanels,
    });

    return {
      user,
      tempPassword: basePassword ? null : generatedPassword,
    };
  }

  async updateUser(
    userId: string,
    payload: {
      fullName?: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      password?: string;
      role?: Role;
      isActive?: boolean;
      dashboardPanels?: unknown;
    },
  ) {
    try {
      const patch: {
        fullName?: string;
        firstName?: string | null;
        lastName?: string | null;
        email?: string;
        passwordHash?: string;
        role?: Role;
        isActive?: boolean;
        dashboardPanels?: any;
      } = {
        role: payload.role,
        isActive: payload.isActive,
      };

      if (payload.email) {
        const existing = await this.usersRepository.findByEmail(payload.email);
        if (existing && existing.id !== userId) {
          throw new HttpError(409, 'El correo ya esta registrado');
        }
        patch.email = payload.email.toLowerCase();
      }

      if (payload.password) {
        patch.passwordHash = await hashPassword(payload.password);
      }

      const nextFirstName = payload.firstName?.trim();
      const nextLastName = payload.lastName?.trim();
      const nextFullName = payload.fullName?.trim();

      if (nextFirstName !== undefined) patch.firstName = nextFirstName;
      if (nextLastName !== undefined) patch.lastName = nextLastName;

      if (nextFullName) {
        patch.fullName = nextFullName;
      } else if (nextFirstName !== undefined || nextLastName !== undefined) {
        const fullName = `${nextFirstName ?? ''} ${nextLastName ?? ''}`.trim();
        if (fullName) {
          patch.fullName = fullName;
        }
      }

      if (payload.dashboardPanels !== undefined) {
        patch.dashboardPanels = payload.dashboardPanels as any;
      }

      return await this.usersRepository.updateUser(userId, patch);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      throw new HttpError(404, 'Usuario no encontrado');
    }
  }

  async getUserSchedule(userId: string, month: string) {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new HttpError(404, 'Usuario no encontrado');
    }
    const schedule = await this.usersRepository.findSchedule(userId, month);
    return { month, text: schedule?.text ?? '' };
  }

  async setUserSchedule(userId: string, month: string, text: string) {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new HttpError(404, 'Usuario no encontrado');
    }

    const schedule = await this.usersRepository.upsertSchedule(userId, month, text);
    return { month: schedule.month, text: schedule.text };
  }
}
