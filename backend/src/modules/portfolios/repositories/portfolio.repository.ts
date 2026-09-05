import prisma from '../../../config/db';
import { Portfolio, PortfolioProject, PortfolioCertificate, PortfolioAnalytics } from '@prisma/client';

export const portfolioRepository = {
  async createPortfolio(data: {
    studentId: string;
    slug: string;
    title?: string;
    bio?: string;
    visibility?: 'PUBLIC' | 'PRIVATE';
  }): Promise<Portfolio> {
    return prisma.portfolio.create({ data });
  },

  async getPortfolioById(id: string) {
    return prisma.portfolio.findUnique({
      where: { id },
      include: { projects: true, certificates: true, analytics: true },
    });
  },

  async getPortfolioBySlug(slug: string) {
    return prisma.portfolio.findUnique({
      where: { slug },
      include: { projects: true, certificates: true, analytics: true },
    });
  },

  async updatePortfolio(id: string, data: Partial<Portfolio>) {
    return prisma.portfolio.update({ where: { id }, data });
  },

  async deletePortfolio(id: string) {
    return prisma.portfolio.delete({ where: { id } });
  },

  async addProject(portfolioId: string, data: {
    projectId: string;
    role?: string;
    description?: string;
  }) {
    return prisma.portfolioProject.create({
      data: { ...data, portfolioId },
    });
  },

  async removeProject(projectId: string) {
    return prisma.portfolioProject.delete({ where: { id: projectId } });
  },

  async addCertificate(portfolioId: string, data: {
    certificateId: string;
    displayOrder?: number;
  }) {
    return prisma.portfolioCertificate.create({
      data: { ...data, portfolioId },
    });
  },

  async removeCertificate(certificateId: string) {
    return prisma.portfolioCertificate.delete({ where: { id: certificateId } });
  },

  async getAnalytics(portfolioId: string) {
    return prisma.portfolioAnalytics.findUnique({ where: { portfolioId } });
  },

  async incrementViewCount(portfolioId: string) {
    return prisma.portfolioAnalytics.upsert({
      where: { portfolioId },
      update: { viewCount: { increment: 1 }, lastViewedAt: new Date() },
      create: { portfolioId, viewCount: 1, downloadCount: 0 },
    });
  },

  async recordDownload(portfolioId: string) {
    return prisma.portfolioAnalytics.upsert({
      where: { portfolioId },
      update: { downloadCount: { increment: 1 } },
      create: { portfolioId, viewCount: 0, downloadCount: 1 },
    });
  },
};
