import { Router } from 'express';
import { Role } from '@prisma/client';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware.js';
import { UsersController } from './users.controller.js';

const usersController = new UsersController();

export const usersRouter = Router();

usersRouter.get('/', requireAuth, requireRole(Role.GLOBAL_ADMIN, Role.TI_ADMIN), usersController.list);
usersRouter.post('/', requireAuth, requireRole(Role.GLOBAL_ADMIN), usersController.create);
usersRouter.patch('/:userId', requireAuth, requireRole(Role.GLOBAL_ADMIN), usersController.update);
usersRouter.get('/:userId/schedule', requireAuth, requireRole(Role.GLOBAL_ADMIN), usersController.getSchedule);
usersRouter.put('/:userId/schedule', requireAuth, requireRole(Role.GLOBAL_ADMIN), usersController.setSchedule);
