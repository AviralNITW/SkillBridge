import prisma from '../../../config/db';
import { Application, ApplicationStatus, ApplicationStatusHistory, ApplicationNote } from '@prisma/client';

export class ApplicationRepository {
  // 1. Create an application within a transaction
  async createApplication(
    studentId: string,
    opportunityId: string,
    data: {
      coverLetter?: string | null;
      resumeUrl?: string | null;
      status: ApplicationStatus;
    },
    userId: string
  ): Promise<Application> {
    return prisma.$transaction(async (tx) => {
      const app = await tx.application.create({
        data: {
          studentId,
          opportunityId,
          status: data.status,
          coverLetter: data.coverLetter,
          resumeUrl: data.resumeUrl,
        },
      });

      // Add status history
      await tx.applicationStatusHistory.create({
        data: {
          applicationId: app.id,
          oldStatus: null,
          newStatus: data.status,
          changedBy: userId,
          remarks: 'Application created',
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'APPLICATION_CREATED',
          resourceType: 'APPLICATION',
          resourceId: app.id,
        },
      });

      return app;
    });
  }

  // 2. Find application by ID
  async findApplicationById(id: string) {
    return prisma.application.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            skills: true,
          },
        },
        opportunity: {
          include: {
            organization: true,
          },
        },
        statusHistory: {
          orderBy: { changedAt: 'desc' },
        },
        notes: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  // 3. Find unique application by student and opportunity (to check duplicates)
  async findExistingApplication(studentId: string, opportunityId: string): Promise<Application | null> {
    return prisma.application.findUnique({
      where: {
        studentId_opportunityId: {
          studentId,
          opportunityId,
        },
      },
    });
  }

  // 4. Update application status with history tracking
  async updateApplicationStatus(
    id: string,
    newStatus: ApplicationStatus,
    userId: string,
    remarks?: string | null
  ): Promise<Application> {
    return prisma.$transaction(async (tx) => {
      const current = await tx.application.findUnique({
        where: { id },
      });

      if (!current) {
        throw new Error('Application not found');
      }

      const updated = await tx.application.update({
        where: { id },
        data: {
          status: newStatus,
          submittedAt: newStatus === 'SUBMITTED' && current.status === 'DRAFT' ? new Date() : current.submittedAt,
        },
      });

      await tx.applicationStatusHistory.create({
        data: {
          applicationId: id,
          oldStatus: current.status,
          newStatus,
          changedBy: userId,
          remarks: remarks || null,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: `APPLICATION_STATUS_UPDATED_${newStatus}`,
          resourceType: 'APPLICATION',
          resourceId: id,
        },
      });

      return updated;
    });
  }

  // 5. Bulk status updates
  async bulkUpdateStatus(
    applicationIds: string[],
    newStatus: ApplicationStatus,
    userId: string,
    remarks?: string | null
  ) {
    return prisma.$transaction(async (tx) => {
      const currentApplications = await tx.application.findMany({
        where: { id: { in: applicationIds } },
      });

      const updated = await tx.application.updateMany({
        where: { id: { in: applicationIds } },
        data: { status: newStatus },
      });

      const historyData = currentApplications.map((app) => ({
        applicationId: app.id,
        oldStatus: app.status,
        newStatus,
        changedBy: userId,
        remarks: remarks || 'Bulk status update',
      }));

      await tx.applicationStatusHistory.createMany({
        data: historyData,
      });

      const auditLogs = applicationIds.map((id) => ({
        userId,
        action: `APPLICATION_BULK_STATUS_UPDATED_${newStatus}`,
        resourceType: 'APPLICATION',
        resourceId: id,
      }));

      await tx.auditLog.createMany({
        data: auditLogs,
      });

      return updated;
    });
  }

  // 6. Add organizational note
  async addNote(
    applicationId: string,
    organizationId: string | null,
    note: string,
    createdBy: string
  ): Promise<ApplicationNote> {
    return prisma.$transaction(async (tx) => {
      const noteRecord = await tx.applicationNote.create({
        data: {
          applicationId,
          organizationId,
          note,
          createdBy,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: createdBy,
          action: 'APPLICATION_NOTE_ADDED',
          resourceType: 'APPLICATION',
          resourceId: applicationId,
        },
      });

      return noteRecord;
    });
  }

  // 7. Get notes for an application
  async getNotesByApplication(applicationId: string): Promise<ApplicationNote[]> {
    return prisma.applicationNote.findMany({
      where: { applicationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 8. Find applicants for a specific opportunity
  async getApplicantsByOpportunityId(opportunityId: string) {
    return prisma.application.findMany({
      where: { opportunityId },
      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            skills: true,
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  // 9. Find applications by student
  async getStudentApplications(studentId: string) {
    return prisma.application.findMany({
      where: { studentId },
      include: {
        opportunity: {
          include: {
            organization: true,
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  // 10. Dashboard analytics
  async getDashboardStats(filters: {
    organizationId?: string;
    opportunityId?: string;
    studentId?: string;
  }) {
    const whereClause: any = {};

    if (filters.studentId) {
      whereClause.studentId = filters.studentId;
    }
    if (filters.opportunityId) {
      whereClause.opportunityId = filters.opportunityId;
    }
    if (filters.organizationId) {
      whereClause.opportunity = {
        organizationId: filters.organizationId,
      };
    }

    const applications = await prisma.application.findMany({
      where: whereClause,
      select: {
        status: true,
      },
    });

    const total = applications.length;
    const stats: Record<string, number> = {
      DRAFT: 0,
      SUBMITTED: 0,
      UNDER_REVIEW: 0,
      SHORTLISTED: 0,
      ACCEPTED: 0,
      REJECTED: 0,
      WITHDRAWN: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
    };

    applications.forEach((app) => {
      if (stats[app.status] !== undefined) {
        stats[app.status]++;
      }
    });

    const processedCount = stats.ACCEPTED + stats.REJECTED;
    const conversionRate = total > 0 ? parseFloat(((stats.ACCEPTED / total) * 100).toFixed(2)) : 0;

    return {
      total,
      ...stats,
      conversionRate,
    };
  }

  // 11. Find expired drafts (for cleanup job)
  async findStaleDrafts(olderThan: Date) {
    return prisma.application.findMany({
      where: {
        status: 'DRAFT',
        updatedAt: { lt: olderThan },
      },
    });
  }

  // 12. Delete stale drafts
  async deleteDrafts(ids: string[]) {
    return prisma.application.deleteMany({
      where: {
        id: { in: ids },
      },
    });
  }
}
