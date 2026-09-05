import { z } from 'zod';

export const TaskPriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

export const TaskStatusEnum = z.enum([
  'DRAFT',
  'ASSIGNED',
  'IN_PROGRESS',
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'COMPLETED',
]);

export const SubmissionTypeEnum = z.enum([
  'FILE',
  'GITHUB_LINK',
  'LIVE_URL',
  'DOCUMENT_URL',
]);

export const CreateTaskSchema = z.object({
  internshipId: z.string().uuid('Invalid internship ID'),
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().min(1, 'Description is required'),
  priority: TaskPriorityEnum.optional().default('MEDIUM'),
  deadline: z.string().datetime().or(z.string().transform((val) => new Date(val).toISOString())),
  maxScore: z.number().int().min(1, 'Max score must be at least 1').optional().default(100),
});

export const AssignTaskSchema = z.object({
  studentIds: z.array(z.string().uuid('Invalid student ID')).min(1, 'At least one student is required'),
});

export const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().min(1).optional(),
  priority: TaskPriorityEnum.optional(),
  deadline: z.string().datetime().or(z.string().transform((val) => new Date(val).toISOString())).optional(),
  maxScore: z.number().int().min(1).optional(),
});

export const SubmitTaskSchema = z.object({
  submissionType: SubmissionTypeEnum,
  submissionUrl: z.string().min(1).optional(), // Can be empty if it's a file upload (multer parses file instead)
  remarks: z.string().max(1000).optional().nullable(),
});

export const ReviewSubmissionSchema = z.object({
  score: z.number().int().min(0, 'Score must be at least 0'),
  feedback: z.string().max(2000).optional().nullable(),
});
