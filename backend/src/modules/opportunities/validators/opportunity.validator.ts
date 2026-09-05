import { z } from 'zod';

export const CreateOpportunitySchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().min(1, 'Description is required'),
  category: z.enum([
    'INTERNSHIP',
    'APPRENTICESHIP',
    'RESEARCH_PROJECT',
    'FREELANCE_PROJECT',
    'COMMUNITY_PROJECT',
    'VOLUNTEER_PROGRAM',
    'SKILL_PROGRAM',
  ], {
    errorMap: () => ({ message: 'Invalid opportunity category' }),
  }),
  mode: z.enum(['remote', 'hybrid', 'onsite'], {
    errorMap: () => ({ message: 'Mode must be remote, hybrid, or onsite' }),
  }),
  skillsRequired: z.array(z.string().min(1)).min(1, 'At least one skill is required'),
  tags: z.array(z.string().min(1)).optional(),
  location: z.string().optional().nullable(),
  durationWeeks: z.number().int().min(1, 'Duration must be at least 1 week').optional().nullable(),
  stipend: z.number().min(0, 'Stipend must be 0 or positive').optional().nullable(),
  currency: z.string().max(10).optional().nullable(),
  openings: z.number().int().min(1, 'Openings must be at least 1').optional().nullable(),
  deadline: z.string().datetime().or(z.string().transform(val => new Date(val).toISOString())),
});

export const UpdateOpportunitySchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().min(1).optional(),
  category: z.enum([
    'INTERNSHIP',
    'APPRENTICESHIP',
    'RESEARCH_PROJECT',
    'FREELANCE_PROJECT',
    'COMMUNITY_PROJECT',
    'VOLUNTEER_PROGRAM',
    'SKILL_PROGRAM',
  ]).optional(),
  mode: z.enum(['remote', 'hybrid', 'onsite']).optional(),
  skillsRequired: z.array(z.string().min(1)).optional(),
  tags: z.array(z.string().min(1)).optional(),
  location: z.string().optional().nullable(),
  durationWeeks: z.number().int().min(1).optional().nullable(),
  stipend: z.number().min(0).optional().nullable(),
  currency: z.string().max(10).optional().nullable(),
  openings: z.number().int().min(1).optional().nullable(),
  deadline: z.string().datetime().or(z.string().transform(val => new Date(val).toISOString())).optional(),
});
