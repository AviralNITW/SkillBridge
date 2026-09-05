import { OpportunityRepository } from '../repositories/opportunity.repository';
import redisClient from '../../../config/redis';
import logger from '../../../config/logger';
import prisma from '../../../config/db';
import { Opportunity, OpportunityStatus } from '@prisma/client';

export class OpportunityService {
  private oppRepository: OpportunityRepository;

  constructor() {
    this.oppRepository = new OpportunityRepository();
  }

  // Helper to generate slug from title
  private generateSlug(title: string): string {
    const cleanTitle = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
    return `${cleanTitle}-${Date.now()}-${Math.round(Math.random() * 1e4)}`;
  }

  // Helper to invalidate Redis cache keys on mutations
  private async invalidateCache(oppId?: string): Promise<void> {
    try {
      if (oppId) {
        await redisClient.del(`opportunity:${oppId}`);
      }
      
      // Invalidate all cached searches
      const searchKeys = await redisClient.keys('opportunity_search:*');
      if (searchKeys.length > 0) {
        await redisClient.del(searchKeys);
      }

      await redisClient.del('featured_opportunities');
      logger.debug(`Evicted Redis cache for opportunity:${oppId || 'all_searches'}`);
    } catch (err: any) {
      logger.error(`Redis cache invalidation error: ${err.message}`);
    }
  }

  // 1. Create Opportunity (Draft or Published depending on request)
  async createOpportunity(
    userId: string,
    userRole: string,
    data: any,
    publishImmediately: boolean = false
  ): Promise<any> {
    // RBAC: Only COMPANY, MENTOR or ADMIN can create
    if (!['COMPANY', 'MENTOR', 'ADMIN'].includes(userRole)) {
      const error: any = new Error('Only companies, mentors, or administrators can create opportunities.');
      error.status = 403;
      throw error;
    }

    // Retrieve active organization if Company
    let organizationId: string | null = null;
    if (userRole === 'COMPANY') {
      const member = await prisma.organizationMember.findFirst({
        where: { userId },
        include: { organization: true },
      });

      if (!member) {
        const error: any = new Error('You must be a member of a registered organization to post opportunities.');
        error.status = 403;
        throw error;
      }
      organizationId = member.organizationId;
    }

    // Slug generation
    const slug = this.generateSlug(data.title);

    // Initial Status
    let status: OpportunityStatus = 'DRAFT';
    if (publishImmediately) {
      // Enforce verification check to publish immediately
      await this.verifyPublisherVerification(userId, userRole, organizationId);
      status = 'PUBLISHED';
    }

    const payload = {
      ...data,
      slug,
      status,
      deadline: new Date(data.deadline),
    };

    const opp = await this.oppRepository.createOpportunity(userId, organizationId, payload);
    await this.invalidateCache();
    return opp;
  }

  // Helper to check verification status of Company or Mentor
  private async verifyPublisherVerification(userId: string, role: string, organizationId: string | null): Promise<void> {
    if (role === 'ADMIN') return; // Admins skip verification check

    if (role === 'COMPANY' && organizationId) {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
      });
      if (!org || org.verificationStatus !== 'APPROVED') {
        const error: any = new Error('Only verified organizations can publish opportunities.');
        error.status = 403;
        throw error;
      }
    } else if (role === 'MENTOR') {
      const mentor = await prisma.mentor.findUnique({
        where: { userId },
      });
      if (!mentor || !mentor.verified) {
        const error: any = new Error('Only verified mentors can publish opportunities.');
        error.status = 403;
        throw error;
      }
    }
  }

  // 2. Publish Opportunity (Draft -> Published)
  async publishOpportunity(userId: string, userRole: string, id: string): Promise<any> {
    const opp = await this.oppRepository.findOpportunityById(id);
    if (!opp) {
      const error: any = new Error('Opportunity not found');
      error.status = 404;
      throw error;
    }

    // Ownership check
    await this.checkOwnership(opp, userId, userRole);

    if (opp.status === 'ARCHIVED') {
      const error: any = new Error('Archived opportunities cannot be published.');
      error.status = 400;
      throw error;
    }

    // Verify publisher is verified
    await this.verifyPublisherVerification(opp.createdBy, userRole, opp.organizationId);

    const updated = await this.oppRepository.updateOpportunity(id, userId, {
      status: 'PUBLISHED',
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'OPPORTUNITY_PUBLISHED',
        resourceType: 'OPPORTUNITY',
        resourceId: id,
      },
    });

    await this.invalidateCache(id);
    return updated;
  }

  // 3. Update Opportunity
  async updateOpportunity(userId: string, userRole: string, id: string, data: any): Promise<any> {
    const opp = await this.oppRepository.findOpportunityById(id);
    if (!opp) {
      const error: any = new Error('Opportunity not found');
      error.status = 404;
      throw error;
    }

    // Ownership check
    await this.checkOwnership(opp, userId, userRole);

    // Block updates to Closed or Archived
    if (opp.status === 'CLOSED' || opp.status === 'ARCHIVED') {
      const error: any = new Error('Cannot update closed or archived opportunities.');
      error.status = 400;
      throw error;
    }

    const payload: any = { ...data };
    if (data.deadline) {
      payload.deadline = new Date(data.deadline);
    }
    if (payload.currency === null || payload.currency === undefined) {
      delete payload.currency;
    }
    if (payload.openings === null || payload.openings === undefined) {
      delete payload.openings;
    }

    const updated = await this.oppRepository.updateOpportunity(id, userId, payload);
    await this.invalidateCache(id);
    return updated;
  }

  // 4. Archive Opportunity
  async archiveOpportunity(userId: string, userRole: string, id: string): Promise<any> {
    const opp = await this.oppRepository.findOpportunityById(id);
    if (!opp) {
      const error: any = new Error('Opportunity not found');
      error.status = 404;
      throw error;
    }

    await this.checkOwnership(opp, userId, userRole);

    const updated = await this.oppRepository.archiveOpportunity(id, userId);
    await this.invalidateCache(id);
    return updated;
  }

  // 5. Get Opportunity Details (with Caching and View recording)
  async getOpportunity(id: string, requestUserId?: string, requestUserRole?: string): Promise<any> {
    const cacheKey = `opportunity:${id}`;

    // Read cache
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        logger.debug(`Serving opportunity details from Redis: ${cacheKey}`);
        const opp = JSON.parse(cached);
        await this.recordViewIfStudent(requestUserId, requestUserRole, id);
        return opp;
      }
    } catch (err: any) {
      logger.error(`Redis read error: ${err.message}`);
    }

    // Fetch DB
    const opp = await this.oppRepository.findOpportunityById(id);
    if (!opp) {
      const error: any = new Error('Opportunity not found');
      error.status = 404;
      throw error;
    }

    // Hide draft or archived listings from public / students
    if (['DRAFT', 'ARCHIVED'].includes(opp.status) && requestUserRole !== 'ADMIN') {
      const hasAccess = requestUserId && (
        opp.createdBy === requestUserId || 
        opp.organization?.members?.some((m: any) => m.userId === requestUserId)
      );

      if (!hasAccess) {
        const error: any = new Error('Access denied to unpublished or archived opportunity.');
        error.status = 403;
        throw error;
      }
    }

    // Write cache
    try {
      await redisClient.set(cacheKey, JSON.stringify(opp), { EX: 30 * 60 }); // 30 mins
    } catch (err: any) {
      logger.error(`Redis write error: ${err.message}`);
    }

    await this.recordViewIfStudent(requestUserId, requestUserRole, id);
    return opp;
  }

  private async recordViewIfStudent(userId?: string, role?: string, opportunityId?: string): Promise<void> {
    if (userId && role === 'STUDENT' && opportunityId) {
      const student = await prisma.student.findUnique({
        where: { userId },
      });
      if (student) {
        await this.oppRepository.recordView(student.id, opportunityId);
      }
    }
  }

  // 6. Search Opportunities with Filter Caching
  async searchOpportunities(filters: any): Promise<any> {
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;
    const skip = (page - 1) * limit;

    // Serialize filters for Redis Cache Key
    const cacheParams = {
      search: filters.search || '',
      category: filters.category || '',
      mode: filters.mode || '',
      location: filters.location || '',
      paid: filters.paid !== undefined ? String(filters.paid) : '',
      durationWeeksMax: filters.durationWeeksMax || '',
      skills: filters.skills ? (Array.isArray(filters.skills) ? filters.skills.sort().join(',') : filters.skills) : '',
      tags: filters.tags ? (Array.isArray(filters.tags) ? filters.tags.sort().join(',') : filters.tags) : '',
      page: String(page),
      limit: String(limit),
    };
    const cacheKey = `opportunity_search:${JSON.stringify(cacheParams)}`;

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        logger.debug(`Serving opportunity search results from Redis: ${cacheKey}`);
        return JSON.parse(cached);
      }
    } catch (err: any) {
      logger.error(`Redis read error: ${err.message}`);
    }

    // Construct filter payloads
    const queryFilters: any = {
      search: filters.search,
      category: filters.category,
      mode: filters.mode,
      location: filters.location,
      durationWeeksMax: filters.durationWeeksMax ? parseInt(filters.durationWeeksMax) : undefined,
    };

    if (filters.paid !== undefined) {
      queryFilters.paid = filters.paid === 'true' || filters.paid === true;
    }

    if (filters.skills) {
      queryFilters.skills = Array.isArray(filters.skills) ? filters.skills : [filters.skills];
    }

    if (filters.tags) {
      queryFilters.tags = Array.isArray(filters.tags) ? filters.tags : [filters.tags];
    }

    const result = await this.oppRepository.searchOpportunities(queryFilters, { skip, take: limit });

    try {
      await redisClient.set(cacheKey, JSON.stringify(result), { EX: 10 * 60 }); // 10 mins TTL
    } catch (err: any) {
      logger.error(`Redis write error: ${err.message}`);
    }

    return result;
  }

  // 7. Bookmarks Management
  async toggleBookmark(userId: string, opportunityId: string, action: 'ADD' | 'REMOVE'): Promise<any> {
    const student = await prisma.student.findUnique({
      where: { userId },
    });
    if (!student) {
      const error: any = new Error('Only registered students can bookmark opportunities.');
      error.status = 403;
      throw error;
    }

    const opp = await this.oppRepository.findOpportunityById(opportunityId);
    if (!opp) {
      const error: any = new Error('Opportunity not found');
      error.status = 404;
      throw error;
    }

    const existing = await this.oppRepository.findBookmark(student.id, opportunityId);

    if (action === 'ADD') {
      if (existing) {
        return existing;
      }
      return this.oppRepository.addBookmark(student.id, opportunityId, userId);
    } else {
      if (!existing) {
        return;
      }
      await this.oppRepository.removeBookmark(student.id, opportunityId, userId);
    }
  }

  async getMyBookmarks(userId: string): Promise<any[]> {
    const student = await prisma.student.findUnique({
      where: { userId },
    });
    if (!student) {
      const error: any = new Error('Only registered students can view bookmarks.');
      error.status = 403;
      throw error;
    }
    return this.oppRepository.getStudentBookmarks(student.id);
  }

  // 8. Creator Dashboard or Student Bookmarks
  async getMyOpportunities(userId: string, role: string): Promise<any[]> {
    if (role === 'STUDENT') {
      return this.getMyBookmarks(userId);
    }
    return this.oppRepository.findMyOpportunities(userId);
  }

  // 9. Recommendations Engine (MVP Scoring Logic)
  async getRecommendations(userId: string): Promise<any[]> {
    const student = await prisma.student.findUnique({
      where: { userId },
      include: {
        skills: true,
        education: true,
        applications: {
          include: {
            opportunity: true,
          },
        },
        bookmarks: {
          include: {
            opportunity: true,
          },
        },
      },
    });

    if (!student) {
      const error: any = new Error('Only students can fetch recommendations.');
      error.status = 403;
      throw error;
    }

    const opportunities = await this.oppRepository.findAllActive();
    const recommendations: any[] = [];

    // Pre-calculate user matching components
    const studentSkills = student.skills.map((s) => s.skillName.toLowerCase());
    
    // Categories student has applied or bookmarked
    const appCategories = student.applications.map((a) => a.opportunity.category.toUpperCase());
    const bookCategories = student.bookmarks.map((b) => b.opportunity.category.toUpperCase());
    const preferredCategories = new Set([...appCategories, ...bookCategories]);

    // Student fields of study / education spec
    const studySpecs = student.education.map((e) => e.specialization.toLowerCase());

    for (const opp of opportunities) {
      let matchingScore = 0;

      // 1. Skill Match (60% weight)
      const oppSkills = opp.skills.map((s) => s.skillName.toLowerCase());
      let skillMatchScore = 0;
      if (oppSkills.length === 0) {
        skillMatchScore = 60;
      } else {
        const intersection = oppSkills.filter((skill) => studentSkills.includes(skill));
        skillMatchScore = (intersection.length / oppSkills.length) * 60;
      }
      matchingScore += skillMatchScore;

      // 2. Category Match (20% weight)
      let categoryMatchScore = 0;
      const oppCategory = opp.category.toUpperCase();
      
      const hasInterest = preferredCategories.has(oppCategory);
      const isRelatedToStudy = studySpecs.some((spec) => spec.includes(oppCategory.toLowerCase()) || oppCategory.toLowerCase().includes(spec));

      if (hasInterest || isRelatedToStudy) {
        categoryMatchScore = 20;
      }
      matchingScore += categoryMatchScore;

      // 3. Location Match (20% weight)
      let locationMatchScore = 0;
      if (opp.mode.toLowerCase() === 'remote') {
        locationMatchScore = 20;
      } else if (opp.location) {
        const oppLoc = opp.location.toLowerCase();
        
        // Search inside bio or school info if institutions match locations
        const inBio = student.bio && student.bio.toLowerCase().includes(oppLoc);
        
        // Match against location in past applications/bookmarks
        const appliedInLoc = student.applications.some((a) => a.opportunity.location && a.opportunity.location.toLowerCase().includes(oppLoc));
        
        if (inBio || appliedInLoc) {
          locationMatchScore = 20;
        } else {
          locationMatchScore = 10; // Partial default match score for onsite/hybrid listings
        }
      } else {
        locationMatchScore = 10;
      }
      matchingScore += locationMatchScore;

      recommendations.push({
        ...opp,
        matchingScore: parseFloat(matchingScore.toFixed(2)),
      });
    }

    // Sort by matching score desc
    return recommendations.sort((a, b) => b.matchingScore - a.matchingScore);
  }

  // 10. Background jobs runner
  async closeExpired(): Promise<number> {
    const closedCount = await this.oppRepository.closeExpiredOpportunities();
    if (closedCount > 0) {
      await this.invalidateCache();
    }
    return closedCount;
  }

  // Ownership verification helper
  private async checkOwnership(opp: any, userId: string, userRole: string): Promise<void> {
    if (userRole === 'ADMIN') return;

    const isCreator = opp.createdBy === userId;
    let isOrgMember = false;

    if (opp.organizationId) {
      const member = await prisma.organizationMember.findFirst({
        where: {
          organizationId: opp.organizationId,
          userId,
        },
      });
      if (member) isOrgMember = true;
    }

    if (!isCreator && !isOrgMember) {
      const error: any = new Error('Forbidden. You do not have permissions to manage this opportunity.');
      error.status = 403;
      throw error;
    }
  }
}
