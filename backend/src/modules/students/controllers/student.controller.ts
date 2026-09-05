import { Response, NextFunction } from 'express';
import { StudentService } from '../services/student.service';
import { AuthenticatedRequest } from '../../auth/middlewares/auth.middleware';
import {
  CreateProfileSchema,
  UpdateProfileSchema,
  SkillSchema,
  EducationSchema,
  ProjectSchema,
  AchievementSchema,
  CertificateSchema,
} from '../validators/student.validator';
import { getFileUrl } from '../../../utils/storage';
import logger from '../../../config/logger';

const studentService = new StudentService();

export class StudentController {
  // 1. Create Profile
  async createProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = CreateProfileSchema.parse(req.body);
      const ip = req.ip || req.socket.remoteAddress;

      const profile = await studentService.createOrUpdateProfile(req.user!.id, validated, ip);
      res.status(200).json({
        success: true,
        message: 'Profile created successfully.',
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }

  // 2. Get Current Student Profile
  async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await studentService.getStudentProfile(req.user!.id, req.user!.role);
      res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }

  // 2.1 Get Student Profile by ID (Admin / Company access)
  async getProfileById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      // Security check: Students cannot view other profiles
      if (req.user!.role === 'STUDENT') {
        const student = await studentService.getStudentProfile(req.user!.id);
        if (student.id !== id) {
          res.status(403).json({
            success: false,
            message: 'Forbidden. You are not authorized to view this profile.',
            error_code: 'AUTH_003',
          });
          return;
        }
      }

      const profile = await studentService.getStudentProfileByStudentId(id, req.user!.role);
      res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }

  // 3. Update Profile
  async updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = UpdateProfileSchema.parse(req.body);
      const ip = req.ip || req.socket.remoteAddress;

      // Handle optional profile picture upload
      let profileImageUrl: string | undefined;
      if (req.file) {
        profileImageUrl = getFileUrl(req, req.file.filename);
      }

      const profile = await studentService.createOrUpdateProfile(req.user!.id, {
        ...validated,
        profileImageUrl,
      }, ip);

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully.',
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }

  // 4. Add Skill
  async addSkill(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = SkillSchema.parse(req.body);
      const ip = req.ip || req.socket.remoteAddress;

      const skill = await studentService.addSkill(req.user!.id, validated, ip);
      res.status(201).json({
        success: true,
        message: 'Skill added successfully.',
        data: skill,
      });
    } catch (error) {
      next(error);
    }
  }

  // 4.1 Update Skill
  async updateSkill(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const validated = SkillSchema.partial().parse(req.body);

      const skill = await studentService.updateSkill(req.user!.id, id, validated);
      res.status(200).json({
        success: true,
        message: 'Skill updated successfully.',
        data: skill,
      });
    } catch (error) {
      next(error);
    }
  }

  // 4.2 Delete Skill
  async deleteSkill(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await studentService.deleteSkill(req.user!.id, id);

      res.status(200).json({
        success: true,
        message: 'Skill deleted successfully.',
      });
    } catch (error) {
      next(error);
    }
  }

  // 5. Add Education Record
  async addEducation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = EducationSchema.parse(req.body);
      const edu = await studentService.addEducation(req.user!.id, validated);

      res.status(201).json({
        success: true,
        message: 'Education record added successfully.',
        data: edu,
      });
    } catch (error) {
      next(error);
    }
  }

  // 6. Add Project Record
  async addProject(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = ProjectSchema.parse(req.body);
      const project = await studentService.addProject(req.user!.id, validated);

      res.status(201).json({
        success: true,
        message: 'Project record added successfully.',
        data: project,
      });
    } catch (error) {
      next(error);
    }
  }

  // 7. Add Achievement Record
  async addAchievement(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = AchievementSchema.parse(req.body);
      const ip = req.ip || req.socket.remoteAddress;

      const ach = await studentService.addAchievement(req.user!.id, validated, ip);
      res.status(201).json({
        success: true,
        message: 'Achievement record added successfully.',
        data: ach,
      });
    } catch (error) {
      next(error);
    }
  }

  // 8. Upload Resume PDF
  async uploadResume(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'Resume file is required (PDF format, max 10MB).',
        });
        return;
      }

      const ip = req.ip || req.socket.remoteAddress;
      const resumeUrl = getFileUrl(req, req.file.filename);
      const student = await studentService.uploadResume(req.user!.id, resumeUrl, ip);

      res.status(200).json({
        success: true,
        message: 'Resume uploaded successfully.',
        data: {
          resumeUrl: student.resumeUrl,
          profileCompletion: student.profileCompletion,
          employabilityScore: student.employabilityScore,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // 9. Upload External Certificate
  async uploadCertificate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'Certificate file is required (PDF, JPG, PNG, max 10MB).',
        });
        return;
      }

      // Multer text inputs come in body
      const input = {
        certificateName: req.body.certificateName,
        issuer: req.body.issuer,
        issueDate: req.body.issueDate ? new Date(req.body.issueDate) : undefined,
      };

      const validated = CertificateSchema.parse(input);
      const ip = req.ip || req.socket.remoteAddress;
      const certificateUrl = getFileUrl(req, req.file.filename);

      const cert = await studentService.uploadCertificate(req.user!.id, {
        ...validated,
        certificateUrl,
      }, ip);

      res.status(201).json({
        success: true,
        message: 'Certificate uploaded and recorded successfully.',
        data: cert,
      });
    } catch (error) {
      next(error);
    }
  }
}
