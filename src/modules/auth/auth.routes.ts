import { Router } from 'express';
import { Role } from '@prisma/client';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware.js';
import { AuthController } from './auth.controller.js';

const authController = new AuthController();

export const authRouter = Router();

authRouter.post('/login', authController.login);
authRouter.post('/refresh', authController.refresh);
authRouter.post('/logout', authController.logout);
authRouter.get('/me', requireAuth, authController.me);
authRouter.patch('/me', requireAuth, authController.updateProfile);
authRouter.patch('/me/password', requireAuth, authController.changePassword);
authRouter.get('/me/schedule', requireAuth, authController.getMySchedule);
authRouter.put('/me/schedule', requireAuth, requireRole(Role.GLOBAL_ADMIN), authController.setMySchedule);
