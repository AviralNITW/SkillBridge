import { z } from 'zod';

export const CreateOrganizationSchema = z.object({
  organizationType: z.enum(['SCHOOL', 'COMPANY']),
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email('Invalid email address').max(255),
  phone: z.string().max(20).optional().nullable(),
  website: z.string().url('Invalid website URL').or(z.literal('')).optional().nullable(),
  address: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  
  // School-specific
  institutionType: z.string().min(1, 'Institution type is required').optional(),
  principalName: z.string().optional().nullable(),
  studentCount: z.number().int().min(0).optional().nullable(),

  // Company-specific
  industry: z.string().optional().nullable(),
  companySize: z.string().optional().nullable(),
  headquarters: z.string().optional().nullable(),
  foundedYear: z.number().int().min(1800).max(new Date().getFullYear()).optional().nullable(),
}).refine((data) => {
  if (data.organizationType === 'SCHOOL') {
    return !!data.institutionType;
  }
  return true;
}, {
  message: 'Institution type is required for school organizations',
  path: ['institutionType'],
});

export const UpdateOrganizationSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  phone: z.string().max(20).optional().nullable(),
  website: z.string().url('Invalid website URL').or(z.literal('')).optional().nullable(),
  address: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  linkedinUrl: z.string().url('Invalid LinkedIn URL').or(z.literal('')).optional().nullable(),
  
  // School-specific (optional for updates)
  institutionType: z.string().min(1).optional(),
  principalName: z.string().optional().nullable(),
  studentCount: z.number().int().min(0).optional().nullable(),

  // Company-specific (optional for updates)
  industry: z.string().optional().nullable(),
  companySize: z.string().optional().nullable(),
  headquarters: z.string().optional().nullable(),
  foundedYear: z.number().int().min(1800).max(new Date().getFullYear() + 1).optional().nullable(),
});

export const AddMemberSchema = z.object({
  email: z.string().email('Invalid member email address'),
  role: z.string().min(1, 'Member role is required').max(100),
});

export const SubmitVerificationSchema = z.object({
  verificationDocumentUrl: z.string().url('Invalid document URL'),
});

export const VerifyOrganizationSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'SUSPENDED']),
});

export const OrderPaymentSchema = z.object({
  planName: z.enum(['STARTER', 'GROWTH', 'ENTERPRISE']),
  gstin: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN format').or(z.literal('')).optional().nullable(),
});

export const VerifyPaymentSchema = z.object({
  orderId: z.string().min(1, 'Razorpay Order ID is required'),
  paymentId: z.string().min(1, 'Razorpay Payment ID is required'),
  signature: z.string().min(1, 'Razorpay signature is required'),
});

export const AddBranchSchema = z.object({
  name: z.string().min(1, 'Branch name is required').max(255),
  location: z.string().min(1, 'Location is required').max(255),
  address: z.string().optional().nullable(),
});

export const ConfigureSSOSchema = z.object({
  ssoEnabled: z.boolean(),
  ssoProvider: z.enum(['SAML', 'OIDC']).optional().nullable(),
});
