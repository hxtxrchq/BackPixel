import { Router } from 'express';
import { Role } from '@prisma/client';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware.js';
import { AuthController } from './auth.controller.js';

const authController = new AuthController();

export const authRouter = Router();

authRouter.post('/login', authController.login);
authRouter.post('/refresh', authController.refresh);
authRouter.post('/logout', authController.logout);
authRouter.get('/me', requireAuth, requireRole(Role.GLOBAL_ADMIN, Role.TI_ADMIN), authController.me);
