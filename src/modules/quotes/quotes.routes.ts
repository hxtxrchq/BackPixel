import { Role } from '@prisma/client';
import { Router } from 'express';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware.js';
import { QuotesController } from './quotes.controller.js';

const quotesController = new QuotesController();

export const quotesRouter = Router();

quotesRouter.get('/', requireAuth, requireRole(Role.GLOBAL_ADMIN, Role.TI_ADMIN), quotesController.list);
quotesRouter.get('/:quoteId', requireAuth, requireRole(Role.GLOBAL_ADMIN, Role.TI_ADMIN), quotesController.getById);
quotesRouter.post('/', requireAuth, requireRole(Role.GLOBAL_ADMIN, Role.TI_ADMIN), quotesController.create);
quotesRouter.patch(
  '/:quoteId/status',
  requireAuth,
  requireRole(Role.GLOBAL_ADMIN, Role.TI_ADMIN),
  quotesController.updateStatus,
);
quotesRouter.delete('/:quoteId', requireAuth, requireRole(Role.GLOBAL_ADMIN, Role.TI_ADMIN), quotesController.remove);
