import { Response, NextFunction } from 'express';
import { OrganizationService } from '../services/organization.service';
import { AuthenticatedRequest } from '../../auth/middlewares/auth.middleware';
import {
  CreateOrganizationSchema,
  UpdateOrganizationSchema,
  AddMemberSchema,
  SubmitVerificationSchema,
  VerifyOrganizationSchema,
  OrderPaymentSchema,
  VerifyPaymentSchema,
  AddBranchSchema,
  ConfigureSSOSchema,
} from '../validators/organization.validator';
import { getFileUrl } from '../../../utils/storage';

const orgService = new OrganizationService();

export class OrganizationController {
  // 1. Create Organization Profile
  async createOrganization(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = CreateOrganizationSchema.parse(req.body);
      const ip = req.ip || req.socket.remoteAddress;

      const org = await orgService.createOrganization(req.user!.id, validated, ip);
      res.status(201).json({
        success: true,
        message: 'Organization profile created successfully.',
        data: org,
      });
    } catch (error) {
      next(error);
    }
  }

  // 2. Get Organization details
  async getOrganization(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const org = await orgService.getOrganization(id);

      // Security check: non-members and non-admins see a sanitized/public view of organization details
      const isMember = org.members.some((m: any) => m.userId === req.user!.id);
      if (req.user!.role !== 'ADMIN' && !isMember) {
        res.status(200).json({
          success: true,
          data: {
            id: org.id,
            organizationType: org.organizationType,
            name: org.name,
            website: org.website,
            description: org.description,
            linkedinUrl: org.linkedinUrl,
            linkedinVerified: org.linkedinVerified,
          },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: org,
      });
    } catch (error) {
      next(error);
    }
  }

  // 3. Update Organization details
  async updateOrganization(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const validated = UpdateOrganizationSchema.parse(req.body);
      const ip = req.ip || req.socket.remoteAddress;

      const org = await orgService.updateOrganization(req.user!.id, id, validated, ip);
      res.status(200).json({
        success: true,
        message: 'Organization profile updated successfully.',
        data: org,
      });
    } catch (error) {
      next(error);
    }
  }

  // 4. Upload KYC Documents
  async uploadVerificationDocument(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'KYC Verification document is required (PDF, JPG, PNG, max 10MB).',
        });
        return;
      }

      const ip = req.ip || req.socket.remoteAddress;
      const documentUrl = getFileUrl(req, req.file.filename);
      const org = await orgService.uploadVerificationDoc(req.user!.id, id, documentUrl, ip);

      res.status(200).json({
        success: true,
        message: 'KYC Document uploaded successfully.',
        data: {
          verificationDocumentUrl: org.verificationDocumentUrl,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // 5. Submit KYC for Verification
  async submitVerification(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const ip = req.ip || req.socket.remoteAddress;

      const org = await orgService.submitVerification(req.user!.id, id, ip);
      res.status(200).json({
        success: true,
        message: 'KYC verification request submitted successfully.',
        data: {
          verificationStatus: org.verificationStatus,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // 6. Admin Verification Action (Approve/Reject)
  async verifyOrganization(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const validated = VerifyOrganizationSchema.parse(req.body);
      const ip = req.ip || req.socket.remoteAddress;

      const org = await orgService.verifyOrganization(req.user!.id, id, validated.status, ip);
      res.status(200).json({
        success: true,
        message: `Organization verification status updated to ${validated.status}.`,
        data: org,
      });
    } catch (error) {
      next(error);
    }
  }

  // 7. Add Team Member
  async addTeamMember(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = AddMemberSchema.parse(req.body);
      const { organizationId } = req.body;
      if (!organizationId) {
        res.status(400).json({ success: false, message: 'organizationId is required.' });
        return;
      }

      const ip = req.ip || req.socket.remoteAddress;
      const member = await orgService.addTeamMember(req.user!.id, organizationId, validated.email, validated.role, ip);

      res.status(201).json({
        success: true,
        message: 'Team member added successfully.',
        data: member,
      });
    } catch (error) {
      next(error);
    }
  }

  // 8. Get Team Members list
  async getMembers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { organizationId } = req.query;
      if (!organizationId || typeof organizationId !== 'string') {
        res.status(400).json({ success: false, message: 'organizationId query parameter is required.' });
        return;
      }

      const members = await orgService.getMembers(req.user!.id, organizationId);
      res.status(200).json({
        success: true,
        data: members,
      });
    } catch (error) {
      next(error);
    }
  }

  // 9. Subscriptions - Create Razorpay payment Order
  async createPaymentOrder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = OrderPaymentSchema.parse(req.body);
      const { organizationId } = req.body;
      if (!organizationId) {
        res.status(400).json({ success: false, message: 'organizationId is required.' });
        return;
      }

      const order = await orgService.createPaymentOrder(req.user!.id, organizationId, validated.planName, validated.gstin);
      res.status(200).json(order);
    } catch (error) {
      next(error);
    }
  }

  // 10. Subscriptions - Verify Razorpay payment
  async verifyPayment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = VerifyPaymentSchema.parse(req.body);
      const { organizationId, planName, amount, gstAmount, totalAmount, gstin } = req.body;
      
      if (!organizationId || !planName || amount === undefined || gstAmount === undefined || totalAmount === undefined) {
        res.status(400).json({ success: false, message: 'All subscription payment fields are required.' });
        return;
      }

      const ip = req.ip || req.socket.remoteAddress;
      const sub = await orgService.verifyPayment(req.user!.id, organizationId, {
        planName,
        amount,
        gstAmount,
        totalAmount,
        gstin,
        orderId: validated.orderId,
        paymentId: validated.paymentId,
        signature: validated.signature,
      }, ip);

      res.status(200).json({
        success: true,
        message: 'Subscription plan activated successfully.',
        data: sub,
      });
    } catch (error) {
      next(error);
    }
  }

  // 11. Add Branch (Multi-Campus)
  async addBranch(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = AddBranchSchema.parse(req.body);
      const { organizationId } = req.body;
      if (!organizationId) {
        res.status(400).json({ success: false, message: 'organizationId is required.' });
        return;
      }

      const ip = req.ip || req.socket.remoteAddress;
      const branch = await orgService.addBranch(req.user!.id, organizationId, validated, ip);
      res.status(201).json({
        success: true,
        message: 'Branch added successfully.',
        data: branch,
      });
    } catch (error) {
      next(error);
    }
  }

  // 12. Get Branches list
  async getBranches(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params; // organization ID
      const branches = await orgService.getBranches(req.user!.id, id);
      
      res.status(200).json({
        success: true,
        data: branches,
      });
    } catch (error) {
      next(error);
    }
  }

  // 13. Configure SSO (Enterprise plan only)
  async configureSSO(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = ConfigureSSOSchema.parse(req.body);
      const { organizationId } = req.body;
      if (!organizationId) {
        res.status(400).json({ success: false, message: 'organizationId is required.' });
        return;
      }

      const ip = req.ip || req.socket.remoteAddress;
      const org = await orgService.configureSSO(req.user!.id, organizationId, validated, ip);
      res.status(200).json({
        success: true,
        message: 'SSO configuration updated successfully.',
        data: org,
      });
    } catch (error) {
      next(error);
    }
  }

  // 14. Get Dashboard Statistics
  async getDashboardMetrics(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { organizationId } = req.query;
      if (!organizationId || typeof organizationId !== 'string') {
        res.status(400).json({ success: false, message: 'organizationId query parameter is required.' });
        return;
      }

      const stats = await orgService.getDashboardMetrics(req.user!.id, organizationId);
      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}
