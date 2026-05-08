import { Router } from 'express';
import { Role } from '@prisma/client';
import { contentUpload } from '../../lib/upload.js';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware.js';
import { ContentController } from './content.controller.js';

const contentController = new ContentController();

export const contentRouter = Router();

contentRouter.get('/', requireAuth, requireRole(Role.GLOBAL_ADMIN, Role.TI_ADMIN), contentController.list);
contentRouter.get('/:contentId', requireAuth, requireRole(Role.GLOBAL_ADMIN, Role.TI_ADMIN), contentController.getById);
contentRouter.post(
  '/',
  requireAuth,
  requireRole(Role.GLOBAL_ADMIN, Role.TI_ADMIN),
  contentUpload.fields([
    { name: 'cover', maxCount: 1 },
    { name: 'logo', maxCount: 1 },
    { name: 'gallery', maxCount: 20 },
  ]),
  contentController.create,
);
contentRouter.patch(
  '/:contentId',
  requireAuth,
  requireRole(Role.GLOBAL_ADMIN, Role.TI_ADMIN),
  contentUpload.fields([
    { name: 'cover', maxCount: 1 },
    { name: 'logo', maxCount: 1 },
    { name: 'gallery', maxCount: 20 },
  ]),
  contentController.update,
);
contentRouter.delete('/:contentId', requireAuth, requireRole(Role.GLOBAL_ADMIN), contentController.delete);

export const publicContentRouter = Router();
publicContentRouter.get('/content', contentController.listPublic);
