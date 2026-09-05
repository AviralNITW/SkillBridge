import { portfolioRepository } from '../repository/portfolio.repository';
import { CreatePortfolioInput, UpdatePortfolioInput } from '../validators/portfolio.validator';
import { Portfolio } from '@prisma/client';

export const portfolioService = {
  async createPortfolio(data: CreatePortfolioInput, studentId: string) {
    // Business logic could include slug uniqueness check, etc.
    return portfolioRepository.create(data, studentId);
  },

  async getPortfolioById(id: string) {
    return portfolioRepository.getById(id);
  },

  async getPortfolioBySlug(slug: string) {
    return portfolioRepository.getBySlug(slug);
  },

  async updatePortfolio(id: string, data: UpdatePortfolioInput) {
    return portfolioRepository.update(id, data);
  },

  async deletePortfolio(id: string) {
    return portfolioRepository.delete(id);
  },

  async addProject(portfolioId: string, projectId: string, role?: string, description?: string) {
    return portfolioRepository.addProject(portfolioId, projectId, role, description);
  },

  async addCertificate(portfolioId: string, certificateId: string, displayOrder?: number) {
    return portfolioRepository.addCertificate(portfolioId, certificateId, displayOrder);
  },

  async getAnalytics(portfolioId: string) {
    return portfolioRepository.getAnalytics(portfolioId);
  },
};
