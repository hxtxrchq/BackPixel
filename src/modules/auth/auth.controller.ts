import type { Request, Response, NextFunction } from 'express';
import { env } from '../../config/env.js';
import { AuthService } from './auth.service.js';
import { changePasswordSchema, loginSchema, monthSchema, updateProfileSchema } from './auth.validators.js';

const buildMeta = (req: Request) => ({
  userAgent: req.get('user-agent') ?? undefined,
  ipAddress: req.ip ?? undefined,
});

const setRefreshCookie = (res: Response, refreshToken: string) => {
  res.cookie(env.REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: env.REFRESH_COOKIE_SECURE,
    sameSite: env.REFRESH_COOKIE_SAMESITE,
    maxAge: env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
    path: `${env.API_PREFIX}/auth`,
  });
};

const clearRefreshCookie = (res: Response) => {
  res.clearCookie(env.REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.REFRESH_COOKIE_SECURE,
    sameSite: env.REFRESH_COOKIE_SAMESITE,
    path: `${env.API_PREFIX}/auth`,
  });
};

export class AuthController {
  constructor(private readonly authService = new AuthService()) {}

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payload = loginSchema.parse(req.body);
      const result = await this.authService.login(payload.email, payload.password, buildMeta(req));
      setRefreshCookie(res, result.refreshToken);

      return res.status(200).json({
        user: result.user,
        accessToken: result.accessToken,
      });
    } catch (error) {
      return next(error);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken = req.cookies[env.REFRESH_COOKIE_NAME] as string | undefined;
      if (!refreshToken) {
        clearRefreshCookie(res);
        return res.status(401).json({ message: 'No hay refresh token' });
      }

      const result = await this.authService.refresh(refreshToken, buildMeta(req));
      setRefreshCookie(res, result.refreshToken);

      return res.status(200).json({
        user: result.user,
        accessToken: result.accessToken,
      });
    } catch (error) {
      clearRefreshCookie(res);
      return next(error);
    }
  };

  me = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.auth?.userId;
      if (!userId) {
        return res.status(401).json({ message: 'No autenticado' });
      }

      const user = await this.authService.getProfile(userId);
      return res.status(200).json({ user });
    } catch (error) {
      return next(error);
    }
  };

  updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.auth?.userId;
      if (!userId) {
        return res.status(401).json({ message: 'No autenticado' });
      }

      const payload = updateProfileSchema.parse(req.body);
      const user = await this.authService.updateProfile(userId, payload);
      return res.status(200).json({ user });
    } catch (error) {
      return next(error);
    }
  };

  changePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.auth?.userId;
      if (!userId) {
        return res.status(401).json({ message: 'No autenticado' });
      }

      const payload = changePasswordSchema.parse(req.body);
      await this.authService.changePassword(userId, payload.currentPassword, payload.newPassword);
      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  };

  getMySchedule = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.auth?.userId;
      if (!userId) {
        return res.status(401).json({ message: 'No autenticado' });
      }

      const month = monthSchema.parse(req.query.month);
      const schedule = await this.authService.getUserSchedule(userId, month);
      return res.status(200).json({ schedule });
    } catch (error) {
      return next(error);
    }
  };

  setMySchedule = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.auth?.userId;
      if (!userId) {
        return res.status(401).json({ message: 'No autenticado' });
      }

      const month = monthSchema.parse(req.query.month);
      const text = typeof req.body?.text === 'string' ? req.body.text : '';
      const schedule = await this.authService.setUserSchedule(userId, month, text);
      return res.status(200).json({ schedule });
    } catch (error) {
      return next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken = req.cookies[env.REFRESH_COOKIE_NAME] as string | undefined;
      await this.authService.logout(refreshToken);
      clearRefreshCookie(res);
      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  };
}
