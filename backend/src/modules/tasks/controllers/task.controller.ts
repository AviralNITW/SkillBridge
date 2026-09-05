import { Response, NextFunction } from 'express';
import { TaskService } from '../services/task.service';
import { AuthenticatedRequest } from '../../auth/middlewares/auth.middleware';
import {
  CreateTaskSchema,
  AssignTaskSchema,
  UpdateTaskSchema,
  SubmitTaskSchema,
  ReviewSubmissionSchema,
} from '../validators/task.validator';

const taskService = new TaskService();

export class TaskController {
  // 1. Create Task (Draft status)
  async createTask(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = CreateTaskSchema.parse(req.body);
      const task = await taskService.createTask(req.user!.id, req.user!.role, validated);

      res.status(201).json({
        success: true,
        message: 'Task created successfully as draft.',
        data: task,
      });
    } catch (error) {
      next(error);
    }
  }

  // 2. Assign Task to Students
  async assignTask(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { studentIds } = AssignTaskSchema.parse(req.body);

      const result = await taskService.assignTask(req.user!.id, req.user!.role, id, studentIds);

      res.status(200).json({
        success: true,
        message: 'Task assigned successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // 3. Update Task
  async updateTask(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const validated = UpdateTaskSchema.parse(req.body);

      const task = await taskService.updateTask(req.user!.id, req.user!.role, id, validated);

      res.status(200).json({
        success: true,
        message: 'Task updated successfully.',
        data: task,
      });
    } catch (error) {
      next(error);
    }
  }

  // 4. Get Task Details
  async getTask(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const task = await taskService.getTask(req.user!.id, req.user!.role, id);

      res.status(200).json({
        success: true,
        data: task,
      });
    } catch (error) {
      next(error);
    }
  }

  // 5. Get Tasks for a specific Internship
  async getInternshipTasks(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { internshipId } = req.params;
      const tasks = await taskService.getInternshipTasks(req.user!.id, req.user!.role, internshipId);

      res.status(200).json({
        success: true,
        data: tasks,
      });
    } catch (error) {
      next(error);
    }
  }

  // 6. Submit deliverables for a Task
  async submitTask(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const validated = SubmitTaskSchema.parse(req.body);

      const submission = await taskService.submitTask(
        req.user!.id,
        req.user!.role,
        id,
        validated,
        req.file
      );

      res.status(201).json({
        success: true,
        message: 'Deliverables submitted successfully.',
        data: submission,
      });
    } catch (error) {
      next(error);
    }
  }

  // 7. Review Deliverables
  async reviewSubmission(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { submissionId } = req.params;
      const validated = ReviewSubmissionSchema.parse(req.body);

      const review = await taskService.reviewSubmission(
        req.user!.id,
        req.user!.role,
        submissionId,
        validated
      );

      res.status(201).json({
        success: true,
        message: 'Submission reviewed successfully.',
        data: review,
      });
    } catch (error) {
      next(error);
    }
  }

  // 8. Get my assigned tasks (Student)
  async getMyTasks(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tasks = await taskService.getStudentTasks(req.user!.id, req.user!.role);

      res.status(200).json({
        success: true,
        data: tasks,
      });
    } catch (error) {
      next(error);
    }
  }

  // 9. Get my submissions (Student)
  async getMySubmissions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const submissions = await taskService.getStudentSubmissions(req.user!.id, req.user!.role);

      res.status(200).json({
        success: true,
        data: submissions,
      });
    } catch (error) {
      next(error);
    }
  }

  // 10. Dashboard Analytics Metrics
  async getDashboardMetrics(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { studentId, organizationId } = req.query;

      const metrics = await taskService.getDashboardMetrics(
        req.user!.id,
        req.user!.role,
        {
          studentId: studentId as string,
          organizationId: organizationId as string,
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
