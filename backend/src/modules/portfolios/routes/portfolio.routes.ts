import { Router } from 'express';
import { portfolioController } from '../controllers/portfolio.controller';

const router = Router();

// Create portfolio (authenticated student)
router.post('/', portfolioController.create);

// Get portfolio by slug (public)
router.get('/:slug', portfolioController.getBySlug);

// Update portfolio (owner only)
router.patch('/:id', portfolioController.update);

// Delete portfolio
router.delete('/:id', portfolioController.delete);

// Add project to portfolio
router.post('/:portfolioId/projects/:projectId', portfolioController.addProject);

// Add certificate to portfolio
router.post('/:portfolioId/certificates/:certificateId', portfolioController.addCertificate);

export default router;
