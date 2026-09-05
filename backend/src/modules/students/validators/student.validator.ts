import { z } from 'zod';

export const CreateProfileSchema = z.object({
  dateOfBirth: z.preprocess((val) => (typeof val === 'string' ? new Date(val) : val), z.date({
    required_error: 'Date of birth is required',
    invalid_type_error: 'Invalid date of birth format',
  })),
  gender: z.string().min(1, 'Gender is required').max(20),
  bio: z.string().optional(),
});

export const UpdateProfileSchema = z.object({
  bio: z.string().optional(),
  dateOfBirth: z.preprocess((val) => (typeof val === 'string' ? new Date(val) : val), z.date().optional()),
  gender: z.string().max(20).optional(),
});

export const SkillSchema = z.object({
  skillName: z.string().min(1, 'Skill name is required').max(100),
  proficiencyLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'], {
    errorMap: () => ({ message: 'Proficiency must be BEGINNER, INTERMEDIATE, or ADVANCED' }),
  }),
  yearsOfExperience: z.number().int().min(0, 'Years of experience cannot be negative'),
});

export const EducationSchema = z.object({
  institutionName: z.string().min(1, 'Institution name is required').max(255),
  degree: z.string().min(1, 'Degree is required').max(100),
  specialization: z.string().min(1, 'Specialization is required').max(100),
  cgpa: z.number().min(0, 'CGPA cannot be negative').max(10, 'CGPA cannot exceed 10.0'),
  startYear: z.number().int().min(1900).max(2100),
  endYear: z.number().int().min(1900).max(2100),
}).refine((data) => data.endYear >= data.startYear, {
  message: 'End year must be greater than or equal to start year',
  path: ['endYear'],
});

export const ProjectSchema = z.object({
  title: z.string().min(1, 'Project title is required').max(255),
  description: z.string().min(1, 'Project description is required'),
  techStack: z.string().min(1, 'Tech stack is required'),
  githubUrl: z.string().url('Invalid GitHub URL').or(z.literal('')).optional().nullable(),
  liveUrl: z.string().url('Invalid Live URL').or(z.literal('')).optional().nullable(),
});

export const AchievementSchema = z.object({
  title: z.string().min(1, 'Achievement title is required').max(255),
  description: z.string().optional().nullable(),
  achievementDate: z.preprocess((val) => (typeof val === 'string' ? new Date(val) : val), z.date({
    required_error: 'Achievement date is required',
  })),
});

export const CertificateSchema = z.object({
  certificateName: z.string().min(1, 'Certificate name is required').max(255),
  issuer: z.string().min(1, 'Issuer is required').max(255),
  issueDate: z.preprocess((val) => (typeof val === 'string' ? new Date(val) : val), z.date({
    required_error: 'Issue date is required',
  })),
});
