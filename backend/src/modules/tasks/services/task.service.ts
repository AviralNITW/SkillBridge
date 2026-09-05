import { TaskRepository } from '../repositories/task.repository';
import redisClient from '../../../config/redis';
import logger from '../../../config/logger';
import prisma from '../../../config/db';
import { Internship, InternshipTask, InternshipSubmission, InternshipSubmissionReview, TaskPriority, TaskStatus, SubmissionType } from '@prisma/client';
import { uploadSubmissionFile } from '../../../utils/s3';

export class TaskService {
  private taskRepository: TaskRepository;

  constructor() {
    this.taskRepository = new TaskRepository();
  }

  // Invalidate Redis cache keys on mutation
  private async invalidateCache(taskId?: string, internshipId?: string, studentId?: string, submissionId?: string) {
    try {
      if (taskId) await redisClient.del(`task:${taskId}`);
      if (internshipId) await redisClient.del(`internship:${internshipId}`);
      if (studentId) {
        await redisClient.del(`student_tasks:${studentId}`);
        await redisClient.del(`student_dashboard:${studentId}`);
      }
      if (submissionId) await redisClient.del(`submission:${submissionId}`);
      logger.debug(`Evicted task cache keys.`);
    } catch (err: any) {
      logger.error(`Redis cache invalidation error: ${err.message}`);
    }
  }

  // Helper to verify reviewer access for internship
  private async verifyReviewerAccess(internshipId: string, userId: string, role: string): Promise<void> {
    if (role === 'ADMIN') return;

    const internship = await prisma.internship.findUnique({
      where: { id: internshipId },
      include: { opportunity: true },
    });

    if (!internship) {
      const error: any = new Error('Internship not found');
      error.status = 404;
      throw error;
    }

    if (internship.opportunity.createdBy === userId) {
      return;
    }

    if (internship.organizationId) {
      const member = await prisma.organizationMember.findFirst({
        where: {
          organizationId: internship.organizationId,
          userId,
        },
      });
      if (member) return;
    }

    const error: any = new Error('You are not authorized to manage this internship.');
    error.status = 403;
    throw error;
  }

  // Helper to check student access to task
  private async verifyStudentAccess(taskId: string, studentId: string): Promise<void> {
    const assignment = await prisma.internshipTaskAssignment.findUnique({
      where: {
        taskId_studentId: {
          taskId,
          studentId,
        },
      },
    });

    if (!assignment) {
      const error: any = new Error('You are not assigned to this task.');
      error.status = 403;
      throw error;
    }
  }

  // 1. Create Task
  async createTask(
    userId: string,
    role: string,
    data: {
      internshipId: string;
      title: string;
      description: string;
      priority?: TaskPriority;
      deadline: string;
      maxScore?: number;
    }
  ): Promise<InternshipTask> {
    // RBAC: Only COMPANY, MENTOR, ADMIN can create task
    if (!['COMPANY', 'MENTOR', 'ADMIN'].includes(role)) {
      const error: any = new Error('Only companies, mentors, or administrators can create tasks.');
      error.status = 403;
      throw error;
    }

    // Verify access to internship
    await this.verifyReviewerAccess(data.internshipId, userId, role);

    const task = await this.taskRepository.createTask({
      internshipId: data.internshipId,
      createdBy: userId,
      title: data.title,
      description: data.description,
      priority: data.priority || 'MEDIUM',
      deadline: new Date(data.deadline),
      maxScore: data.maxScore || 100,
      status: 'DRAFT',
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'TASK_CREATED',
        resourceType: 'TASK',
        resourceId: task.id,
      },
    });

    await this.invalidateCache(undefined, data.internshipId);

    return task;
  }

  // 2. Assign Task
  async assignTask(
    userId: string,
    role: string,
    taskId: string,
    studentIds: string[]
  ) {
    // RBAC check
    if (!['COMPANY', 'MENTOR', 'ADMIN'].includes(role)) {
      const error: any = new Error('Only companies, mentors, or administrators can assign tasks.');
      error.status = 403;
      throw error;
    }

    const task = await this.taskRepository.findTaskById(taskId);
    if (!task) {
      const error: any = new Error('Task not found');
      error.status = 404;
      throw error;
    }

    await this.verifyReviewerAccess(task.internshipId, userId, role);

    if (task.status === 'COMPLETED' || task.status === 'APPROVED') {
      const error: any = new Error('Cannot assign a completed or approved task.');
      error.status = 400;
      throw error;
    }

    const result = await this.taskRepository.assignTask(taskId, studentIds);

    // Notify students
    for (const studentId of studentIds) {
      try {
        const student = await prisma.student.findUnique({ where: { id: studentId } });
        if (student) {
          await prisma.notification.create({
            data: {
              userId: student.userId,
              title: 'New Task Assigned',
              message: `You have been assigned a new task: "${task.title}".`,
            },
          });
          await this.invalidateCache(taskId, task.internshipId, studentId);
        }
      } catch (err: any) {
        logger.error(`Notification assignment error: ${err.message}`);
      }
    }

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'TASK_ASSIGNED',
        resourceType: 'TASK',
        resourceId: taskId,
      },
    });

    return result;
  }

  // 3. Update Task
  async updateTask(
    userId: string,
    role: string,
    taskId: string,
    data: any
  ): Promise<InternshipTask> {
    if (!['COMPANY', 'MENTOR', 'ADMIN'].includes(role)) {
      const error: any = new Error('Only companies, mentors, or administrators can edit tasks.');
      error.status = 403;
      throw error;
    }

    const task = await this.taskRepository.findTaskById(taskId);
    if (!task) {
      const error: any = new Error('Task not found');
      error.status = 404;
      throw error;
    }

    await this.verifyReviewerAccess(task.internshipId, userId, role);

    // FR-TASK-004: Not Completed, Not Archived
    if (['COMPLETED', 'APPROVED', 'ARCHIVED'].includes(task.status)) {
      const error: any = new Error('Cannot update a completed, approved, or archived task.');
      error.status = 400;
      throw error;
    }

    const payload: any = {};
    if (data.title) payload.title = data.title;
    if (data.description) payload.description = data.description;
    if (data.priority) payload.priority = data.priority;
    if (data.deadline) payload.deadline = new Date(data.deadline);
    if (data.maxScore) payload.maxScore = data.maxScore;

    const updated = await this.taskRepository.updateTask(taskId, payload);

    await this.invalidateCache(taskId, task.internshipId);

    return updated;
  }

  // 4. Submit Task
  async submitTask(
    userId: string,
    role: string,
    taskId: string,
    data: {
      submissionType: SubmissionType;
      submissionUrl?: string | null;
      remarks?: string | null;
    },
    file?: Express.Multer.File
  ): Promise<InternshipSubmission> {
    if (role !== 'STUDENT') {
      const error: any = new Error('Only students can submit tasks.');
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

    const task = await this.taskRepository.findTaskById(taskId);
    if (!task) {
      const error: any = new Error('Task not found.');
      error.status = 404;
      throw error;
    }

    // Verify task assignment
    await this.verifyStudentAccess(taskId, student.id);

    // Verify deadline (FR-TASK-006: Resubmissions before deadline)
    if (new Date(task.deadline) < new Date()) {
      const error: any = new Error('The deadline for this task has passed. Submissions closed.');
      error.status = 400;
      throw error;
    }

    let submissionUrl = data.submissionUrl || '';

    // Handle PDF, DOCX, ZIP, JPG, PNG File Upload via S3 fallback
    if (data.submissionType === 'FILE') {
      if (!file) {
        const error: any = new Error('Submission file is required for type FILE.');
        error.status = 400;
        throw error;
      }
      submissionUrl = await uploadSubmissionFile(file);
    } else {
      if (!submissionUrl) {
        const error: any = new Error('Submission URL/link is required.');
        error.status = 400;
        throw error;
      }
    }

    const submission = await this.taskRepository.createSubmission(taskId, student.id, {
      submissionType: data.submissionType,
      submissionUrl,
      remarks: data.remarks,
    });

    // Notify organization owner/creator
    try {
      await prisma.notification.create({
        data: {
          userId: task.internship.opportunity.createdBy,
          title: 'Task Submission Received',
          message: `Student has submitted work for task "${task.title}".`,
        },
      });
    } catch (err: any) {
      logger.error(`Notification submission error: ${err.message}`);
    }

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'SUBMISSION_UPLOADED',
        resourceType: 'SUBMISSION',
        resourceId: submission.id,
      },
    });

    await this.invalidateCache(taskId, task.internshipId, student.id);

    return submission;
  }

  // 5. Review Submission
  async reviewSubmission(
    userId: string,
    role: string,
    submissionId: string,
    data: {
      score: number;
      feedback?: string | null;
    }
  ): Promise<InternshipSubmissionReview> {
    if (!['COMPANY', 'MENTOR', 'ADMIN'].includes(role)) {
      const error: any = new Error('Only companies, mentors, or administrators can review submissions.');
      error.status = 403;
      throw error;
    }

    const submission = await this.taskRepository.findSubmissionById(submissionId);
    if (!submission) {
      const error: any = new Error('Submission not found.');
      error.status = 404;
      throw error;
    }

    // Verify reviewer has access to the internship
    await this.verifyReviewerAccess(submission.task.internshipId, userId, role);

    const approve = data.score >= (submission.task.maxScore * 0.5); // approve if score >= 50%

    const review = await this.taskRepository.createReview(submissionId, userId, {
      score: data.score,
      feedback: data.feedback,
      approve,
    });

    // Notify student
    try {
      const student = await prisma.student.findUnique({
        where: { id: submission.studentId },
      });
      if (student) {
        await prisma.notification.create({
          data: {
            userId: student.userId,
            title: `Submission Reviewed: ${approve ? 'APPROVED' : 'REJECTED'}`,
            message: `Your submission for task "${submission.task.title}" has been reviewed. Score: ${data.score}/${submission.task.maxScore}. ${data.feedback ? `Feedback: ${data.feedback}` : ''}`,
          },
        });
      }
    } catch (err: any) {
      logger.error(`Notification review error: ${err.message}`);
    }

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'REVIEW_SUBMITTED',
        resourceType: 'REVIEW',
        resourceId: review.id,
      },
    });

    // Check Internship Completion: Mark completed if all tasks are APPROVED
    try {
      const internship = await prisma.internship.findUnique({
        where: { id: submission.task.internshipId },
        include: { tasks: true, student: true },
      });

      if (internship && internship.status === 'ACTIVE') {
        const allApproved = internship.tasks.length > 0 && internship.tasks.every((t) => t.status === 'APPROVED');
        if (allApproved) {
          await prisma.internship.update({
            where: { id: internship.id },
            data: { status: 'COMPLETED', endDate: new Date() },
          });

          logger.info(`[COMPLETION] Internship ${internship.id} marked as COMPLETED.`);

          // Notifications for student
          await prisma.notification.create({
            data: {
              userId: internship.student.userId,
              title: 'Internship Completed!',
              message: `Congratulations! You have completed all required tasks and finished your internship.`,
            },
          });

          // Notification for creator
          const opp = await prisma.opportunity.findUnique({ where: { id: internship.opportunityId } });
          if (opp) {
            await prisma.notification.create({
              data: {
                userId: opp.createdBy,
                title: 'Internship Completed',
                message: `The student has successfully completed their internship deliverables.`,
              },
            });
          }

          // Create Audit Log
          await prisma.auditLog.create({
            data: {
              userId,
              action: 'INTERNSHIP_COMPLETED',
              resourceType: 'INTERNSHIP',
              resourceId: internship.id,
            },
          });
        }
      }
    } catch (completionErr: any) {
      logger.error(`Internship completion job check failed: ${completionErr.message}`);
    }

    await this.invalidateCache(submission.taskId, submission.task.internshipId, submission.studentId, submissionId);

    return review;
  }

  // 6. Get Task Details
  async getTask(userId: string, role: string, taskId: string): Promise<any> {
    const cacheKey = `task:${taskId}`;
    let taskDetails: any = null;

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) taskDetails = JSON.parse(cached);
    } catch (err) {}

    if (!taskDetails) {
      taskDetails = await this.taskRepository.findTaskById(taskId);
      if (!taskDetails) {
        const error: any = new Error('Task not found');
        error.status = 404;
        throw error;
      }
      try {
        await redisClient.set(cacheKey, JSON.stringify(taskDetails), { EX: 15 * 60 });
      } catch (err) {}
    }

    // Security check
    const isStudent = role === 'STUDENT';
    if (isStudent) {
      const student = await prisma.student.findUnique({ where: { userId } });
      if (!student) {
        const error: any = new Error('Student profile not found');
        error.status = 404;
        throw error;
      }
      await this.verifyStudentAccess(taskId, student.id);
    } else {
      await this.verifyReviewerAccess(taskDetails.internshipId, userId, role);
    }

    return taskDetails;
  }

  // 7. Get Internship Tasks
  async getInternshipTasks(userId: string, role: string, internshipId: string): Promise<InternshipTask[]> {
    const cacheKey = `internship:${internshipId}`;
    let tasks: InternshipTask[] | null = null;

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) tasks = JSON.parse(cached);
    } catch (err) {}

    if (!tasks) {
      tasks = await this.taskRepository.getInternshipTasks(internshipId);
      try {
        await redisClient.set(cacheKey, JSON.stringify(tasks), { EX: 15 * 60 });
      } catch (err) {}
    }

    // Security check
    if (role === 'STUDENT') {
      const student = await prisma.student.findUnique({ where: { userId } });
      if (!student) {
        const error: any = new Error('Student profile not found');
        error.status = 404;
        throw error;
      }
      // Student must belong to this internship
      const internship = await prisma.internship.findUnique({ where: { id: internshipId } });
      if (!internship || internship.studentId !== student.id) {
        const error: any = new Error('Access denied to this internship.');
        error.status = 403;
        throw error;
      }
    } else {
      await this.verifyReviewerAccess(internshipId, userId, role);
    }

    return tasks || [];
  }

  // 8. Get Student Tasks
  async getStudentTasks(userId: string, role: string): Promise<any[]> {
    if (role !== 'STUDENT') {
      const error: any = new Error('Only students can view their assigned tasks.');
      error.status = 403;
      throw error;
    }

    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student) {
      const error: any = new Error('Student profile not found');
      error.status = 404;
      throw error;
    }

    const cacheKey = `student_tasks:${student.id}`;
    let tasks: any[] | null = null;

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) tasks = JSON.parse(cached);
    } catch (err) {}

    if (!tasks) {
      tasks = await this.taskRepository.getStudentTasks(student.id);
      try {
        await redisClient.set(cacheKey, JSON.stringify(tasks), { EX: 15 * 60 });
      } catch (err) {}
    }

    return tasks || [];
  }

  // 9. Get Student Submissions
  async getStudentSubmissions(userId: string, role: string): Promise<InternshipSubmission[]> {
    if (role !== 'STUDENT') {
      const error: any = new Error('Only students can retrieve their submissions.');
      error.status = 403;
      throw error;
    }

    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student) {
      const error: any = new Error('Student profile not found');
      error.status = 404;
      throw error;
    }

    return this.taskRepository.getStudentSubmissions(student.id);
  }

  // 10. Dashboard Metrics
  async getDashboardMetrics(
    userId: string,
    role: string,
    target: { studentId?: string; organizationId?: string }
  ) {
    if (role === 'STUDENT') {
      const student = await prisma.student.findUnique({ where: { userId } });
      if (!student || (target.studentId && target.studentId !== student.id)) {
        const error: any = new Error('Unauthorized dashboard metrics access.');
        error.status = 403;
        throw error;
      }
      return this.taskRepository.getStudentDashboardMetrics(student.id);
    }

    if (role === 'COMPANY') {
      if (!target.organizationId) {
        const error: any = new Error('Organization ID is required.');
        error.status = 400;
        throw error;
      }
      // Check org membership
      const member = await prisma.organizationMember.findFirst({
        where: {
          organizationId: target.organizationId,
          userId,
        },
      });
      if (!member) {
        const error: any = new Error('Access denied to organization dashboard.');
        error.status = 403;
        throw error;
      }
      return this.taskRepository.getOrganizationDashboardMetrics(target.organizationId);
    }

    if (role === 'MENTOR') {
      return this.taskRepository.getMentorDashboardMetrics(userId);
    }

    if (role === 'ADMIN') {
      if (target.studentId) return this.taskRepository.getStudentDashboardMetrics(target.studentId);
      if (target.organizationId) return this.taskRepository.getOrganizationDashboardMetrics(target.organizationId);
    }

    const error: any = new Error('Invalid dashboard queries.');
    error.status = 400;
    throw error;
  }
}
