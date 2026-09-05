import { z } from 'zod';

export const CertificateCreateSchema = z.object({
  studentId: z.string().uuid(),
  opportunityId: z.string().uuid(),
  certificateNumber: z.string().regex(/^SB-CERT-\d{4}-\d{6}$/),
  // optional fields will be set by service
});

export type CertificateCreateDto = z.infer<typeof CertificateCreateSchema>;
