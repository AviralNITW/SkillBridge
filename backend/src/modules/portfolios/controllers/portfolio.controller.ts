import { Request, Response, NextFunction } from 'express';
import { portfolioService } from '../services/portfolio.service';
import { CreatePortfolioSchema, UpdatePortfolioSchema } from '../validators/portfolio.validator';
import { z } from 'zod';

export const portfolioController = {
  // Create portfolio
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = CreatePortfolioSchema.parse(req.body);
      const studentId = (req as any).user.id; // assuming auth middleware sets user
      const portfolio = await portfolioService.createPortfolio(parsed, studentId);
      res.status(201).json({ success: true, data: portfolio });
    } catch (err) {
      next(err);
    }
  },

  // Get by slug
  async getBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const { slug } = req.params;
      const portfolio = await portfolioService.getPortfolioBySlug(slug);
      if (!portfolio) return res.status(404).json({ success: false, message: 'Portfolio not found' });
      res.json({ success: true, data: portfolio });
    } catch (err) {
      next(err);
    }
  },

  // Update portfolio
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const parsed = UpdatePortfolioSchema.parse(req.body);
      const updated = await portfolioService.updatePortfolio(id, parsed);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  },

  // Delete portfolio
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await portfolioService.deletePortfolio(id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  // Add project
  async addProject(req: Request, res: Response, next: NextFunction) {
    try {
      const { portfolioId, projectId } = req.params;
      const { role, description } = req.body;
      const added = await portfolioService.addProject(portfolioId, projectId, role, description);
      res.status(201).json({ success: true, data: added });
    } catch (err) {
      next(err);
    }
  },

  // Add certificate
  async addCertificate(req: Request, res: Response, next: NextFunction) {
    try {
      const { portfolioId, certificateId } = req.params;
      const { displayOrder } = req.body;
      const added = await portfolioService.addCertificate(portfolioId, certificateId, displayOrder);
      res.status(201).json({ success: true, data: added });
    } catch (err) {
      next(err);
    }
  },
};
