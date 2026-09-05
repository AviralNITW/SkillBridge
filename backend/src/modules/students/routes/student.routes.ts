import { Router } from 'express';
import { StudentController } from '../controllers/student.controller';
import { authenticate, requireRoles } from '../../auth/middlewares/auth.middleware';
import { upload } from '../../../utils/storage';

const router = Router();
const controller = new StudentController();

// All student endpoints require authentication
router.use(authenticate);

// Student Profile Endpoints
router.post('/profile', requireRoles(['STUDENT']), controller.createProfile.bind(controller));
router.get('/profile', controller.getProfile.bind(controller));
router.get('/profile/:id', controller.getProfileById.bind(controller));
router.put('/profile', requireRoles(['STUDENT']), upload.single('profileImage'), controller.updateProfile.bind(controller));

// Skills Management Endpoints
router.post('/skills', requireRoles(['STUDENT']), controller.addSkill.bind(controller));
router.put('/skills/:id', requireRoles(['STUDENT']), controller.updateSkill.bind(controller));
router.delete('/skills/:id', requireRoles(['STUDENT']), controller.deleteSkill.bind(controller));

// Education Management Endpoints
router.post('/education', requireRoles(['STUDENT']), controller.addEducation.bind(controller));

// Projects Management Endpoints
router.post('/projects', requireRoles(['STUDENT']), controller.addProject.bind(controller));

// Achievements Management Endpoints
router.post('/achievements', requireRoles(['STUDENT']), controller.addAchievement.bind(controller));

// Document/File Uploads
router.post('/resume', requireRoles(['STUDENT']), upload.single('resume'), controller.uploadResume.bind(controller));
router.post('/certificates', requireRoles(['STUDENT']), upload.single('certificate'), controller.uploadCertificate.bind(controller));

export default router;
