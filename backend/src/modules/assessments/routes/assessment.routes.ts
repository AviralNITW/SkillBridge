import { Router }               from 'express';
import { authenticate }         from '../../auth/middlewares/auth.middleware';
import { AssessmentController } from '../controllers/assessment.controller';

const router = Router();
const ctrl   = new AssessmentController();

// All routes require authentication
router.use(authenticate);

// ─── Rubric Routes (before /:id to avoid param collision) ────────────────────
router.post('/rubrics', ctrl.createRubric);
router.get('/rubrics',  ctrl.getRubrics);

// ─── Dashboard Metrics ────────────────────────────────────────────────────────
router.get('/dashboard/metrics', ctrl.getDashboardMetrics);

// ─── Report Routes ────────────────────────────────────────────────────────────
router.post('/report',                      ctrl.generateReport);
router.get ('/report/:internshipId',        ctrl.getReport);

// ─── Final Evaluation ─────────────────────────────────────────────────────────
router.post('/final/:internshipId',         ctrl.createFinalEvaluation);

// ─── Student Assessments ──────────────────────────────────────────────────────
router.get ('/student/:studentId',          ctrl.getStudentAssessments);

// ─── Internship Evaluation Summary ───────────────────────────────────────────
router.get ('/internship/:internshipId',    ctrl.getInternshipEvaluation);

// ─── Core Assessment CRUD ─────────────────────────────────────────────────────
router.post('/',    ctrl.createAssessment);
router.get ('/:id', ctrl.getAssessment);
router.put ('/:id', ctrl.updateAssessment);

export default router;
