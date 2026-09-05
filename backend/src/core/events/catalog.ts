/* src/core/events/catalog.ts */

/**
 * SkillBridge Event Catalog – Version 1.0
 *
 * This file defines every business‑level event emitted by the system,
 * their payload interfaces, and a central enum for event names.
 * All services should import `EventName` and the corresponding payload
 * type when emitting or listening for events.
 */

export enum EventName {
  // ---------- Identity Domain ----------
  USER_REGISTERED = 'USER_REGISTERED',
  EMAIL_VERIFIED = 'EMAIL_VERIFIED',
  USER_LOGGED_IN = 'USER_LOGGED_IN',
  PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED',

  // ---------- Student Domain ----------
  STUDENT_PROFILE_CREATED = 'STUDENT_PROFILE_CREATED',
  STUDENT_PROFILE_COMPLETED = 'STUDENT_PROFILE_COMPLETED',
  STUDENT_SKILL_ADDED = 'STUDENT_SKILL_ADDED',
  STUDENT_PROJECT_ADDED = 'STUDENT_PROJECT_ADDED',

  // ---------- Organization Domain ----------
  ORGANIZATION_REGISTERED = 'ORGANIZATION_REGISTERED',
  ORGANIZATION_VERIFIED = 'ORGANIZATION_VERIFIED',
  SUBSCRIPTION_ACTIVATED = 'SUBSCRIPTION_ACTIVATED',

  // ---------- Opportunity Domain ----------
  OPPORTUNITY_CREATED = 'OPPORTUNITY_CREATED',
  OPPORTUNITY_PUBLISHED = 'OPPORTUNITY_PUBLISHED',
  OPPORTUNITY_CLOSED = 'OPPORTUNITY_CLOSED',
  OPPORTUNITY_BOOKMARKED = 'OPPORTUNITY_BOOKMARKED',

  // ---------- Application Domain ----------
  APPLICATION_SUBMITTED = 'APPLICATION_SUBMITTED',
  APPLICATION_SHORTLISTED = 'APPLICATION_SHORTLISTED',
  APPLICATION_ACCEPTED = 'APPLICATION_ACCEPTED',
  APPLICATION_REJECTED = 'APPLICATION_REJECTED',
  APPLICATION_WITHDRAWN = 'APPLICATION_WITHDRAWN',

  // ---------- Internship Workspace Domain ----------
  WORKSPACE_CREATED = 'WORKSPACE_CREATED',
  TASK_CREATED = 'TASK_CREATED',
  TASK_ASSIGNED = 'TASK_ASSIGNED',
  TASK_SUBMITTED = 'TASK_SUBMITTED',
  TASK_APPROVED = 'TASK_APPROVED',
  INTERNSHIP_COMPLETED = 'INTERNSHIP_COMPLETED',

  // ---------- Assessment Domain ----------
  ASSESSMENT_CREATED = 'ASSESSMENT_CREATED',
  ASSESSMENT_COMPLETED = 'ASSESSMENT_COMPLETED',
  FINAL_SCORE_GENERATED = 'FINAL_SCORE_GENERATED',

  // ---------- Certificate Domain ----------
  CERTIFICATE_ELIGIBLE = 'CERTIFICATE_ELIGIBLE',
  CERTIFICATE_GENERATED = 'CERTIFICATE_GENERATED',
  CERTIFICATE_DOWNLOADED = 'CERTIFICATE_DOWNLOADED',
  CERTIFICATE_VERIFIED = 'CERTIFICATE_VERIFIED',

  // ---------- Portfolio Domain ----------
  PORTFOLIO_GENERATED = 'PORTFOLIO_GENERATED',
  PORTFOLIO_PUBLISHED = 'PORTFOLIO_PUBLISHED',
  PORTFOLIO_VIEWED = 'PORTFOLIO_VIEWED',

  // ---------- Notification Domain ----------
  NOTIFICATION_SENT = 'NOTIFICATION_SENT',
  NOTIFICATION_READ = 'NOTIFICATION_READ',

  // ---------- Admin Domain ----------
  USER_SUSPENDED = 'USER_SUSPENDED',
  ORGANIZATION_APPROVED = 'ORGANIZATION_APPROVED',
  OPPORTUNITY_APPROVED = 'OPPORTUNITY_APPROVED',

  // ---------- System Events ----------
  FILE_UPLOADED = 'FILE_UPLOADED',
  FILE_DELETED = 'FILE_DELETED',
  SYSTEM_ERROR_OCCURRED = 'SYSTEM_ERROR_OCCURRED',
}

/** Base interface for every emitted event */
export interface BaseEvent<T = any> {
  type: EventName;
  payload: T;
  timestamp: Date;
}

/* ----------------------- Payload Interfaces ----------------------- */
/** Identity */
export interface UserRegisteredPayload {
  userId: string;
  role: 'STUDENT' | 'SCHOOL' | 'COMPANY' | 'MENTOR' | 'ADMIN';
}
export interface EmailVerifiedPayload { userId: string }
export interface UserLoggedInPayload { userId: string }
export interface PasswordResetRequestedPayload { userId: string; email: string }

/** Application */
export interface ApplicationAcceptedPayload {
  applicationId: string;
  internshipId: string;
  studentId: string;
}

/** Workspace */
export interface WorkspaceCreatedPayload {
  workspaceId: string;
  internshipId: string;
}

/** Task */
export interface TaskCreatedPayload {
  taskId: string;
  workspaceId: string;
}

/** Assessment */
export interface AssessmentCreatedPayload {
  assessmentId: string;
  internshipId: string;
}

/** Certificate */
export interface CertificateGeneratedPayload {
  certificateId: string;
  studentId: string;
}

// Extend this file with additional payload interfaces following the same pattern.
