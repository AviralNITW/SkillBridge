import { z } from 'zod';

export const CreateNotificationSchema = z.object({
  userId: z.string().uuid(),
  title: z.string().min(1).max(255),
  message: z.string().min(1),
  category: z.enum(['AUTHENTICATION','APPLICATION','TASK','ASSESSMENT','CERTIFICATE','PORTFOLIO','SYSTEM','ADMIN']),
  priority: z.enum(['LOW','MEDIUM','HIGH','CRITICAL']),
});

export const UpdatePreferencesSchema = z.object({
  emailEnabled: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
  taskNotifications: z.boolean().optional(),
  applicationNotifications: z.boolean().optional(),
  certificateNotifications: z.boolean().optional(),
});
