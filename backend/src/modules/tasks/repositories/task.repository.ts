import prisma from '../../../config/db';
import { Internship, InternshipTask, InternshipTaskAssignment, InternshipSubmission, InternshipSubmissionReview, TaskPriority, TaskStatus, SubmissionType } from '@prisma/client';

export class TaskRepository {
  // 1. Create Internship (typically triggered by accepted applications)
  async createInternship(data: {
    applicationId: string;
    studentId: string;
    organizationId?: string | null;
    opportunityId: string;
    startDate?: Date;
  }): Promise<Internship> {
    return prisma.internship.create({
      data: {
        applicationId: data.applicationId,
        studentId: data.studentId,
        organizationId: data.organizationId || null,
        opportunityId: data.opportunityId,
        startDate: data.startDate || new Date(),
        status: 'ACTIVE',
      },
    });
  }

  // 2. Find Internship by ID
  async findInternshipById(id: string) {
    return prisma.internship.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            user: true,
          },
        },
        opportunity: true,
        organization: true,
        tasks: {
          include: {
            assignments: true,
            submissions: true,
          },
        },
      },
    });
  }

  // 3. Create Task
  async createTask(data: {
    internshipId: string;
    createdBy: string;
    title: string;
    description: string;
    priority: TaskPriority;
    deadline: Date;
    maxScore: number;
    status: TaskStatus;
  }): Promise<InternshipTask> {
    return prisma.internshipTask.create({
      data: {
        internshipId: data.internshipId,
        createdBy: data.createdBy,
        title: data.title,
        description: data.description,
        priority: data.priority,
        deadline: data.deadline,
        maxScore: data.maxScore,
        status: data.status,
      },
    });
  }

  // 4. Find Task by ID
  async findTaskById(id: string) {
    return prisma.internshipTask.findUnique({
      where: { id },
      include: {
        internship: {
          include: {
            opportunity: true,
          },
        },
        assignments: {
          include: {
            student: {
              include: {
                user: true,
              },
            },
          },
        },
        submissions: {
          include: {
            reviews: true,
          },
          orderBy: { submittedAt: 'desc' },
        },
      },
    });
  }

  // 5. Update Task
  async updateTask(id: string, data: any): Promise<InternshipTask> {
    return prisma.internshipTask.update({
      where: { id },
      data,
    });
  }

  // 6. Assign Task to students
  async assignTask(taskId: string, studentIds: string[]) {
    return prisma.$transaction(async (tx) => {
      // Delete existing assignments if any to avoid duplicates
      await tx.internshipTaskAssignment.deleteMany({
        where: {
          taskId,
          studentId: { in: studentIds },
        },
      });

      // Insert new assignments
      const assignments = await tx.internshipTaskAssignment.createMany({
        data: studentIds.map((studentId) => ({
          taskId,
          studentId,
        })),
      });

      // Update task status to ASSIGNED if it was DRAFT
      const task = await tx.internshipTask.findUnique({ where: { id: taskId } });
      if (task && task.status === 'DRAFT') {
        await tx.internshipTask.update({
          where: { id: taskId },
          data: { status: 'ASSIGNED' },
        });
      }

      return assignments;
    });
  }

  // 7. Submit deliverable
  async createSubmission(
    taskId: string,
    studentId: string,
    data: {
      submissionType: SubmissionType;
      submissionUrl: string;
      remarks?: string | null;
    }
  ): Promise<InternshipSubmission> {
    return prisma.$transaction(async (tx) => {
      const submission = await tx.internshipSubmission.create({
        data: {
          taskId,
          studentId,
          submissionType: data.submissionType,
          submissionUrl: data.submissionUrl,
          remarks: data.remarks || null,
        },
      });

      // Transition task status to SUBMITTED
      await tx.internshipTask.update({
        where: { id: taskId },
        data: { status: 'SUBMITTED' },
      });

      return submission;
    });
  }

  // 8. Find Submission by ID
  async findSubmissionById(id: string) {
    return prisma.internshipSubmission.findUnique({
      where: { id },
      include: {
        task: {
          include: {
            internship: true,
          },
        },
        reviews: true,
      },
    });
  }

  // 9. Review Deliverable
  async createReview(
    submissionId: string,
    reviewerId: string,
    data: {
      score: number;
      feedback?: string | null;
      approve: boolean; // whether review approves the task
    }
  ): Promise<InternshipSubmissionReview> {
    return prisma.$transaction(async (tx) => {
      const review = await tx.internshipSubmissionReview.create({
        data: {
          submissionId,
          reviewerId,
          score: data.score,
          feedback: data.feedback || null,
        },
      });

      const submission = await tx.internshipSubmission.findUnique({
        where: { id: submissionId },
        include: { task: true },
      });

      if (submission) {
        // Transition task status based on approval
        await tx.internshipTask.update({
          where: { id: submission.taskId },
          data: { status: data.approve ? 'APPROVED' : 'REJECTED' },
        });
      }

      return review;
    });
  }

  // 10. List tasks for internship
  async getInternshipTasks(internshipId: string): Promise<InternshipTask[]> {
    return prisma.internshipTask.findMany({
      where: { internshipId },
      include: {
        assignments: true,
        submissions: true,
      },
      orderBy: { deadline: 'asc' },
    });
  }

  // 11. List tasks assigned to a student
  async getStudentTasks(studentId: string): Promise<any[]> {
    return prisma.internshipTaskAssignment.findMany({
      where: { studentId },
      include: {
        task: {
          include: {
            internship: {
              include: {
                opportunity: true,
                organization: true,
              },
            },
          },
        },
      },
      orderBy: { task: { deadline: 'asc' } },
    });
  }

  // 12. List submissions for a student
  async getStudentSubmissions(studentId: string): Promise<InternshipSubmission[]> {
    return prisma.internshipSubmission.findMany({
      where: { studentId },
      include: {
        task: true,
        reviews: true,
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  // 13. Dashboard Metrics
  async getStudentDashboardMetrics(studentId: string) {
    const activeInternships = await prisma.internship.count({
      where: { studentId, status: 'ACTIVE' },
    });

    const taskAssignments = await prisma.internshipTaskAssignment.findMany({
      where: { studentId },
      include: { task: true },
    });

    let assigned = 0;
    let completed = 0;
    let pendingReviews = 0;

    taskAssignments.forEach((a) => {
      const status = a.task.status;
      if (['ASSIGNED', 'IN_PROGRESS'].includes(status)) {
        assigned++;
      } else if (['APPROVED', 'COMPLETED'].includes(status)) {
        completed++;
      } else if (['SUBMITTED', 'UNDER_REVIEW'].includes(status)) {
        pendingReviews++;
      }
    });

    return {
      activeInternships,
      assignedTasks: assigned,
      completedTasks: completed,
      pendingReviews,
    };
  }

  async getOrganizationDashboardMetrics(organizationId: string) {
    const activeInternships = await prisma.internship.count({
      where: { organizationId, status: 'ACTIVE' },
    });

    const internships = await prisma.internship.findMany({
      where: { organizationId },
      include: {
        tasks: true,
      },
    });

    let tasksCreated = 0;
    let completedInternships = 0;
    let totalInternships = internships.length;

    internships.forEach((i) => {
      tasksCreated += i.tasks.length;
      if (i.status === 'COMPLETED') {
        completedInternships++;
      }
    });

    const submissionReviews = await prisma.internshipSubmissionReview.count({
      where: {
        submission: {
          task: {
            internship: {
              organizationId,
            },
          },
        },
      },
    });

    const completionRate = totalInternships > 0 ? parseFloat(((completedInternships / totalInternships) * 100).toFixed(2)) : 0;

    return {
      activeInternships,
      tasksCreated,
      submissionReviews,
      internshipCompletionRate: completionRate,
    };
  }

  async getMentorDashboardMetrics(mentorUserId: string) {
    // Find all internships for opportunities created by this mentor
    const internships = await prisma.internship.findMany({
      where: {
        opportunity: {
          createdBy: mentorUserId,
        },
      },
      include: {
        tasks: {
          include: {
            submissions: {
              include: {
                reviews: true,
              },
            },
          },
        },
      },
    });

    const assignedStudents = new Set(internships.map((i) => i.studentId)).size;

    let pendingReviews = 0;
    internships.forEach((i) => {
      i.tasks.forEach((t) => {
        if (['SUBMITTED', 'UNDER_REVIEW'].includes(t.status)) {
          pendingReviews++;
        }
      });
    });

    // Average scores
    const reviews = await prisma.internshipSubmissionReview.findMany({
      where: {
        reviewerId: mentorUserId,
      },
      select: {
        score: true,
      },
    });

    const totalScore = reviews.reduce((sum, r) => sum + r.score, 0);
    const avgScore = reviews.length > 0 ? parseFloat((totalScore / reviews.length).toFixed(2)) : 0;

    return {
      assignedStudents,
      pendingReviews,
      averageScores: avgScore,
    };
  }
}
