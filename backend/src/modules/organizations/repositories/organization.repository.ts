import prisma from '../../../config/db';
import { Organization, School, Company, OrganizationMember, Subscription, OrganizationBranch } from '@prisma/client';

export class OrganizationRepository {
  // 1. Transaction-safe creation of organization and its specific profile
  async createOrganizationWithProfile(
    userId: string,
    orgData: {
      organizationType: 'SCHOOL' | 'COMPANY';
      name: string;
      email: string;
      phone?: string | null;
      website?: string | null;
      address?: string | null;
      description?: string | null;
    },
    profileData: any
  ): Promise<Organization> {
    return prisma.$transaction(async (tx) => {
      // Create Base Organization
      const org = await tx.organization.create({
        data: {
          userId,
          organizationType: orgData.organizationType,
          name: orgData.name,
          email: orgData.email,
          phone: orgData.phone,
          website: orgData.website,
          address: orgData.address,
          description: orgData.description,
          verificationStatus: 'DRAFT',
          subscriptionPlan: 'STARTER',
        },
      });

      // Create Primary Member Link
      await tx.organizationMember.create({
        data: {
          organizationId: org.id,
          userId,
          role: 'PRIMARY_OWNER',
          isPrimary: true,
        },
      });

      // Create Specific Profile Record
      if (orgData.organizationType === 'SCHOOL') {
        await tx.school.create({
          data: {
            organizationId: org.id,
            institutionType: profileData.institutionType,
            principalName: profileData.principalName,
            studentCount: profileData.studentCount,
          },
        });
      } else {
        await tx.company.create({
          data: {
            organizationId: org.id,
            industry: profileData.industry,
            companySize: profileData.companySize,
            headquarters: profileData.headquarters,
            foundedYear: profileData.foundedYear,
          },
        });
      }

      // Create initial audit log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'ORGANIZATION_CREATED',
          resourceType: 'ORGANIZATION',
          resourceId: org.id,
        },
      });

      return org;
    });
  }

  // 2. Fetch full organization details
  async findOrganizationById(id: string) {
    return prisma.organization.findUnique({
      where: { id },
      include: {
        school: true,
        company: true,
        members: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        subscriptions: {
          orderBy: { createdAt: 'desc' },
        },
        branches: true,
      },
    });
  }

  async findOrganizationByUserId(userId: string) {
    return prisma.organization.findFirst({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        school: true,
        company: true,
        members: true,
        subscriptions: {
          orderBy: { createdAt: 'desc' },
        },
        branches: true,
      },
    });
  }

  // 3. Update organization base fields
  async updateOrganization(id: string, data: any): Promise<Organization> {
    return prisma.organization.update({
      where: { id },
      data,
    });
  }

  // 4. Update school profile specific fields
  async updateSchoolProfile(organizationId: string, data: any): Promise<School> {
    return prisma.school.update({
      where: { organizationId },
      data,
    });
  }

  // 5. Update company profile specific fields
  async updateCompanyProfile(organizationId: string, data: any): Promise<Company> {
    return prisma.company.update({
      where: { organizationId },
      data,
    });
  }

  // 6. Manage Members
  async addMember(organizationId: string, userId: string, role: string): Promise<OrganizationMember> {
    return prisma.organizationMember.create({
      data: {
        organizationId,
        userId,
        role,
        isPrimary: false,
      },
    });
  }

  async findMemberByOrgAndUser(organizationId: string, userId: string): Promise<OrganizationMember | null> {
    return prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId,
      },
    });
  }

  async findMembers(organizationId: string) {
    return prisma.organizationMember.findMany({
      where: { organizationId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  // 7. Manage Subscriptions
  async createSubscription(organizationId: string, data: {
    planName: string;
    startDate: Date;
    endDate: Date;
    status: string;
    amount: number;
    gstAmount: number;
    totalAmount: number;
    gstin?: string | null;
    paymentId?: string | null;
    orderId?: string | null;
  }): Promise<Subscription> {
    return prisma.subscription.create({
      data: {
        organizationId,
        planName: data.planName,
        startDate: data.startDate,
        endDate: data.endDate,
        status: data.status,
        amount: data.amount,
        gstAmount: data.gstAmount,
        totalAmount: data.totalAmount,
        gstin: data.gstin,
        paymentId: data.paymentId,
        orderId: data.orderId,
      },
    });
  }

  async findActiveSubscription(organizationId: string): Promise<Subscription | null> {
    return prisma.subscription.findFirst({
      where: {
        organizationId,
        status: 'ACTIVE',
        endDate: { gte: new Date() },
      },
      orderBy: { endDate: 'desc' },
    });
  }

  // 8. Branches CRUD
  async addBranch(organizationId: string, data: { name: string; location: string; address?: string | null }): Promise<OrganizationBranch> {
    return prisma.organizationBranch.create({
      data: {
        organizationId,
        name: data.name,
        location: data.location,
        address: data.address,
      },
    });
  }

  async findBranches(organizationId: string): Promise<OrganizationBranch[]> {
    return prisma.organizationBranch.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
    });
  }

  // 9. Audit Logging
  async createAuditLog(log: {
    userId?: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    ipAddress?: string;
  }): Promise<void> {
    await prisma.auditLog.create({
      data: log,
    });
  }
}
