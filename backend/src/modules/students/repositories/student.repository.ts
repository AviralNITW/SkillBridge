import prisma from '../../../config/db';
import {
  Student,
  StudentSkill,
  StudentEducation,
  StudentAchievement,
  StudentProject,
  StudentCertificate,
} from '@prisma/client';

export class StudentRepository {
  async findStudentByUserId(userId: string): Promise<Student | null> {
    return prisma.student.findUnique({
      where: { userId },
    });
  }

  async findStudentById(id: string): Promise<Student | null> {
    return prisma.student.findUnique({
      where: { id },
    });
  }

  async findStudentProfileComplete(id: string) {
    return prisma.student.findUnique({
      where: { id },
      include: {
        skills: true,
        education: true,
        achievements: true,
        projects: true,
        studentCertificates: true,
        user: {
          select: {
            email: true,
            role: true,
            status: true,
          },
        },
      },
    });
  }

  async updateStudent(id: string, data: any): Promise<Student> {
    return prisma.student.update({
      where: { id },
      data,
    });
  }

  // Skills Management
  async findSkillById(id: string): Promise<StudentSkill | null> {
    return prisma.studentSkill.findUnique({ where: { id } });
  }

  async addSkill(studentId: string, skill: { skillName: string; proficiencyLevel: string; yearsOfExperience: number }): Promise<StudentSkill> {
    return prisma.studentSkill.create({
      data: {
        studentId,
        skillName: skill.skillName,
        proficiencyLevel: skill.proficiencyLevel,
        yearsOfExperience: skill.yearsOfExperience,
      },
    });
  }

  async updateSkill(id: string, data: any): Promise<StudentSkill> {
    return prisma.studentSkill.update({
      where: { id },
      data,
    });
  }

  async deleteSkill(id: string): Promise<StudentSkill> {
    return prisma.studentSkill.delete({
      where: { id },
    });
  }

  // Education Management
  async addEducation(studentId: string, edu: {
    institutionName: string;
    degree: string;
    specialization: string;
    cgpa: number;
    startYear: number;
    endYear: number;
  }): Promise<StudentEducation> {
    return prisma.studentEducation.create({
      data: {
        studentId,
        institutionName: edu.institutionName,
        degree: edu.degree,
        specialization: edu.specialization,
        cgpa: edu.cgpa,
        startYear: edu.startYear,
        endYear: edu.endYear,
      },
    });
  }

  // Projects Management
  async findProjectById(id: string): Promise<StudentProject | null> {
    return prisma.studentProject.findUnique({ where: { id } });
  }

  async addProject(studentId: string, proj: {
    title: string;
    description: string;
    techStack: string;
    githubUrl?: string | null;
    liveUrl?: string | null;
  }): Promise<StudentProject> {
    return prisma.studentProject.create({
      data: {
        studentId,
        title: proj.title,
        description: proj.description,
        techStack: proj.techStack,
        githubUrl: proj.githubUrl,
        liveUrl: proj.liveUrl,
      },
    });
  }

  // Achievements Management
  async addAchievement(studentId: string, ach: {
    title: string;
    description?: string | null;
    achievementDate: Date;
  }): Promise<StudentAchievement> {
    return prisma.studentAchievement.create({
      data: {
        studentId,
        title: ach.title,
        description: ach.description,
        achievementDate: ach.achievementDate,
      },
    });
  }

  // Certificates Management
  async addCertificate(studentId: string, cert: {
    certificateName: string;
    issuer: string;
    issueDate: Date;
    certificateUrl: string;
  }): Promise<StudentCertificate> {
    return prisma.studentCertificate.create({
      data: {
        studentId,
        certificateName: cert.certificateName,
        issuer: cert.issuer,
        issueDate: cert.issueDate,
        certificateUrl: cert.certificateUrl,
      },
    });
  }

  // Audit Logs Helper
  async createAuditLog(log: {
    userId?: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    ipAddress?: string;
  }): Promise<void> {
    await prisma.auditLog.create({
      data: log,
    });
  }
}
