import { Router } from 'express';
import { ApplicationController } from '../controllers/application.controller';
import { authenticate } from '../../auth/middlewares/auth.middleware';
import { upload } from '../../../utils/storage';

const router = Router();
const controller = new ApplicationController();

// All applications endpoints require authentication
router.use(authenticate);

// --- 1. Static & Specific Namespace Routes (Before general dynamic routes) ---
router.get('/my-applications', controller.getMyApplications.bind(controller));
router.get('/dashboard-metrics', controller.getDashboardMetrics.bind(controller));
router.get('/opportunity/:opportunityId', controller.getApplicants.bind(controller));
router.post('/bulk-status', controller.bulkUpdate.bind(controller));
router.post('/', upload.single('resume'), controller.apply.bind(controller));

// --- 2. Dynamic Routes ---
router.get('/:id', controller.getApplication.bind(controller));
router.put('/:id/withdraw', controller.withdraw.bind(controller));
router.put('/:id/status', controller.updateStatus.bind(controller));
router.post('/:id/notes', controller.addNote.bind(controller));

export default router;
