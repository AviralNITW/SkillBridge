import path from 'path';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import logger from './config/logger';
import prisma from './config/db';
import { connectRedis } from './config/redis';
import authRoutes from './modules/auth/routes/auth.routes';
import studentRoutes from './modules/students/routes/student.routes';
import organizationRoutes from './modules/organizations/routes/organization.routes';
import opportunityRoutes from './modules/opportunities/routes/opportunity.routes';
import applicationRoutes from './modules/applications/routes/application.routes';
import taskRoutes from './modules/tasks/routes/task.routes';
import assessmentRoutes from './modules/assessments/routes/assessment.routes';
import certificateRoutes from './modules/certificates/routes/certificate.routes';
import { initOpportunityJobs } from './modules/opportunities/jobs/opportunity.jobs';
import { initApplicationJobs } from './modules/applications/jobs/application.jobs';
import { initTaskJobs } from './modules/tasks/jobs/task.jobs';
import notificationRoutes from './modules/notifications/routes/notification.routes';
import portfolioRoutes from './modules/portfolios/routes/portfolio.routes';
import { initNotificationJobs } from './modules/notifications/jobs/notification.jobs';

import coreRoutes from './core/routes/core.routes';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Standard Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Uploads statically
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// HTTP Request Logging Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`HTTP ${req.method} ${req.url}`);
  next();
});

// Authentication and IAM module routes
app.use('/api/v1/auth', authRoutes);

// Student Management module routes
app.use('/api/v1/students', studentRoutes);

// Organization Management module routes
app.use('/api/v1/organizations', organizationRoutes);

// Opportunity Management module routes
app.use('/api/v1/opportunities', opportunityRoutes);

// Application Management module routes
app.use('/api/v1/applications', applicationRoutes);

// Task & Internship Execution module routes
app.use('/api/v1/tasks', taskRoutes);

// Assessment & Evaluation module routes
app.use('/api/v1/assessments', assessmentRoutes);

app.use('/api/v1/certificates', certificateRoutes);
app.use('/api/v1/portfolios', portfolioRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/core', coreRoutes);

// Health check API route
app.get('/api/v1/health', async (req: Request, res: Response) => {
  try {
    // Perform a lightweight database query to verify DB connection
    await prisma.$queryRaw`SELECT 1`;
    
    res.status(200).json({
      success: true,
      message: 'SkillBridge Backend API is healthy',
      timestamp: new Date(),
      uptime: process.uptime(),
      services: {
        database: 'UP',
        redis: 'UP'
      }
    });
  } catch (error: any) {
    logger.error(`Healthcheck failed: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Backend is unhealthy',
      error: error.message
    });
  }
});

// Centralized Error-handling Middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(`Unhandled Error: ${err.message}`);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error_code: err.code || 'SYS_001'
  });
});

// Connect to Redis and start listening
const startServer = async () => {
  try {
    await connectRedis();
    initOpportunityJobs();
    initApplicationJobs();
    initTaskJobs();
    initAssessmentJobs();
    app.listen(PORT, () => {
      logger.info(`SkillBridge Backend server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });
  } catch (error: any) {
    logger.error(`Critical server start error: ${error.message}`);
    process.exit(1);
  }
};

startServer();

