import prisma from '../../../config/db';
import { Opportunity, OpportunitySkill, OpportunityTag, OpportunityBookmark, OpportunityView, OpportunityStatus } from '@prisma/client';

export class OpportunityRepository {
  // 1. Transaction-safe creation of Opportunity with skills and tags
  async createOpportunity(
    createdBy: string,
    organizationId: string | null,
    data: {
      title: string;
      slug: string;
      description: string;
      category: string;
      mode: string;
      location?: string | null;
      durationWeeks?: number | null;
      stipend?: number | null;
      currency?: string | null;
      openings?: number | null;
      deadline: Date;
      status: OpportunityStatus;
      skillsRequired: string[];
      tags?: string[];
    }
  ): Promise<any> {
    return prisma.$transaction(async (tx) => {
      // Create Base Opportunity
      const opp = await tx.opportunity.create({
        data: {
          organizationId,
          createdBy,
          title: data.title,
          slug: data.slug,
          description: data.description,
          category: data.category,
          mode: data.mode,
          location: data.location || null,
          durationWeeks: data.durationWeeks || null,
          stipend: data.stipend !== undefined ? data.stipend : null,
          currency: data.currency || 'INR',
          openings: data.openings || 1,
          status: data.status,
          deadline: data.deadline,
        },
      });

      // Insert Skills
      if (data.skillsRequired && data.skillsRequired.length > 0) {
        await tx.opportunitySkill.createMany({
          data: data.skillsRequired.map((skill) => ({
            opportunityId: opp.id,
            skillName: skill,
          })),
        });
      }

      // Insert Tags
      if (data.tags && data.tags.length > 0) {
        await tx.opportunityTag.createMany({
          data: data.tags.map((tag) => ({
            opportunityId: opp.id,
            tagName: tag,
          })),
        });
      }

      // Create Audit Log
      await tx.auditLog.create({
        data: {
          userId: createdBy,
          action: 'OPPORTUNITY_CREATED',
          resourceType: 'OPPORTUNITY',
          resourceId: opp.id,
        },
      });

      return tx.opportunity.findUnique({
        where: { id: opp.id },
        include: {
          skills: true,
          tags: true,
        },
      });
    });
  }

  // 2. Retrieve details
  async findOpportunityById(id: string) {
    return prisma.opportunity.findUnique({
      where: { id },
      include: {
        skills: true,
        tags: true,
        organization: {
          include: {
            company: true,
            school: true,
            members: true,
          },
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        bookmarks: true,
        views: true,
      },
    });
  }

  async findOpportunityBySlug(slug: string) {
    return prisma.opportunity.findUnique({
      where: { slug },
      include: {
        skills: true,
        tags: true,
        organization: {
          include: {
            company: true,
            school: true,
          },
        },
        creator: {
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

  // 3. Update Opportunity (with skills/tags replacement)
  async updateOpportunity(
    id: string,
    userId: string,
    data: {
      title?: string;
      description?: string;
      category?: string;
      mode?: string;
      location?: string | null;
      durationWeeks?: number | null;
      stipend?: number | null;
      currency?: string;
      openings?: number;
      deadline?: Date;
      status?: OpportunityStatus;
      skillsRequired?: string[];
      tags?: string[];
    }
  ): Promise<any> {
    return prisma.$transaction(async (tx) => {
      // Exclude skills and tags from base update
      const { skillsRequired, tags, ...baseUpdate } = data;

      const opp = await tx.opportunity.update({
        where: { id },
        data: baseUpdate,
      });

      // Update skills if provided
      if (skillsRequired !== undefined) {
        await tx.opportunitySkill.deleteMany({ where: { opportunityId: id } });
        if (skillsRequired.length > 0) {
          await tx.opportunitySkill.createMany({
            data: skillsRequired.map((skill) => ({
              opportunityId: id,
              skillName: skill,
            })),
          });
        }
      }

      // Update tags if provided
      if (tags !== undefined) {
        await tx.opportunityTag.deleteMany({ where: { opportunityId: id } });
        if (tags.length > 0) {
          await tx.opportunityTag.createMany({
            data: tags.map((tag) => ({
              opportunityId: id,
              tagName: tag,
            })),
          });
        }
      }

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'OPPORTUNITY_UPDATED',
          resourceType: 'OPPORTUNITY',
          resourceId: id,
        },
      });

      return tx.opportunity.findUnique({
        where: { id },
        include: {
          skills: true,
          tags: true,
        },
      });
    });
  }

  // 4. Archive Opportunity
  async archiveOpportunity(id: string, userId: string): Promise<Opportunity> {
    const opp = await prisma.opportunity.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'OPPORTUNITY_ARCHIVED',
        resourceType: 'OPPORTUNITY',
        resourceId: id,
      },
    });

    return opp;
  }

  // 5. Search & Filters
  async searchOpportunities(
    filters: {
      search?: string;
      category?: string;
      mode?: string;
      location?: string;
      paid?: boolean;
      durationWeeksMax?: number;
      skills?: string[];
      tags?: string[];
    },
    pagination: { skip: number; take: number }
  ) {
    const where: any = {
      // Exclude DRAFT and ARCHIVED from public searches
      status: {
        in: ['PUBLISHED', 'APPLICATIONS_OPEN'],
      },
    };

    if (filters.category) {
      where.category = filters.category.toUpperCase();
    }

    if (filters.mode) {
      where.mode = filters.mode.toLowerCase();
    }

    if (filters.location) {
      where.location = {
        contains: filters.location,
        mode: 'insensitive',
      };
    }

    if (filters.paid !== undefined) {
      if (filters.paid) {
        where.stipend = { gt: 0 };
      } else {
        where.OR = [
          { stipend: null },
          { stipend: 0 },
        ];
      }
    }

    if (filters.durationWeeksMax) {
      where.durationWeeks = { lte: filters.durationWeeksMax };
    }

    // Dynamic AND filter for multiple skills or tags if specified
    const andConditions: any[] = [];

    if (filters.skills && filters.skills.length > 0) {
      andConditions.push({
        skills: {
          some: {
            skillName: {
              in: filters.skills,
              mode: 'insensitive',
            },
          },
        },
      });
    }

    if (filters.tags && filters.tags.length > 0) {
      andConditions.push({
        tags: {
          some: {
            tagName: {
              in: filters.tags,
              mode: 'insensitive',
            },
          },
        },
      });
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      andConditions.push({
        OR: [
          { title: { contains: searchLower, mode: 'insensitive' } },
          { description: { contains: searchLower, mode: 'insensitive' } },
          {
            skills: {
              some: {
                skillName: { contains: searchLower, mode: 'insensitive' },
              },
            },
          },
          {
            tags: {
              some: {
                tagName: { contains: searchLower, mode: 'insensitive' },
              },
            },
          },
          {
            organization: {
              name: { contains: searchLower, mode: 'insensitive' },
            },
          },
        ],
      });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    const [total, items] = await Promise.all([
      prisma.opportunity.count({ where }),
      prisma.opportunity.findMany({
        where,
        include: {
          skills: true,
          tags: true,
          organization: {
            select: {
              id: true,
              name: true,
              email: true,
              website: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
    ]);

    return { total, items };
  }

  // 6. Bookmarks Management
  async findBookmark(studentId: string, opportunityId: string): Promise<OpportunityBookmark | null> {
    return prisma.opportunityBookmark.findUnique({
      where: {
        studentId_opportunityId: {
          studentId,
          opportunityId,
        },
      },
    });
  }

  async addBookmark(studentId: string, opportunityId: string, userId: string): Promise<OpportunityBookmark> {
    const bookmark = await prisma.opportunityBookmark.create({
      data: {
        studentId,
        opportunityId,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'OPPORTUNITY_BOOKMARKED',
        resourceType: 'OPPORTUNITY',
        resourceId: opportunityId,
      },
    });

    return bookmark;
  }

  async removeBookmark(studentId: string, opportunityId: string, userId: string): Promise<void> {
    await prisma.opportunityBookmark.delete({
      where: {
        studentId_opportunityId: {
          studentId,
          opportunityId,
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'OPPORTUNITY_UNBOOKMARKED',
        resourceType: 'OPPORTUNITY',
        resourceId: opportunityId,
      },
    });
  }

  async getStudentBookmarks(studentId: string) {
    return prisma.opportunityBookmark.findMany({
      where: { studentId },
      include: {
        opportunity: {
          include: {
            skills: true,
            tags: true,
            organization: true,
          },
        },
      },
    });
  }

  // 7. Track Views (Analytics)
  async recordView(studentId: string | null, opportunityId: string): Promise<OpportunityView> {
    const view = await prisma.opportunityView.create({
      data: {
        studentId,
        opportunityId,
      },
    });

    if (studentId) {
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        select: { userId: true },
      });
      if (student) {
        await prisma.auditLog.create({
          data: {
            userId: student.userId,
            action: 'OPPORTUNITY_VIEWED',
            resourceType: 'OPPORTUNITY',
            resourceId: opportunityId,
          },
        });
      }
    }

    return view;
  }

  // 8. Creator Dashboard
  async findMyOpportunities(createdBy: string) {
    return prisma.opportunity.findMany({
      where: { createdBy },
      include: {
        skills: true,
        tags: true,
        applications: true,
        _count: {
          select: {
            views: true,
            bookmarks: true,
            applications: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 9. All Active Opportunities (for Recommendation Scoring)
  async findAllActive() {
    return prisma.opportunity.findMany({
      where: {
        status: {
          in: ['PUBLISHED', 'APPLICATIONS_OPEN'],
        },
      },
      include: {
        skills: true,
        tags: true,
      },
    });
  }

  // 10. Background jobs support
  async closeExpiredOpportunities(): Promise<number> {
    const now = new Date();
    const result = await prisma.opportunity.updateMany({
      where: {
        deadline: { lt: now },
        status: {
          in: ['PUBLISHED', 'APPLICATIONS_OPEN'],
        },
      },
      data: {
        status: 'CLOSED',
      },
    });
    return result.count;
  }
}
