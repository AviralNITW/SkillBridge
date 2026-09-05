import { OrganizationRepository } from '../repositories/organization.repository';
import redisClient from '../../../config/redis';
import logger from '../../../config/logger';
import prisma from '../../../config/db';
import { Organization, School, Company, OrganizationMember, Subscription, OrganizationBranch } from '@prisma/client';

export class OrganizationService {
  private orgRepository: OrganizationRepository;

  constructor() {
    this.orgRepository = new OrganizationRepository();
  }

  private async invalidateCache(orgId: string): Promise<void> {
    try {
      await redisClient.del(`organization:${orgId}`);
      await redisClient.del(`organization_dashboard:${orgId}`);
      logger.debug(`Evicted Redis cache keys for organization:${orgId}`);
    } catch (err: any) {
      logger.error(`Redis cache invalidation error: ${err.message}`);
    }
  }

  // 1. Create Organization
  async createOrganization(
    userId: string,
    data: {
      organizationType: 'SCHOOL' | 'COMPANY';
      name: string;
      email: string;
      phone?: string | null;
      website?: string | null;
      address?: string | null;
      description?: string | null;
      
      // School specific
      institutionType?: string;
      principalName?: string | null;
      studentCount?: number | null;

      // Company specific
      industry?: string | null;
      companySize?: string | null;
      headquarters?: string | null;
      foundedYear?: number | null;
    },
    clientIp?: string
  ): Promise<Organization> {
    const orgData = {
      organizationType: data.organizationType,
      name: data.name,
      email: data.email,
      phone: data.phone,
      website: data.website,
      address: data.address,
      description: data.description,
    };

    const profileData = data.organizationType === 'SCHOOL' 
      ? {
          institutionType: data.institutionType || 'SCHOOL',
          principalName: data.principalName,
          studentCount: data.studentCount,
        }
      : {
          industry: data.industry,
          companySize: data.companySize,
          headquarters: data.headquarters,
          foundedYear: data.foundedYear,
        };

    const org = await this.orgRepository.createOrganizationWithProfile(userId, orgData, profileData);
    
    // Invalidate potential list cache for the user
    await redisClient.del(`user_organizations:${userId}`);
    
    return org;
  }

  private async getOrganizationNoCache(id: string): Promise<any> {
    const org = await this.orgRepository.findOrganizationById(id);
    if (!org) {
      const error: any = new Error('Organization not found');
      error.status = 404;
      throw error;
    }
    return org;
  }

  // 2. Retrieve Organization (with caching)
  async getOrganization(id: string): Promise<any> {
    const cacheKey = `organization:${id}`;
    
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        logger.debug(`Serving organization from Redis: ${cacheKey}`);
        return JSON.parse(cached);
      }
    } catch (err: any) {
      logger.error(`Redis read error: ${err.message}`);
    }

    const org = await this.orgRepository.findOrganizationById(id);
    if (!org) {
      const error: any = new Error('Organization not found');
      error.status = 404;
      throw error;
    }

    try {
      await redisClient.set(cacheKey, JSON.stringify(org), { EX: 15 * 60 });
    } catch (err: any) {
      logger.error(`Redis write error: ${err.message}`);
    }

    return org;
  }

  // 3. Update Organization
  async updateOrganization(
    userId: string,
    id: string,
    data: {
      name?: string;
      phone?: string | null;
      website?: string | null;
      address?: string | null;
      description?: string | null;
      linkedinUrl?: string | null;
      
      // Subtype fields
      institutionType?: string;
      principalName?: string | null;
      studentCount?: number | null;
      industry?: string | null;
      companySize?: string | null;
      headquarters?: string | null;
      foundedYear?: number | null;
    },
    clientIp?: string
  ): Promise<any> {
    await this.checkMembership(id, userId);

    const baseData: any = {};
    if (data.name !== undefined) baseData.name = data.name;
    if (data.phone !== undefined) baseData.phone = data.phone;
    if (data.website !== undefined) baseData.website = data.website;
    if (data.address !== undefined) baseData.address = data.address;
    if (data.description !== undefined) baseData.description = data.description;
    if (data.linkedinUrl !== undefined) baseData.linkedinUrl = data.linkedinUrl;

    const org = await this.orgRepository.findOrganizationById(id);
    if (!org) {
      const error: any = new Error('Organization not found');
      error.status = 404;
      throw error;
    }

    // Update base
    if (Object.keys(baseData).length > 0) {
      await this.orgRepository.updateOrganization(id, baseData);
    }

    // Update subtype
    if (org.organizationType === 'SCHOOL') {
      const schoolData: any = {};
      if (data.institutionType !== undefined) schoolData.institutionType = data.institutionType;
      if (data.principalName !== undefined) schoolData.principalName = data.principalName;
      if (data.studentCount !== undefined) schoolData.studentCount = data.studentCount;

      if (Object.keys(schoolData).length > 0) {
        await this.orgRepository.updateSchoolProfile(id, schoolData);
      }
    } else {
      const companyData: any = {};
      if (data.industry !== undefined) companyData.industry = data.industry;
      if (data.companySize !== undefined) companyData.companySize = data.companySize;
      if (data.headquarters !== undefined) companyData.headquarters = data.headquarters;
      if (data.foundedYear !== undefined) companyData.foundedYear = data.foundedYear;

      if (Object.keys(companyData).length > 0) {
        await this.orgRepository.updateCompanyProfile(id, companyData);
      }
    }

    await this.orgRepository.createAuditLog({
      userId,
      action: 'ORGANIZATION_UPDATED',
      resourceType: 'ORGANIZATION',
      resourceId: id,
      ipAddress: clientIp,
    });

    await this.invalidateCache(id);

    return this.getOrganizationNoCache(id);
  }

  // 4. KYC File Upload and Submission Workflow
  async uploadVerificationDoc(userId: string, id: string, documentUrl: string, clientIp?: string): Promise<any> {
    await this.checkMembership(id, userId);

    await this.orgRepository.updateOrganization(id, {
      verificationDocumentUrl: documentUrl,
    });

    await this.orgRepository.createAuditLog({
      userId,
      action: 'KYC_DOCUMENT_UPLOADED',
      resourceType: 'ORGANIZATION',
      resourceId: id,
      ipAddress: clientIp,
    });

    await this.invalidateCache(id);
    return this.getOrganizationNoCache(id);
  }

  async submitVerification(userId: string, id: string, clientIp?: string): Promise<any> {
    await this.checkMembership(id, userId);

    const org = await this.orgRepository.findOrganizationById(id);
    if (!org) {
      const error: any = new Error('Organization not found');
      error.status = 404;
      throw error;
    }

    if (!org.verificationDocumentUrl) {
      const error: any = new Error('KYC verification document must be uploaded first.');
      error.status = 400;
      throw error;
    }

    await this.orgRepository.updateOrganization(id, {
      verificationStatus: 'PENDING',
    });

    await this.orgRepository.createAuditLog({
      userId,
      action: 'VERIFICATION_SUBMITTED',
      resourceType: 'ORGANIZATION',
      resourceId: id,
      ipAddress: clientIp,
    });

    await this.invalidateCache(id);
    return this.getOrganizationNoCache(id);
  }

  // 5. Verify Organization (Admin only)
  async verifyOrganization(
    adminUserId: string,
    id: string,
    status: 'APPROVED' | 'REJECTED' | 'SUSPENDED',
    clientIp?: string
  ): Promise<any> {
    const verified = status === 'APPROVED';

    const org = await this.orgRepository.findOrganizationById(id);
    if (!org) {
      const error: any = new Error('Organization not found');
      error.status = 404;
      throw error;
    }

    await prisma.$transaction(async (tx) => {
      await tx.organization.update({
        where: { id },
        data: {
          verificationStatus: status,
        },
      });

      if (org.organizationType === 'SCHOOL') {
        // Schools don't have separate verified flags but status APPROVED lets them operate
      } else if (org.company) {
        await tx.company.update({
          where: { organizationId: id },
          data: { verified },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: verified ? 'VERIFICATION_APPROVED' : 'VERIFICATION_REJECTED',
          resourceType: 'ORGANIZATION',
          resourceId: id,
          ipAddress: clientIp,
        },
      });
    });

    await this.invalidateCache(id);
    return this.getOrganizationNoCache(id);
  }

  // 6. Manage Team Members
  async addTeamMember(
    userId: string,
    organizationId: string,
    memberEmail: string,
    role: string,
    clientIp?: string
  ): Promise<OrganizationMember> {
    const primaryMember = await this.checkMembership(organizationId, userId);
    if (primaryMember.role !== 'PRIMARY_OWNER') {
      const error: any = new Error('Only the Primary Owner can add team members.');
      error.status = 403;
      throw error;
    }

    const invitee = await prisma.user.findUnique({
      where: { email: memberEmail },
    });
    if (!invitee) {
      const error: any = new Error('Invited user account not found. Register the user first.');
      error.status = 404;
      throw error;
    }

    const existing = await this.orgRepository.findMemberByOrgAndUser(organizationId, invitee.id);
    if (existing) {
      const error: any = new Error('User is already a member of this organization.');
      error.status = 400;
      throw error;
    }

    const member = await this.orgRepository.addMember(organizationId, invitee.id, role);

    await this.orgRepository.createAuditLog({
      userId,
      action: 'TEAM_MEMBER_ADDED',
      resourceType: 'ORGANIZATION',
      resourceId: organizationId,
      ipAddress: clientIp,
    });

    await this.invalidateCache(organizationId);
    return member;
  }

  async getMembers(userId: string, organizationId: string): Promise<any[]> {
    await this.checkMembership(organizationId, userId);
    return this.orgRepository.findMembers(organizationId);
  }

  // 7. Mock Razorpay Payments and GST Billing
  async createPaymentOrder(
    userId: string,
    organizationId: string,
    planName: 'STARTER' | 'GROWTH' | 'ENTERPRISE',
    gstin?: string | null
  ): Promise<any> {
    await this.checkMembership(organizationId, userId);

    let amount = 0;
    if (planName === 'GROWTH') amount = 9999.00;
    else if (planName === 'ENTERPRISE') amount = 39999.00;

    const gstAmount = amount * 0.18; // 18% GST
    const totalAmount = amount + gstAmount;

    // Generate mock order id
    const orderId = `order_org_${Date.now()}_${Math.round(Math.random() * 1e5)}`;

    return {
      success: true,
      planName,
      amount,
      gstAmount,
      totalAmount,
      gstin: gstin || null,
      orderId,
      key: 'rzp_test_mock_key',
    };
  }

  async verifyPayment(
    userId: string,
    organizationId: string,
    data: {
      planName: string;
      amount: number;
      gstAmount: number;
      totalAmount: number;
      gstin?: string | null;
      orderId: string;
      paymentId: string;
      signature: string;
    },
    clientIp?: string
  ): Promise<Subscription> {
    await this.checkMembership(organizationId, userId);

    // Mock validation signature check
    const expectedSignature = `sig_${data.orderId}_${data.paymentId}`;
    if (data.signature !== expectedSignature) {
      const error: any = new Error('Invalid payment signature. Verification failed.');
      error.status = 400;
      throw error;
    }

    const sub = await prisma.$transaction(async (tx) => {
      // Create Subscription record
      const subscription = await tx.subscription.create({
        data: {
          organizationId,
          planName: data.planName,
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 Days expiration
          status: 'ACTIVE',
          amount: data.amount,
          gstAmount: data.gstAmount,
          totalAmount: data.totalAmount,
          gstin: data.gstin || null,
          paymentId: data.paymentId,
          orderId: data.orderId,
        },
      });

      // Elevate plan name in Organization
      await tx.organization.update({
        where: { id: organizationId },
        data: {
          subscriptionPlan: data.planName,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'SUBSCRIPTION_ACTIVATED',
          resourceType: 'ORGANIZATION',
          resourceId: organizationId,
          ipAddress: clientIp,
        },
      });

      return subscription;
    });

    await this.invalidateCache(organizationId);
    return sub;
  }

  // 8. Branches CRUD (Multi-Campus)
  async addBranch(
    userId: string,
    organizationId: string,
    data: { name: string; location: string; address?: string | null },
    clientIp?: string
  ): Promise<OrganizationBranch> {
    await this.checkMembership(organizationId, userId);

    const branch = await this.orgRepository.addBranch(organizationId, data);

    await this.orgRepository.createAuditLog({
      userId,
      action: 'BRANCH_ADDED',
      resourceType: 'ORGANIZATION',
      resourceId: organizationId,
      ipAddress: clientIp,
    });

    await this.invalidateCache(organizationId);
    return branch;
  }

  async getBranches(userId: string, organizationId: string): Promise<OrganizationBranch[]> {
    await this.checkMembership(organizationId, userId);
    return this.orgRepository.findBranches(organizationId);
  }

  // 9. Configure SSO (Enterprise feature check)
  async configureSSO(
    userId: string,
    organizationId: string,
    data: { ssoEnabled: boolean; ssoProvider?: 'SAML' | 'OIDC' | null },
    clientIp?: string
  ): Promise<any> {
    await this.checkMembership(organizationId, userId);

    const org = await this.orgRepository.findOrganizationById(organizationId);
    if (!org) {
      const error: any = new Error('Organization not found');
      error.status = 404;
      throw error;
    }

    // SSO is premium Enterprise plan feature
    if (data.ssoEnabled && org.subscriptionPlan !== 'ENTERPRISE') {
      const error: any = new Error('Enterprise SSO is only available on the ENTERPRISE subscription plan.');
      error.status = 403;
      throw error;
    }

    await this.orgRepository.updateOrganization(organizationId, {
      ssoEnabled: data.ssoEnabled,
      ssoProvider: data.ssoProvider || null,
    });

    await this.orgRepository.createAuditLog({
      userId,
      action: 'SSO_CONFIGURED',
      resourceType: 'ORGANIZATION',
      resourceId: organizationId,
      ipAddress: clientIp,
    });

    await this.invalidateCache(organizationId);
    return this.getOrganizationNoCache(organizationId);
  }

  // 10. Dashboard Metrics Stats
  async getDashboardMetrics(userId: string, organizationId: string): Promise<any> {
    await this.checkMembership(organizationId, userId);
    const cacheKey = `organization_dashboard:${organizationId}`;

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        logger.debug(`Serving dashboard metrics from Redis: ${cacheKey}`);
        return JSON.parse(cached);
      }
    } catch (err: any) {
      logger.error(`Redis read error: ${err.message}`);
    }

    const org = await this.orgRepository.findOrganizationById(organizationId);
    if (!org) {
      const error: any = new Error('Organization not found');
      error.status = 404;
      throw error;
    }

    // 1. Opportunities Posted Count
    const opportunitiesPosted = await prisma.opportunity.count({
      where: { organizationId: org.id },
    });

    // 2. Applications Received Count
    const applicationsReceived = await prisma.application.count({
      where: { opportunity: { organizationId: org.id } },
    });

    // 3. Active Students (Linked to school profile if School)
    const schoolId = org.school?.id;
    const activeStudents = schoolId
      ? await prisma.student.count({ where: { schoolId } })
      : 0;

    // 4. Certificates Issued
    const certificatesIssued = await prisma.certificate.count({
      where: { opportunity: { organizationId: org.id } },
    });

    const metrics = {
      opportunitiesPosted,
      applicationsReceived,
      activeStudents,
      certificatesIssued,
      teamMembers: org.members.length,
      subscriptionPlan: org.subscriptionPlan,
      verificationStatus: org.verificationStatus,
    };

    try {
      await redisClient.set(cacheKey, JSON.stringify(metrics), { EX: 15 * 60 });
    } catch (err: any) {
      logger.error(`Redis write error: ${err.message}`);
    }

    return metrics;
  }

  // Membership validation helper
  private async checkMembership(organizationId: string, userId: string): Promise<OrganizationMember> {
    const member = await this.orgRepository.findMemberByOrgAndUser(organizationId, userId);
    if (!member) {
      const error: any = new Error('Forbidden. You are not a registered member of this organization.');
      error.status = 403;
      throw error;
    }
    return member;
  }
}
