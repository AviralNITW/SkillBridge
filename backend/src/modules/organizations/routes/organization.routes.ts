import { Router } from 'express';
import { OrganizationController } from '../controllers/organization.controller';
import { authenticate, requireRoles } from '../../auth/middlewares/auth.middleware';
import { upload } from '../../../utils/storage';

const router = Router();
const controller = new OrganizationController();

// All organization endpoints require authentication
router.use(authenticate);

// --- 1. Static Routes (Must be defined before dynamic parameter routes) ---
router.post('/create', controller.createOrganization.bind(controller));
router.get('/members', controller.getMembers.bind(controller));
router.post('/members', controller.addTeamMember.bind(controller));
router.get('/dashboard', controller.getDashboardMetrics.bind(controller));
router.post('/subscription/payment/order', controller.createPaymentOrder.bind(controller));
router.post('/subscription/payment/verify', controller.verifyPayment.bind(controller));
router.post('/branches', controller.addBranch.bind(controller));
router.post('/sso', controller.configureSSO.bind(controller));

// --- 2. Dynamic / Parameterized Routes ---
router.get('/:id', controller.getOrganization.bind(controller));
router.put('/:id', controller.updateOrganization.bind(controller));
router.get('/:id/branches', controller.getBranches.bind(controller));
router.post('/:id/verification-documents', upload.single('document'), controller.uploadVerificationDocument.bind(controller));
router.post('/:id/submit-verification', controller.submitVerification.bind(controller));
router.post('/:id/verify', requireRoles(['ADMIN']), controller.verifyOrganization.bind(controller));

export default router;
