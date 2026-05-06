import { Router } from 'express';
import { MonthlyReportsController } from './monthly-reports.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';

const router = Router();
const ctrl = new MonthlyReportsController();

router.use(requireAuth);

router.get('/', (req, res) => ctrl.list(req, res));
router.get('/:id', (req, res) => ctrl.getById(req, res));
router.post('/', (req, res) => ctrl.save(req, res));
router.delete('/:id', (req, res) => ctrl.delete(req, res));

export { router as monthlyReportsRouter };
