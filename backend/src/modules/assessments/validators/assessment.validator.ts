import { z } from 'zod';

// ─── Assessment Type Enum ─────────────────────────────────────────────────────
export const AssessmentTypeEnum = z.enum([
  'TASK_ASSESSMENT',
  'PROJECT_ASSESSMENT',
  'INTERNSHIP_ASSESSMENT',
  'FINAL_EVALUATION',
]);

// ─── Create Assessment ────────────────────────────────────────────────────────
export const CreateAssessmentSchema = z.object({
  internshipId   : z.string().uuid('Invalid internship ID'),
  submissionId   : z.string().uuid('Invalid submission ID').optional(),
  assessmentType : AssessmentTypeEnum,
  score          : z.number().min(0).max(100),
  rating         : z.number().int().min(1).max(5),
  feedback       : z.string().max(5000).optional(),
  rubricId       : z.string().uuid().optional(),
  // Optional component scores
  taskCompletionScore  : z.number().min(0).max(100).optional(),
  technicalSkillsScore : z.number().min(0).max(100).optional(),
  communicationScore   : z.number().min(0).max(100).optional(),
  problemSolvingScore  : z.number().min(0).max(100).optional(),
  professionalismScore : z.number().min(0).max(100).optional(),
});

// ─── Final Evaluation (Internship-level, not tied to a submission) ────────────
export const CreateFinalEvaluationSchema = z.object({
  score    : z.number().min(0).max(100),
  rating   : z.number().int().min(1).max(5),
  feedback : z.string().max(5000).optional(),
  // Component scores
  taskCompletionScore  : z.number().min(0).max(100).optional(),
  technicalSkillsScore : z.number().min(0).max(100).optional(),
  communicationScore   : z.number().min(0).max(100).optional(),
  problemSolvingScore  : z.number().min(0).max(100).optional(),
  professionalismScore : z.number().min(0).max(100).optional(),
});

// ─── Update Assessment ────────────────────────────────────────────────────────
export const UpdateAssessmentSchema = z.object({
  score          : z.number().min(0).max(100).optional(),
  rating         : z.number().int().min(1).max(5).optional(),
  feedback       : z.string().max(5000).optional(),
  taskCompletionScore  : z.number().min(0).max(100).optional(),
  technicalSkillsScore : z.number().min(0).max(100).optional(),
  communicationScore   : z.number().min(0).max(100).optional(),
  problemSolvingScore  : z.number().min(0).max(100).optional(),
  professionalismScore : z.number().min(0).max(100).optional(),
});

// ─── Rubric Criteria ──────────────────────────────────────────────────────────
const RubricCriteriaSchema = z.object({
  criteriaName     : z.string().min(1).max(255),
  description      : z.string().max(1000).optional(),
  weightPercentage : z.number().int().min(1).max(100),
  maxScore         : z.number().int().min(1).max(100).default(100),
});

// ─── Create Rubric ────────────────────────────────────────────────────────────
export const CreateRubricSchema = z.object({
  organizationId : z.string().uuid('Invalid organization ID'),
  name           : z.string().min(1).max(255),
  description    : z.string().max(1000).optional(),
  maxScore       : z.number().int().min(1).max(100).default(100),
  criteria       : z.array(RubricCriteriaSchema).min(1).max(20),
}).refine(
  (data) => {
    const total = data.criteria.reduce((sum, c) => sum + c.weightPercentage, 0);
    return total === 100;
  },
  { message: 'Rubric criteria weight percentages must sum to 100.' }
);

// ─── Generate Report ──────────────────────────────────────────────────────────
export const GenerateReportSchema = z.object({
  internshipId : z.string().uuid('Invalid internship ID'),
  studentId    : z.string().uuid('Invalid student ID'),
});

export type CreateAssessmentInput     = z.infer<typeof CreateAssessmentSchema>;
export type CreateFinalEvaluationInput = z.infer<typeof CreateFinalEvaluationSchema>;
export type UpdateAssessmentInput     = z.infer<typeof UpdateAssessmentSchema>;
export type CreateRubricInput         = z.infer<typeof CreateRubricSchema>;
export type GenerateReportInput       = z.infer<typeof GenerateReportSchema>;
