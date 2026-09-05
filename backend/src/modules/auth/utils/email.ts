import fs from 'fs';
import path from 'path';
import logger from '../../../config/logger';

const EMAIL_FROM = process.env.EMAIL_FROM || 'no-reply@skillbridge.com';
const APP_URL = process.env.APP_URL || 'http://localhost:5000';

const ensureLogsDirExists = () => {
  const logDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
};

const logEmailToFile = (to: string, subject: string, body: string) => {
  ensureLogsDirExists();
  const logPath = path.join(process.cwd(), 'logs', 'emails.log');
  const entry = `[${new Date().toISOString()}] To: ${to} | From: ${EMAIL_FROM} | Subject: ${subject}\nBody: ${body}\n----------------------------------------\n`;
  fs.appendFileSync(logPath, entry, 'utf8');
};

export const sendVerificationEmail = async (email: string, token: string): Promise<string> => {
  const verificationLink = `${APP_URL}/api/v1/auth/verify-email/${token}`;
  const subject = 'Verify your SkillBridge Account';
  const body = `Welcome to SkillBridge! Please verify your email by clicking the link: ${verificationLink}`;
  
  logger.info(`[MOCK EMAIL] Verification email to ${email}. Link: ${verificationLink}`);
  logEmailToFile(email, subject, body);
  return verificationLink;
};

export const sendPasswordResetEmail = async (email: string, token: string): Promise<string> => {
  const resetLink = `${APP_URL}/api/v1/auth/reset-password?token=${token}`;
  const subject = 'Reset your SkillBridge Password';
  const body = `You requested a password reset. Reset link: ${resetLink}`;
  
  logger.info(`[MOCK EMAIL] Password reset email to ${email}. Link: ${resetLink}`);
  logEmailToFile(email, subject, body);
  return resetLink;
};
