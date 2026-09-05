import { z } from 'zod';

export const CreatePortfolioSchema = z.object({
  slug: z.string().min(3).max(50),
  title: z.string().optional(),
  bio: z.string().optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
});

export const UpdatePortfolioSchema = z.object({
  title: z.string().optional(),
  bio: z.string().optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
});

export const AddProjectSchema = z.object({
  projectId: z.string().uuid(),
  role: z.string().optional(),
  description: z.string().optional(),
});

export const AddCertificateSchema = z.object({
  certificateId: z.string().uuid(),
  displayOrder: z.number().int().min(0).optional(),
});
