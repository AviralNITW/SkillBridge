/* src/core/permissions/permissions.ts */

/**
 * Permission catalog for SkillBridge Enterprise (v2.0).
 * Each permission follows the `resource.action` naming convention.
 */
export enum Permission {
  // Identity Domain
  AUTH_LOGIN = 'auth.login',
  AUTH_LOGOUT = 'auth.logout',
  AUTH_SESSION_VIEW = 'auth.session.view',
  AUTH_SESSION_REVOKE = 'auth.session.revoke',
  AUTH_PROFILE_READ = 'auth.profile.read',
  AUTH_PROFILE_UPDATE = 'auth.profile.update',

  // Student Domain
  STUDENT_CREATE = 'student.create',
  STUDENT_READ = 'student.read',
  STUDENT_READ_ALL = 'student.read.all',
  STUDENT_UPDATE = 'student.update',
  STUDENT_DELETE = 'student.delete',
  STUDENT_SKILL_CREATE = 'student.skill.create',
  STUDENT_SKILL_UPDATE = 'student.skill.update',
  STUDENT_SKILL_DELETE = 'student.skill.delete',
  STUDENT_EDUCATION_CREATE = 'student.education.create',
  STUDENT_EDUCATION_UPDATE = 'student.education.update',
  STUDENT_EDUCATION_DELETE = 'student.education.delete',
  STUDENT_PROJECT_CREATE = 'student.project.create',
  STUDENT_PROJECT_UPDATE = 'student.project.update',
  STUDENT_PROJECT_DELETE = 'student.project.delete',
  STUDENT_RESUME_UPLOAD = 'student.resume.upload',
  STUDENT_RESUME_DELETE = 'student.resume.delete',
  STUDENT_ACHIEVEMENT_CREATE = 'student.achievement.create',
  STUDENT_ACHIEVEMENT_UPDATE = 'student.achievement.update',
  STUDENT_ACHIEVEMENT_DELETE = 'student.achievement.delete',

  // Organization Domain
  ORGANIZATION_CREATE = 'organization.create',
  ORGANIZATION_READ = 'organization.read',
  ORGANIZATION_READ_ALL = 'organization.read.all',
  ORGANIZATION_UPDATE = 'organization.update',
  ORGANIZATION_DELETE = 'organization.delete',
  ORGANIZATION_VERIFY = 'organization.verify',
  ORGANIZATION_REJECT = 'organization.reject',
  ORGANIZATION_SUSPEND = 'organization.suspend',
  ORGANIZATION_MEMBER_CREATE = 'organization.member.create',
  ORGANIZATION_MEMBER_UPDATE = 'organization.member.update',
  ORGANIZATION_MEMBER_REMOVE = 'organization.member.remove',
  ORGANIZATION_SUBSCRIPTION_MANAGE = 'organization.subscription.manage',

  // Opportunity Domain
  OPPORTUNITY_CREATE = 'opportunity.create',
  OPPORTUNITY_READ = 'opportunity.read',
  OPPORTUNITY_READ_ALL = 'opportunity.read.all',
  OPPORTUNITY_UPDATE = 'opportunity.update',
  OPPORTUNITY_DELETE = 'opportunity.delete',
  OPPORTUNITY_PUBLISH = 'opportunity.publish',
  OPPORTUNITY_ARCHIVE = 'opportunity.archive',
  OPPORTUNITY_CLOSE = 'opportunity.close',
  OPPORTUNITY_APPROVE = 'opportunity.approve',
  OPPORTUNITY_REJECT = 'opportunity.reject',
  OPPORTUNITY_BOOKMARK = 'opportunity.bookmark',
  OPPORTUNITY_SEARCH = 'opportunity.search',

  // Application Domain
  APPLICATION_CREATE = 'application.create',
  APPLICATION_READ = 'application.read',
  APPLICATION_READ_ALL = 'application.read.all',
  APPLICATION_WITHDRAW = 'application.withdraw',
  APPLICATION_REVIEW = 'application.review',
  APPLICATION_SHORTLIST = 'application.shortlist',
  APPLICATION_ACCEPT = 'application.accept',
  APPLICATION_REJECT = 'application.reject',
  APPLICATION_NOTE_CREATE = 'application.note.create',
  APPLICATION_NOTE_READ = 'application.note.read',
  APPLICATION_NOTE_DELETE = 'application.note.delete',
  APPLICATION_BULK_UPDATE = 'application.bulk.update',

  // Workspace Domain
  WORKSPACE_CREATE = 'workspace.create',
  WORKSPACE_READ = 'workspace.read',
  WORKSPACE_UPDATE = 'workspace.update',
  WORKSPACE_DELETE = 'workspace.delete',
  WORKSPACE_MEMBER_ADD = 'workspace.member.add',
  WORKSPACE_MEMBER_REMOVE = 'workspace.member.remove',
  WORKSPACE_FILE_UPLOAD = 'workspace.file.upload',
  WORKSPACE_FILE_DELETE = 'workspace.file.delete',
  WORKSPACE_DISCUSSION_CREATE = 'workspace.discussion.create',
  WORKSPACE_DISCUSSION_UPDATE = 'workspace.discussion.update',
  WORKSPACE_DISCUSSION_DELETE = 'workspace.discussion.delete',
  WORKSPACE_COMMENT_CREATE = 'workspace.comment.create',
  WORKSPACE_COMMENT_UPDATE = 'workspace.comment.update',
  WORKSPACE_COMMENT_DELETE = 'workspace.comment.delete',
  WORKSPACE_MILESTONE_CREATE = 'workspace.milestone.create',
  WORKSPACE_MILESTONE_UPDATE = 'workspace.milestone.update',
  WORKSPACE_MILESTONE_DELETE = 'workspace.milestone.delete',

  // Task Domain
  TASK_CREATE = 'task.create',
  TASK_READ = 'task.read',
  TASK_UPDATE = 'task.update',
  TASK_DELETE = 'task.delete',
  TASK_ASSIGN = 'task.assign',
  TASK_SUBMIT = 'task.submit',
  TASK_RESUBMIT = 'task.resubmit',
  TASK_REVIEW = 'task.review',
  TASK_APPROVE = 'task.approve',
  TASK_REJECT = 'task.reject',
  TASK_COMPLETE = 'task.complete',

  // Assessment Domain
  ASSESSMENT_CREATE = 'assessment.create',
  ASSESSMENT_READ = 'assessment.read',
  ASSESSMENT_UPDATE = 'assessment.update',
  ASSESSMENT_DELETE = 'assessment.delete',
  ASSESSMENT_REVIEW = 'assessment.review',
  ASSESSMENT_SCORE = 'assessment.score',
  ASSESSMENT_RUBRIC_CREATE = 'assessment.rubric.create',
  ASSESSMENT_RUBRIC_UPDATE = 'assessment.rubric.update',
  ASSESSMENT_RUBRIC_DELETE = 'assessment.rubric.delete',
  ASSESSMENT_REPORT_GENERATE = 'assessment.report.generate',

  // Certificate Domain
  CERTIFICATE_GENERATE = 'certificate.generate',
  CERTIFICATE_READ = 'certificate.read',
  CERTIFICATE_READ_ALL = 'certificate.read.all',
  CERTIFICATE_DOWNLOAD = 'certificate.download',
  CERTIFICATE_VERIFY = 'certificate.verify',
  CERTIFICATE_REISSUE = 'certificate.reissue',
  CERTIFICATE_REVOKE = 'certificate.revoke',
  CERTIFICATE_ANALYTICS_READ = 'certificate.analytics.read',

  // Portfolio Domain
  PORTFOLIO_CREATE = 'portfolio.create',
  PORTFOLIO_READ = 'portfolio.read',
  PORTFOLIO_UPDATE = 'portfolio.update',
  PORTFOLIO_DELETE = 'portfolio.delete',
  PORTFOLIO_PUBLISH = 'portfolio.publish',
  PORTFOLIO_UNPUBLISH = 'portfolio.unpublish',
  PORTFOLIO_ANALYTICS_READ = 'portfolio.analytics.read',

  // Notification Domain
  NOTIFICATION_READ = 'notification.read',
  NOTIFICATION_SEND = 'notification.send',
  NOTIFICATION_BROADCAST = 'notification.broadcast',
  NOTIFICATION_PREFERENCE_UPDATE = 'notification.preference.update',
  NOTIFICATION_DELETE = 'notification.delete',

  // Analytics Domain
  ANALYTICS_STUDENT_READ = 'analytics.student.read',
  ANALYTICS_ORGANIZATION_READ = 'analytics.organization.read',
  ANALYTICS_PLATFORM_READ = 'analytics.platform.read',
  ANALYTICS_EXPORT = 'analytics.export',
  ANALYTICS_DASHBOARD_VIEW = 'analytics.dashboard.view',

  // Reports Domain
  REPORT_CREATE = 'report.create',
  REPORT_READ = 'report.read',
  REPORT_DOWNLOAD = 'report.download',
  REPORT_EXPORT = 'report.export',
  REPORT_DELETE = 'report.delete',

  // Admin Domain
  ADMIN_USER_SUSPEND = 'admin.user.suspend',
  ADMIN_USER_ACTIVATE = 'admin.user.activate',
  ADMIN_USER_DELETE = 'admin.user.delete',
  ADMIN_ORGANIZATION_VERIFY = 'admin.organization.verify',
  ADMIN_OPPORTUNITY_MODERATE = 'admin.opportunity.moderate',
  ADMIN_SETTINGS_UPDATE = 'admin.settings.update',
  ADMIN_ANNOUNCEMENT_PUBLISH = 'admin.announcement.publish',
  ADMIN_AUDIT_READ = 'admin.audit.read',

  // Audit Domain
  AUDIT_READ = 'audit.read',
  AUDIT_EXPORT = 'audit.export',
  AUDIT_ARCHIVE = 'audit.archive',

  // Infrastructure Domain
  FILE_UPLOAD = 'file.upload',
  FILE_READ = 'file.read',
  FILE_DELETE = 'file.delete',
  SEARCH_GLOBAL = 'search.global',
  QUEUE_VIEW = 'queue.view',
  QUEUE_RETRY = 'queue.retry',
  SYSTEM_HEALTH_READ = 'system.health.read',
  SYSTEM_METRICS_READ = 'system.metrics.read',
}

/**
 * Role‑to‑permission mapping based on the catalog above.
 * Each role maps to a Set of allowed Permission values.
 */
export const RolePermissions: Record<string, Set<Permission>> = {
  STUDENT: new Set([
    Permission.AUTH_LOGIN,
    Permission.AUTH_LOGOUT,
    Permission.AUTH_PROFILE_READ,
    Permission.AUTH_PROFILE_UPDATE,
    Permission.APPLICATION_CREATE,
    Permission.APPLICATION_READ,
    Permission.APPLICATION_WITHDRAW,
    Permission.TASK_READ,
    Permission.TASK_SUBMIT,
    Permission.TASK_RESUBMIT,
    Permission.ASSESSMENT_READ,
    Permission.CERTIFICATE_READ,
    Permission.CERTIFICATE_DOWNLOAD,
    Permission.PORTFOLIO_READ,
    Permission.PORTFOLIO_PUBLISH, // portfolio.* for student
    Permission.NOTIFICATION_READ,
  ]),
  MENTOR: new Set([
    Permission.WORKSPACE_CREATE,
    Permission.WORKSPACE_READ,
    Permission.WORKSPACE_UPDATE,
    Permission.WORKSPACE_DELETE,
    Permission.TASK_CREATE,
    Permission.TASK_ASSIGN,
    Permission.TASK_REVIEW,
    Permission.ASSESSMENT_READ,
    Permission.ASSESSMENT_SCORE,
    Permission.CERTIFICATE_GENERATE,
    Permission.CERTIFICATE_READ,
    Permission.ANALYTICS_ORGANIZATION_READ,
  ]),
  COMPANY_RECRUITER: new Set([
    Permission.OPPORTUNITY_CREATE,
    Permission.OPPORTUNITY_READ,
    Permission.OPPORTUNITY_PUBLISH,
    Permission.APPLICATION_READ,
    Permission.APPLICATION_UPDATE,
    Permission.WORKSPACE_READ,
    Permission.TASK_READ,
    Permission.ANALYTICS_ORGANIZATION_READ,
  ]),
  COMPANY_ADMIN: new Set([
    Permission.ORGANIZATION_CREATE,
    Permission.ORGANIZATION_READ,
    Permission.OPPORTUNITY_CREATE,
    Permission.OPPORTUNITY_READ,
    Permission.APPLICATION_CREATE,
    Permission.APPLICATION_READ,
    Permission.WORKSPACE_CREATE,
    Permission.WORKSPACE_READ,
    Permission.ANALYTICS_ORGANIZATION_READ,
    Permission.REPORT_CREATE,
    Permission.REPORT_READ,
  ]),
  SCHOOL_ADMIN: new Set([
    Permission.STUDENT_READ_ALL,
    Permission.ANALYTICS_STUDENT_READ,
    Permission.ANALYTICS_ORGANIZATION_READ,
    Permission.REPORT_READ,
    Permission.ORGANIZATION_READ,
  ]),
  MODERATOR: new Set([
    Permission.ORGANIZATION_VERIFY,
    Permission.OPPORTUNITY_APPROVE,
    Permission.OPPORTUNITY_REJECT,
    Permission.AUDIT_READ,
  ]),
  ADMIN: new Set(Object.values(Permission)), // all business permissions
  SUPER_ADMIN: new Set(Object.values(Permission)), // all permissions + system
};

/**
 * Helper to check if a role has a specific permission.
 */
export function hasPermission(role: string, permission: Permission): boolean {
  const perms = RolePermissions[role];
  if (!perms) return false;
  return perms.has(permission);
}
