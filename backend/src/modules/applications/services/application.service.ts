import { ApplicationRepository } from '../repositories/application.repository';
import redisClient from '../../../config/redis';
import logger from '../../../config/logger';
import prisma from '../../../config/db';
import { Application, ApplicationStatus } from '@prisma/client';

export class ApplicationService {
  private appRepository: ApplicationRepository;

  constructor() {
    this.appRepository = new ApplicationRepository();
  }

  // Invalidate Redis cache keys on mutation
  private async invalidateCache(studentId?: string, opportunityId?: string, applicationId?: string, orgId?: string) {
    try {
      if (applicationId) {
        await redisClient.del(`application:${applicationId}`);
      }
      if (studentId) {
        await redisClient.del(`student_applications:${studentId}`);
        await redisClient.del(`student_dashboard:${studentId}`);
      }
      if (opportunityId) {
        await redisClient.del(`opportunity_applications:${opportunityId}`);
      }
      if (orgId) {
        await redisClient.del(`organization_dashboard:${orgId}`);
      }
      logger.debug(`Evicted cache for Application: ${applicationId || 'none'}, Student: ${studentId || 'none'}, Opportunity: ${opportunityId || 'none'}`);
    } catch (err: any) {
      logger.error(`Redis cache invalidation error: ${err.message}`);
    }
  }

  // Helper to verify if user has authorization to edit/review applications for an opportunity
  private async verifyReviewerAccess(opportunityId: string, userId: string, role: string): Promise<string | null> {
    if (role === 'ADMIN') return null;

    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId },
    });

    if (!opportunity) {
      const error: any = new Error('Opportunity not found');
      error.status = 404;
      throw error;
    }

    if (opportunity.createdBy === userId) {
      return opportunity.organizationId;
    }

    if (opportunity.organizationId) {
      const member = await prisma.organizationMember.findFirst({
        where: {
          organizationId: opportunity.organizationId,
          userId,
        },
      });
      if (member) {
        return opportunity.organizationId;
      }
    }

    const error: any = new Error('You are not authorized to manage applications for this opportunity.');
    error.status = 403;
    throw error;
  }

  // 1. Submit or save Draft application
  async apply(
    userId: string,
    role: string,
    data: {
      opportunityId: string;
      coverLetter?: string | null;
      useProfileResume?: boolean;
      status?: ApplicationStatus;
    },
    customResumePath?: string | null
  ): Promise<Application> {
    if (role !== 'STUDENT') {
      const error: any = new Error('Only students can apply for opportunities.');
      error.status = 403;
      throw error;
    }

    const student = await prisma.student.findUnique({
      where: { userId },
    });

    if (!student) {
      const error: any = new Error('Student profile not found.');
      error.status = 404;
      throw error;
    }

    const opportunity = await prisma.opportunity.findUnique({
      where: { id: data.opportunityId },
    });

    if (!opportunity) {
      const error: any = new Error('Opportunity not found.');
      error.status = 404;
      throw error;
    }

    // Opportunity must be published or applications open
    if (opportunity.status !== 'PUBLISHED' && opportunity.status !== 'APPLICATIONS_OPEN') {
      const error: any = new Error('This opportunity is not accepting applications.');
      error.status = 400;
      throw error;
    }

    // Deadline checking
    if (new Date(opportunity.deadline) < new Date()) {
      const error: any = new Error('The deadline for this opportunity has passed.');
      error.status = 400;
      throw error;
    }

    // Prevent duplicate applications
    const existing = await this.appRepository.findExistingApplication(student.id, data.opportunityId);
    if (existing) {
      const error: any = new Error('You have already applied to this opportunity.');
      error.status = 400;
      throw error;
    }

    // Resume evaluation
    let resumeUrl: string | null = null;
    if (customResumePath) {
      resumeUrl = customResumePath;
    } else if (data.useProfileResume !== false) {
      resumeUrl = student.resumeUrl;
    }

    if (!resumeUrl) {
      const error: any = new Error('Resume is required. Please upload a custom resume or add a resume to your profile.');
      error.status = 400;
      throw error;
    }

    const status = data.status || 'SUBMITTED';

    const application = await this.appRepository.createApplication(
      student.id,
      data.opportunityId,
      {
        coverLetter: data.coverLetter,
        resumeUrl,
        status,
      },
      userId
    );

    // Notifications
    if (status === 'SUBMITTED') {
      try {
        await prisma.notification.create({
          data: {
            userId: opportunity.createdBy,
            title: 'New Application Received',
            message: `A new application has been submitted for your opportunity "${opportunity.title}".`,
          },
        });
      } catch (err: any) {
        logger.error(`Notification error: ${err.message}`);
      }
    }

    await this.invalidateCache(student.id, data.opportunityId, undefined, opportunity.organizationId || undefined);

    return application;
  }

  // 2. Withdraw application
  async withdraw(userId: string, role: string, applicationId: string): Promise<Application> {
    const student = await prisma.student.findUnique({
      where: { userId },
    });

    if (!student) {
      const error: any = new Error('Student profile not found.');
      error.status = 404;
      throw error;
    }

    const application = await this.appRepository.findApplicationById(applicationId);
    if (!application) {
      const error: any = new Error('Application not found.');
      error.status = 404;
      throw error;
    }

    if (application.studentId !== student.id && role !== 'ADMIN') {
      const error: any = new Error('You are not authorized to withdraw this application.');
      error.status = 403;
      throw error;
    }

    if (['ACCEPTED', 'COMPLETED'].includes(application.status)) {
      const error: any = new Error('Cannot withdraw an application that has already been accepted or completed.');
      error.status = 400;
      throw error;
    }

    const updated = await this.appRepository.updateApplicationStatus(
      applicationId,
      'WITHDRAWN',
      userId,
      'Withdrawn by student'
    );

    await this.invalidateCache(
      application.studentId,
      application.opportunityId,
      applicationId,
      application.opportunity.organizationId || undefined
    );

    return updated;
  }

  // 3. Update single application status
  async updateStatus(
    userId: string,
    role: string,
    applicationId: string,
    newStatus: ApplicationStatus,
    remarks?: string | null
  ): Promise<Application> {
    const application = await this.appRepository.findApplicationById(applicationId);
    if (!application) {
      const error: any = new Error('Application not found.');
      error.status = 404;
      throw error;
    }

    // Authorization checks
    await this.verifyReviewerAccess(application.opportunityId, userId, role);

    // Rule 5 violation
    if (application.status === 'REJECTED' && newStatus === 'ACCEPTED') {
      const error: any = new Error('Rule 5 violation: Rejected applications cannot transition back to ACCEPTED.');
      error.status = 400;
      throw error;
    }

    const updated = await this.appRepository.updateApplicationStatus(
      applicationId,
      newStatus,
      userId,
      remarks
    );

    if (newStatus === 'ACCEPTED') {
      try {
        const existingInternship = await prisma.internship.findUnique({
          where: { applicationId: application.id },
        });
        if (!existingInternship) {
          await prisma.internship.create({
            data: {
              applicationId: application.id,
              studentId: application.studentId,
              organizationId: application.opportunity.organizationId,
              opportunityId: application.opportunityId,
              status: 'ACTIVE',
            },
          });
          logger.info(`Auto-created Internship for application ${application.id}`);
        }
      } catch (err: any) {
        logger.error(`Failed to auto-create Internship for application ${application.id}: ${err.message}`);
      }
    }

    // Notify Student
    try {
      await prisma.notification.create({
        data: {
          userId: application.student.userId,
          title: `Application Status Update: ${newStatus}`,
          message: `Your application for "${application.opportunity.title}" is now: ${newStatus}. ${remarks ? `Remarks: ${remarks}` : ''}`,
        },
      });
    } catch (err: any) {
      logger.error(`Notification error: ${err.message}`);
    }

    await this.invalidateCache(
      application.studentId,
      application.opportunityId,
      applicationId,
      application.opportunity.organizationId || undefined
    );

    return updated;
  }

  // 4. Bulk update statuses
  async bulkUpdate(
    userId: string,
    role: string,
    data: {
      applicationIds: string[];
      status: ApplicationStatus;
      remarks?: string | null;
    }
  ) {
    if (data.applicationIds.length === 0) return { count: 0 };

    const firstApp = await this.appRepository.findApplicationById(data.applicationIds[0]);
    if (!firstApp) {
      const error: any = new Error('Application not found.');
      error.status = 404;
      throw error;
    }

    // Verify reviewer access for the opportunity (assuming bulk action belongs to a single opportunity)
    const orgId = await this.verifyReviewerAccess(firstApp.opportunityId, userId, role);

    // Check Rule 5 & transition validity for each application
    for (const appId of data.applicationIds) {
      const app = await this.appRepository.findApplicationById(appId);
      if (!app) {
        const error: any = new Error(`Application ${appId} not found.`);
        error.status = 404;
        throw error;
      }
      if (app.opportunityId !== firstApp.opportunityId) {
        const error: any = new Error('All applications in bulk update must belong to the same opportunity.');
        error.status = 400;
        throw error;
      }
      if (app.status === 'REJECTED' && data.status === 'ACCEPTED') {
        const error: any = new Error(`Rule 5 violation: Rejected application ${appId} cannot transition back to ACCEPTED.`);
        error.status = 400;
        throw error;
      }
    }

    const updated = await this.appRepository.bulkUpdateStatus(
      data.applicationIds,
      data.status,
      userId,
      data.remarks
    );

    if (data.status === 'ACCEPTED') {
      for (const appId of data.applicationIds) {
        try {
          const app = await prisma.application.findUnique({
            where: { id: appId },
            include: { opportunity: true },
          });
          if (app) {
            const existing = await prisma.internship.findUnique({
              where: { applicationId: app.id },
            });
            if (!existing) {
              await prisma.internship.create({
                data: {
                  applicationId: app.id,
                  studentId: app.studentId,
                  organizationId: app.opportunity.organizationId,
                  opportunityId: app.opportunityId,
                  status: 'ACTIVE',
                },
              });
              logger.info(`Auto-created Internship for application ${app.id} (bulk)`);
            }
          }
        } catch (err: any) {
          logger.error(`Failed to auto-create Internship for application ${appId} (bulk): ${err.message}`);
        }
      }
    }

    // Notify Students and evict caches
    for (const appId of data.applicationIds) {
      const app = await this.appRepository.findApplicationById(appId);
      if (app) {
        try {
          await prisma.notification.create({
            data: {
              userId: app.student.userId,
              title: `Application Bulk Status Update: ${data.status}`,
              message: `Your application for "${app.opportunity.title}" is now: ${data.status}.`,
            },
          });
        } catch (err: any) {
          logger.error(`Notification error: ${err.message}`);
        }
        await this.invalidateCache(app.studentId, app.opportunityId, appId, orgId || undefined);
      }
    }

    return updated;
  }

  // 5. Add Note
  async addNote(
    userId: string,
    role: string,
    applicationId: string,
    note: string
  ) {
    const application = await this.appRepository.findApplicationById(applicationId);
    if (!application) {
      const error: any = new Error('Application not found.');
      error.status = 404;
      throw error;
    }

    const orgId = await this.verifyReviewerAccess(application.opportunityId, userId, role);

    const noteRecord = await this.appRepository.addNote(
      applicationId,
      orgId,
      note,
      userId
    );

    await this.invalidateCache(undefined, undefined, applicationId);

    return noteRecord;
  }

  // 6. Get Application details
  async getApplicationById(userId: string, role: string, applicationId: string): Promise<any> {
    const cacheKey = `application:${applicationId}`;

    let appDetails: any = null;
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        appDetails = JSON.parse(cached);
      }
    } catch (err: any) {
      logger.error(`Redis cache retrieval error: ${err.message}`);
    }

    if (!appDetails) {
      appDetails = await this.appRepository.findApplicationById(applicationId);
      if (!appDetails) {
        const error: any = new Error('Application not found.');
        error.status = 404;
        throw error;
      }
      try {
        await redisClient.set(cacheKey, JSON.stringify(appDetails), { EX: 15 * 60 });
      } catch (err: any) {
        logger.error(`Redis cache set error: ${err.message}`);
      }
    }

    // Access check
    const isStudentOwner = appDetails.student.userId === userId;
    const isAdmin = role === 'ADMIN';
    let hasOrgAccess = false;

    if (appDetails.opportunity.organizationId) {
      const member = await prisma.organizationMember.findFirst({
        where: {
          organizationId: appDetails.opportunity.organizationId,
          userId,
        },
      });
      if (member) hasOrgAccess = true;
    }

    if (appDetails.opportunity.createdBy === userId) {
      hasOrgAccess = true;
    }

    if (!isStudentOwner && !isAdmin && !hasOrgAccess) {
      const error: any = new Error('You are not authorized to view this application.');
      error.status = 403;
      throw error;
    }

    // Hide notes from student
    if (isStudentOwner && !hasOrgAccess && !isAdmin) {
      const { notes, ...studentView } = appDetails;
      return studentView;
    }

    return appDetails;
  }

  // 7. Get opportunity applicants
  async getApplicants(userId: string, role: string, opportunityId: string) {
    await this.verifyReviewerAccess(opportunityId, userId, role);

    const cacheKey = `opportunity_applications:${opportunityId}`;
    let applicants: any = null;

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        applicants = JSON.parse(cached);
      }
    } catch (err: any) {
      logger.error(`Redis cache retrieval error: ${err.message}`);
    }

    if (!applicants) {
      applicants = await this.appRepository.getApplicantsByOpportunityId(opportunityId);
      try {
        await redisClient.set(cacheKey, JSON.stringify(applicants), { EX: 15 * 60 });
      } catch (err: any) {
        logger.error(`Redis cache set error: ${err.message}`);
      }
    }

    return applicants;
  }

  // 8. Get student applications
  async getStudentApplications(userId: string, role: string, studentId: string) {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      const error: any = new Error('Student profile not found.');
      error.status = 404;
      throw error;
    }

    if (student.userId !== userId && role !== 'ADMIN') {
      const error: any = new Error('You are not authorized to view this student\'s applications.');
      error.status = 403;
      throw error;
    }

    const cacheKey = `student_applications:${studentId}`;
    let applications: any = null;

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        applications = JSON.parse(cached);
      }
    } catch (err: any) {
      logger.error(`Redis cache retrieval error: ${err.message}`);
    }

    if (!applications) {
      applications = await this.appRepository.getStudentApplications(studentId);
      try {
        await redisClient.set(cacheKey, JSON.stringify(applications), { EX: 15 * 60 });
      } catch (err: any) {
        logger.error(`Redis cache set error: ${err.message}`);
      }
    }

    return applications;
  }

  // 9. Get dashboard metrics
  async getDashboardMetrics(userId: string, role: string, filters: {
    organizationId?: string;
    opportunityId?: string;
    studentId?: string;
  }) {
    // Access controls
    if (filters.studentId) {
      const student = await prisma.student.findUnique({ where: { id: filters.studentId } });
      if (!student || (student.userId !== userId && role !== 'ADMIN')) {
        const error: any = new Error('Unauthorized dashboard access.');
        error.status = 403;
        throw error;
      }
    }

    if (filters.opportunityId) {
      await this.verifyReviewerAccess(filters.opportunityId, userId, role);
    }

    if (filters.organizationId) {
      if (role !== 'ADMIN') {
        const member = await prisma.organizationMember.findFirst({
          where: {
            organizationId: filters.organizationId,
            userId,
          },
        });
        if (!member) {
          const error: any = new Error('Unauthorized organization dashboard access.');
          error.status = 403;
          throw error;
        }
      }
    }

    return this.appRepository.getDashboardStats(filters);
  }
}
