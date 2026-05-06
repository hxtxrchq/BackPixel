import { Router } from 'express';
import { authRouter } from '../modules/auth/auth.routes.js';
import { contentRouter, publicContentRouter } from '../modules/content/content.routes.js';
import { quotesRouter } from '../modules/quotes/quotes.routes.js';
import { usersRouter } from '../modules/users/users.routes.js';
import { rolesRouter } from '../modules/roles/roles.routes.js';
import { monthlyReportsRouter } from '../modules/monthly-reports/monthly-reports.routes.js';

export const router = Router();

router.get('/health', (_req, res) => {
  res.status(200).json({ ok: true, service: 'pixelbros-backend' });
});

router.use('/auth', authRouter);
router.use('/users', usersRouter);
router.use('/roles', rolesRouter);
router.use('/content', contentRouter);
router.use('/quotes', quotesRouter);
router.use('/monthly-reports', monthlyReportsRouter);
router.use('/public', publicContentRouter);
