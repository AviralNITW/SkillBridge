import { StudentRepository } from '../repositories/student.repository';
import redisClient from '../../../config/redis';
import logger from '../../../config/logger';
import {
  Student,
  StudentSkill,
  StudentEducation,
  StudentProject,
  StudentAchievement,
  StudentCertificate,
} from '@prisma/client';

export class StudentService {
  private studentRepository: StudentRepository;

  constructor() {
    this.studentRepository = new StudentRepository();
  }

  private async invalidateCache(studentId: string): Promise<void> {
    try {
      await redisClient.del(`student:${studentId}`);
      await redisClient.del(`student_profile:${studentId}`);
      await redisClient.del(`student_dashboard:${studentId}`);
      logger.debug(`Evicted Redis cache keys for student:${studentId}`);
    } catch (err: any) {
      logger.error(`Redis cache invalidation error: ${err.message}`);
    }
  }

  // Helper to calculate and persist completion and employability scores
  async updateStudentScores(studentId: string): Promise<void> {
    const student = await this.studentRepository.findStudentProfileComplete(studentId);
    if (!student) return;

    // 1. Calculate Profile Completion (Max 100%)
    let completion = 0;
    if (student.profileImageUrl) completion += 10;
    if (student.bio) completion += 10;
    if (student.education && student.education.length > 0) completion += 20;
    if (student.skills && student.skills.length > 0) completion += 20;
    if (student.projects && student.projects.length > 0) completion += 20;
    if (student.studentCertificates && student.studentCertificates.length > 0) completion += 10;
    if (student.resumeUrl) completion += 10;

    // 2. Calculate Employability Score (Max 100)
    const eduPoints = student.education && student.education.length > 0 ? 20 : 0;
    
    const skillsCount = student.skills ? student.skills.length : 0;
    const skillsPoints = Math.min(30, skillsCount * 6); // 6 pts per skill, max 30
    
    const projectsCount = student.projects ? student.projects.length : 0;
    const projectsPoints = Math.min(20, projectsCount * 10); // 10 pts per project, max 20
    
    const certsCount = student.studentCertificates ? student.studentCertificates.length : 0;
    const certsPoints = Math.min(15, certsCount * 5); // 5 pts per certificate, max 15
    
    const achievementsCount = student.achievements ? student.achievements.length : 0;
    const achievementsPoints = Math.min(10, achievementsCount * 5); // 5 pts per achievement, max 10
    
    const completionPoints = Math.round((completion / 100) * 5); // Max 5 pts based on completion %

    const employabilityScore = eduPoints + skillsPoints + projectsPoints + certsPoints + achievementsPoints + completionPoints;

    await this.studentRepository.updateStudent(studentId, {
      profileCompletion: completion,
      employabilityScore,
    });

    await this.invalidateCache(studentId);
  }

  // Student Profile CRUD
  async getStudentProfile(userId: string, targetRole?: string): Promise<any> {
    const student = await this.studentRepository.findStudentByUserId(userId);
    if (!student) {
      const err: any = new Error('Student profile not found');
      err.status = 404;
      throw err;
    }

    // Try reading cache
    const cacheKey = `student_profile:${student.id}`;
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        logger.debug(`Serving profile from Redis cache: ${cacheKey}`);
        const profile = JSON.parse(cached);
        
        // Security logic for Companies (viewing public student data only)
        if (targetRole === 'COMPANY') {
          return this.sanitizeProfileForCompany(profile);
        }
        return profile;
      }
    } catch (err: any) {
      logger.error(`Redis read error: ${err.message}`);
    }

    // DB fetch
    const profile = await this.studentRepository.findStudentProfileComplete(student.id);
    if (!profile) {
      const err: any = new Error('Student profile not found');
      err.status = 404;
      throw err;
    }

    // Save in Cache
    try {
      await redisClient.set(cacheKey, JSON.stringify(profile), { EX: 15 * 60 }); // 15 mins TTL
    } catch (err: any) {
      logger.error(`Redis set error: ${err.message}`);
    }

    if (targetRole === 'COMPANY') {
      return this.sanitizeProfileForCompany(profile);
    }
    return profile;
  }

  async getStudentProfileByStudentId(studentId: string, targetRole?: string): Promise<any> {
    const cacheKey = `student_profile:${studentId}`;
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        logger.debug(`Serving profile from Redis cache: ${cacheKey}`);
        const profile = JSON.parse(cached);
        if (targetRole === 'COMPANY') {
          return this.sanitizeProfileForCompany(profile);
        }
        return profile;
      }
    } catch (err: any) {
      logger.error(`Redis read error: ${err.message}`);
    }

    const profile = await this.studentRepository.findStudentProfileComplete(studentId);
    if (!profile) {
      const err: any = new Error('Student profile not found');
      err.status = 404;
      throw err;
    }

    try {
      await redisClient.set(cacheKey, JSON.stringify(profile), { EX: 15 * 60 });
    } catch (err: any) {
      logger.error(`Redis set error: ${err.message}`);
    }

    if (targetRole === 'COMPANY') {
      return this.sanitizeProfileForCompany(profile);
    }
    return profile;
  }

  async createOrUpdateProfile(userId: string, data: {
    dateOfBirth?: Date;
    gender?: string;
    bio?: string;
    profileImageUrl?: string;
    firstName?: string;
    lastName?: string;
  }, clientIp?: string): Promise<Student> {
    const student = await this.studentRepository.findStudentByUserId(userId);
    if (!student) {
      const err: any = new Error('Student record not initialized. Register first.');
      err.status = 400;
      throw err;
    }

    await this.studentRepository.updateStudent(student.id, data);
    
    // Recalculate scores
    await this.updateStudentScores(student.id);

    const updated = await this.studentRepository.findStudentById(student.id);
    if (!updated) {
      throw new Error('Failed to retrieve updated student profile');
    }

    await this.studentRepository.createAuditLog({
      userId,
      action: 'PROFILE_UPDATED',
      resourceType: 'STUDENT_PROFILE',
      resourceId: student.id,
      ipAddress: clientIp,
    });

    return updated;
  }

  // Skills Management
  async addSkill(userId: string, data: { skillName: string; proficiencyLevel: string; yearsOfExperience: number }, clientIp?: string): Promise<StudentSkill> {
    const student = await this.getStudentByUserId(userId);
    const skill = await this.studentRepository.addSkill(student.id, data);
    
    await this.updateStudentScores(student.id);
    
    await this.studentRepository.createAuditLog({
      userId,
      action: 'SKILL_ADDED',
      resourceType: 'STUDENT_SKILL',
      resourceId: skill.id,
      ipAddress: clientIp,
    });

    return skill;
  }

  async updateSkill(userId: string, skillId: string, data: { skillName?: string; proficiencyLevel?: string; yearsOfExperience?: number }): Promise<StudentSkill> {
    const student = await this.getStudentByUserId(userId);
    const skill = await this.studentRepository.findSkillById(skillId);
    
    if (!skill || skill.studentId !== student.id) {
      const err: any = new Error('Skill not found or unauthorized');
      err.status = 404;
      throw err;
    }

    const updated = await this.studentRepository.updateSkill(skillId, data);
    await this.updateStudentScores(student.id);
    return updated;
  }

  async deleteSkill(userId: string, skillId: string): Promise<void> {
    const student = await this.getStudentByUserId(userId);
    const skill = await this.studentRepository.findSkillById(skillId);
    
    if (!skill || skill.studentId !== student.id) {
      const err: any = new Error('Skill not found or unauthorized');
      err.status = 404;
      throw err;
    }

    await this.studentRepository.deleteSkill(skillId);
    await this.updateStudentScores(student.id);
  }

  // Education Management
  async addEducation(userId: string, data: {
    institutionName: string;
    degree: string;
    specialization: string;
    cgpa: number;
    startYear: number;
    endYear: number;
  }): Promise<StudentEducation> {
    const student = await this.getStudentByUserId(userId);
    const edu = await this.studentRepository.addEducation(student.id, data);
    await this.updateStudentScores(student.id);
    return edu;
  }

  // Projects Management
  async addProject(userId: string, data: {
    title: string;
    description: string;
    techStack: string;
    githubUrl?: string | null;
    liveUrl?: string | null;
  }): Promise<StudentProject> {
    const student = await this.getStudentByUserId(userId);
    const project = await this.studentRepository.addProject(student.id, data);
    await this.updateStudentScores(student.id);
    return project;
  }

  // Achievements Management
  async addAchievement(userId: string, data: {
    title: string;
    description?: string | null;
    achievementDate: Date;
  }, clientIp?: string): Promise<StudentAchievement> {
    const student = await this.getStudentByUserId(userId);
    const ach = await this.studentRepository.addAchievement(student.id, data);
    await this.updateStudentScores(student.id);

    await this.studentRepository.createAuditLog({
      userId,
      action: 'ACHIEVEMENT_ADDED',
      resourceType: 'STUDENT_ACHIEVEMENT',
      resourceId: ach.id,
      ipAddress: clientIp,
    });

    return ach;
  }

  // Resume Upload
  async uploadResume(userId: string, resumeUrl: string, clientIp?: string): Promise<Student> {
    const student = await this.getStudentByUserId(userId);
    await this.studentRepository.updateStudent(student.id, { resumeUrl });
    await this.updateStudentScores(student.id);
    const updated = await this.getStudentByUserId(userId);

    await this.studentRepository.createAuditLog({
      userId,
      action: 'RESUME_UPLOADED',
      resourceType: 'STUDENT_PROFILE',
      resourceId: student.id,
      ipAddress: clientIp,
    });

    return updated;
  }

  // External Certificates Upload
  async uploadCertificate(userId: string, data: {
    certificateName: string;
    issuer: string;
    issueDate: Date;
    certificateUrl: string;
  }, clientIp?: string): Promise<StudentCertificate> {
    const student = await this.getStudentByUserId(userId);
    const cert = await this.studentRepository.addCertificate(student.id, data);
    await this.updateStudentScores(student.id);

    await this.studentRepository.createAuditLog({
      userId,
      action: 'CERTIFICATE_UPLOADED',
      resourceType: 'STUDENT_CERTIFICATE',
      resourceId: cert.id,
      ipAddress: clientIp,
    });

    return cert;
  }

  // Private Helper: Fetch student record by user ID
  private async getStudentByUserId(userId: string): Promise<Student> {
    const student = await this.studentRepository.findStudentByUserId(userId);
    if (!student) {
      const err: any = new Error('Student profile not found');
      err.status = 404;
      throw err;
    }
    return student;
  }

  // Sanitize profile content to hide confidential details from companies
  private sanitizeProfileForCompany(profile: any): any {
    return {
      id: profile.id,
      firstName: profile.firstName,
      lastName: profile.lastName,
      bio: profile.bio,
      gender: profile.gender,
      profileImageUrl: profile.profileImageUrl,
      portfolioSlug: profile.portfolioSlug,
      employabilityScore: profile.employabilityScore,
      skills: profile.skills,
      education: profile.education,
      projects: profile.projects,
      studentCertificates: profile.studentCertificates,
      achievements: profile.achievements,
      // Hide confidential DB timestamps or system configurations if needed
    };
  }
}
