import { Router } from 'express';
import { OpportunityController } from '../controllers/opportunity.controller';
import { authenticate } from '../../auth/middlewares/auth.middleware';

const router = Router();
const controller = new OpportunityController();

// All opportunity endpoints require authentication
router.use(authenticate);

// --- 1. Static GET & POST Routes (Must be defined before parameterized routes) ---
router.get('/', controller.searchOpportunities.bind(controller));
router.get('/my-opportunities', controller.getMyOpportunities.bind(controller));
router.get('/recommendations', controller.getRecommendations.bind(controller));
router.post('/', controller.createOpportunity.bind(controller));
router.post('/draft', controller.saveDraft.bind(controller));

// --- 2. Dynamic / Parameterized Routes ---
router.get('/:id', controller.getOpportunity.bind(controller));
router.put('/:id', controller.updateOpportunity.bind(controller));
router.post('/:id/publish', controller.publishOpportunity.bind(controller));
router.put('/:id/archive', controller.archiveOpportunity.bind(controller));
router.post('/:id/bookmark', controller.bookmarkOpportunity.bind(controller));
router.delete('/:id/bookmark', controller.removeBookmark.bind(controller));

export default router;
