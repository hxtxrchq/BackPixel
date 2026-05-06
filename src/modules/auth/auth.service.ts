import { addDays, isAfter } from 'date-fns';
import { env } from '../../config/env.js';
import { HttpError } from '../../lib/http-error.js';
import { comparePassword, hashPassword } from '../../lib/password.js';
import { sha256 } from '../../lib/hash.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../lib/jwt.js';
import type { SessionMeta, SafeUser } from './auth.types.js';
import { AuthRepository } from './auth.repository.js';

const toSafeUser = (user: {
  id: string;
  fullName: string;
  email: string;
  role: SafeUser['role'];
  dashboardPanels?: unknown | null;
}): SafeUser => ({
  id: user.id,
  fullName: user.fullName,
  firstName: null,
  lastName: null,
  email: user.email,
  role: user.role,
  dashboardPanels: user.dashboardPanels ?? null,
});

export class AuthService {
  constructor(private readonly authRepository = new AuthRepository()) {}

  async login(email: string, password: string, meta: SessionMeta) {
    const user = await this.authRepository.findUserByEmail(email);
    if (!user || !user.isActive) {
      throw new HttpError(401, 'Credenciales invalidas');
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      throw new HttpError(401, 'Credenciales invalidas');
    }

    const accessToken = signAccessToken({
      sub: user.id,
      role: user.role,
      email: user.email,
      name: user.fullName,
    });

    const refreshToken = signRefreshToken(user.id);

    await this.authRepository.createSession({
      userId: user.id,
      refreshTokenHash: sha256(refreshToken),
      expiresAt: addDays(new Date(), env.JWT_REFRESH_TTL_DAYS),
      meta,
    });

    return {
      user: toSafeUser(user),
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshToken: string, meta: SessionMeta) {
    try {
      verifyRefreshToken(refreshToken);
    } catch {
      throw new HttpError(401, 'Refresh token invalido');
    }

    const refreshHash = sha256(refreshToken);
    const session = await this.authRepository.findSessionByRefreshHash(refreshHash);

    if (!session || session.revokedAt || isAfter(new Date(), session.expiresAt)) {
      throw new HttpError(401, 'Sesion expirada');
    }

    const user = await this.authRepository.findUserById(session.userId);
    if (!user || !user.isActive) {
      throw new HttpError(401, 'Usuario no autorizado');
    }

    await this.authRepository.revokeSessionByRefreshHash(refreshHash);

    const newAccessToken = signAccessToken({
      sub: user.id,
      role: user.role,
      email: user.email,
      name: user.fullName,
    });
    const newRefreshToken = signRefreshToken(user.id);

    await this.authRepository.createSession({
      userId: user.id,
      refreshTokenHash: sha256(newRefreshToken),
      expiresAt: addDays(new Date(), env.JWT_REFRESH_TTL_DAYS),
      meta,
    });

    return {
      user: toSafeUser(user),
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(refreshToken?: string) {
    if (!refreshToken) return;

    await this.authRepository.revokeSessionByRefreshHash(sha256(refreshToken));
  }

  async getProfile(userId: string) {
    const user = await this.authRepository.findUserById(userId);
    if (!user || !user.isActive) {
      throw new HttpError(404, 'Usuario no encontrado');
    }

    return toSafeUser(user);
  }

  async updateProfile(userId: string, payload: { fullName?: string; email?: string }) {
    const current = await this.authRepository.findUserById(userId);
    if (!current || !current.isActive) {
      throw new HttpError(404, 'Usuario no encontrado');
    }

    const normalizedEmail = payload.email?.toLowerCase();
    if (normalizedEmail && normalizedEmail !== current.email) {
      const existing = await this.authRepository.findUserByEmail(normalizedEmail);
      if (existing && existing.id !== userId) {
        throw new HttpError(409, 'El correo ya esta registrado');
      }
    }

    const fullName = payload.fullName?.trim() ?? current.fullName;
    const updated = await this.authRepository.updateUserProfile(userId, {
      fullName,
      email: normalizedEmail ?? current.email,
    });

    return toSafeUser(updated);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.authRepository.findUserById(userId);
    if (!user || !user.isActive) {
      throw new HttpError(404, 'Usuario no encontrado');
    }

    const isMatch = await comparePassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new HttpError(401, 'Password actual incorrecto');
    }

    const passwordHash = await hashPassword(newPassword);
    await this.authRepository.updatePasswordHash(userId, passwordHash);
  }

  async getUserSchedule(userId: string, month: string) {
    const user = await this.authRepository.findUserById(userId);
    if (!user || !user.isActive) {
      throw new HttpError(404, 'Usuario no encontrado');
    }

    const schedule = await this.authRepository.findUserSchedule(userId, month);
    if (!schedule) {
      return { month, text: '' };
    }

    return { month: schedule.month, text: schedule.text };
  }

  async setUserSchedule(userId: string, month: string, text: string) {
    const user = await this.authRepository.findUserById(userId);
    if (!user || !user.isActive) {
      throw new HttpError(404, 'Usuario no encontrado');
    }

    const schedule = await this.authRepository.upsertUserSchedule(userId, month, text);
    return { month: schedule.month, text: schedule.text };
  }
}
