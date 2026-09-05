import { Request, Response, NextFunction } from 'express';
import { AssessmentService }               from '../services/assessment.service';

const svc = new AssessmentService();

export class AssessmentController {
  createAssessment      = (req: Request, res: Response, next: NextFunction) => svc.createAssessment(req, res, next);
  getAssessment         = (req: Request, res: Response, next: NextFunction) => svc.getAssessment(req, res, next);
  updateAssessment      = (req: Request, res: Response, next: NextFunction) => svc.updateAssessment(req, res, next);
  createFinalEvaluation = (req: Request, res: Response, next: NextFunction) => svc.createFinalEvaluation(req, res, next);
  getStudentAssessments = (req: Request, res: Response, next: NextFunction) => svc.getStudentAssessments(req, res, next);
  getInternshipEvaluation = (req: Request, res: Response, next: NextFunction) => svc.getInternshipEvaluation(req, res, next);
  generateReport        = (req: Request, res: Response, next: NextFunction) => svc.generateReport(req, res, next);
  getReport             = (req: Request, res: Response, next: NextFunction) => svc.getReport(req, res, next);
  createRubric          = (req: Request, res: Response, next: NextFunction) => svc.createRubric(req, res, next);
  getRubrics            = (req: Request, res: Response, next: NextFunction) => svc.getRubrics(req, res, next);
  getDashboardMetrics   = (req: Request, res: Response, next: NextFunction) => svc.getDashboardMetrics(req, res, next);
}
