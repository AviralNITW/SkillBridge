import { z } from 'zod';

export const ApplicationStatusEnum = z.enum([
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'SHORTLISTED',
  'ACCEPTED',
  'REJECTED',
  'WITHDRAWN',
  'IN_PROGRESS',
  'COMPLETED'
]);

export const ApplyOpportunitySchema = z.object({
  opportunityId: z.string().uuid('Invalid opportunity ID'),
  coverLetter: z.string().max(5000, 'Cover letter cannot exceed 5000 characters').optional().nullable(),
  useProfileResume: z.preprocess((val) => {
    if (typeof val === 'string') return val === 'true';
    if (typeof val === 'boolean') return val;
    return undefined;
  }, z.boolean().optional().default(true)),
});

export const UpdateStatusSchema = z.object({
  status: ApplicationStatusEnum,
  remarks: z.string().max(1000, 'Remarks cannot exceed 1000 characters').optional().nullable(),
});

export const AddNoteSchema = z.object({
  note: z.string().min(1, 'Note cannot be empty').max(2000, 'Note cannot exceed 2000 characters'),
});

export const BulkUpdateSchema = z.object({
  applicationIds: z.array(z.string().uuid('Invalid application ID')).min(1, 'At least one application ID is required'),
  status: ApplicationStatusEnum,
  remarks: z.string().max(1000, 'Remarks cannot exceed 1000 characters').optional().nullable(),
});
