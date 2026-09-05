import { Response, NextFunction } from 'express';
import { ApplicationService } from '../services/application.service';
import { AuthenticatedRequest } from '../../auth/middlewares/auth.middleware';
import {
  ApplyOpportunitySchema,
  UpdateStatusSchema,
  AddNoteSchema,
  BulkUpdateSchema,
} from '../validators/application.validator';
import prisma from '../../../config/db';

const appService = new ApplicationService();

export class ApplicationController {
  // 1. Create/Submit application (with file upload option)
  async apply(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = ApplyOpportunitySchema.parse(req.body);
      const customResumePath = req.file ? `/uploads/resumes/${req.file.filename}` : null;

      const application = await appService.apply(
        req.user!.id,
        req.user!.role,
        validated,
        customResumePath
      );

      res.status(201).json({
        success: true,
        message: validated.status === 'DRAFT' ? 'Application draft saved.' : 'Application submitted successfully.',
        data: application,
      });
    } catch (error) {
      next(error);
    }
  }

  // 2. Withdraw application
  async withdraw(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const application = await appService.withdraw(req.user!.id, req.user!.role, id);

      res.status(200).json({
        success: true,
        message: 'Application withdrawn successfully.',
        data: application,
      });
    } catch (error) {
      next(error);
    }
  }

  // 3. Update application status
  async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status, remarks } = UpdateStatusSchema.parse(req.body);

      const application = await appService.updateStatus(
        req.user!.id,
        req.user!.role,
        id,
        status,
        remarks
      );

      res.status(200).json({
        success: true,
        message: `Application status updated to ${status}.`,
        data: application,
      });
    } catch (error) {
      next(error);
    }
  }

  // 4. Bulk update applications
  async bulkUpdate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = BulkUpdateSchema.parse(req.body);
      const result = await appService.bulkUpdate(req.user!.id, req.user!.role, validated);

      res.status(200).json({
        success: true,
        message: 'Bulk status update completed successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // 5. Add internal organizational note
  async addNote(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { note } = AddNoteSchema.parse(req.body);

      const noteRecord = await appService.addNote(
        req.user!.id,
        req.user!.role,
        id,
        note
      );

      res.status(201).json({
        success: true,
        message: 'Internal note added successfully.',
        data: noteRecord,
      });
    } catch (error) {
      next(error);
    }
  }

  // 6. Get Application detail
  async getApplication(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const application = await appService.getApplicationById(req.user!.id, req.user!.role, id);

      res.status(200).json({
        success: true,
        data: application,
      });
    } catch (error) {
      next(error);
    }
  }

  // 7. Get applicants for an opportunity
  async getApplicants(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { opportunityId } = req.params;
      const applicants = await appService.getApplicants(req.user!.id, req.user!.role, opportunityId);

      res.status(200).json({
        success: true,
        data: applicants,
      });
    } catch (error) {
      next(error);
    }
  }

  // 8. Get my applications (for student)
  async getMyApplications(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const student = await prisma.student.findUnique({
        where: { userId: req.user!.id },
      });

      if (!student) {
        res.status(404).json({
          success: false,
          message: 'Student profile not found.',
        });
        return;
      }

      const applications = await appService.getStudentApplications(
        req.user!.id,
        req.user!.role,
        student.id
      );

      res.status(200).json({
        success: true,
        data: applications,
      });
    } catch (error) {
      next(error);
    }
  }

  // 9. Get dashboard metrics
  async getDashboardMetrics(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { organizationId, opportunityId, studentId } = req.query;

      const metrics = await appService.getDashboardMetrics(
        req.user!.id,
        req.user!.role,
        {
          organizationId: organizationId as string,
          opportunityId: opportunityId as string,
          studentId: studentId as string,
        }
      );

      res.status(200).json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  }
}
