import { Router } from 'express';
import { Role } from '@prisma/client';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware.js';
import { RolesController } from './roles.controller.js';

const rolesController = new RolesController();

export const rolesRouter = Router();

// Anyone authenticated can list roles (needed when assigning roles to users)
rolesRouter.get('/', requireAuth, rolesController.list);

// Only GLOBAL_ADMIN can update role labels/descriptions
rolesRouter.patch('/:key', requireAuth, requireRole(Role.GLOBAL_ADMIN), rolesController.update);
