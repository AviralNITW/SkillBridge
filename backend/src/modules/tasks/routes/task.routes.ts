import { Router } from 'express';
import { TaskController } from '../controllers/task.controller';
import { authenticate } from '../../auth/middlewares/auth.middleware';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

const router = Router();
const controller = new TaskController();

// Ensure temp directory exists
const tempUploadDir = path.join(process.cwd(), 'uploads', 'tmp');
if (!fs.existsSync(tempUploadDir)) {
  fs.mkdirSync(tempUploadDir, { recursive: true });
}

// Multer config for task submissions (PDF, DOCX, ZIP, JPG, PNG up to 10MB)
const taskFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimetypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
    'application/zip',
    'application/x-zip-compressed',
    'application/octet-stream', // sometimes zip files appear as octet-stream
    'image/jpeg',
    'image/jpg',
    'image/png',
  ];

  if (allowedMimetypes.includes(file.mimetype) || 
      file.originalname.endsWith('.docx') || 
      file.originalname.endsWith('.zip')) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, DOCX, ZIP, JPG, and PNG formats are allowed for task submissions!') as any, false);
  }
};

const taskUpload = multer({
  dest: 'uploads/tmp/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
  fileFilter: taskFileFilter,
});

// All task routes require authentication
router.use(authenticate);

// --- 1. Static & Specific Namespace Routes (Before general dynamic routes) ---
router.get('/my-tasks', controller.getMyTasks.bind(controller));
router.get('/my-submissions', controller.getMySubmissions.bind(controller));
router.get('/dashboard/metrics', controller.getDashboardMetrics.bind(controller));
router.get('/internship/:internshipId', controller.getInternshipTasks.bind(controller));
router.post('/', controller.createTask.bind(controller));
router.post('/submissions/:submissionId/review', controller.reviewSubmission.bind(controller));

// --- 2. Dynamic Routes ---
router.get('/:id', controller.getTask.bind(controller));
router.put('/:id', controller.updateTask.bind(controller));
router.post('/:id/assign', controller.assignTask.bind(controller));
router.post('/:id/submit', taskUpload.single('submission'), controller.submitTask.bind(controller));

export default router;
