# Software Requirement Specification

SOFTWARE REQUIREMENTS SPECIFICATION (SRS)

SkillBridge

NEP-Aligned Student Skill Development, Internship, Apprenticeship and Employability Management Platform

Version: 1.0

Document Type: Software Requirements Specification

Prepared By: Aviral Mishra

Methodology: Agile Scrum

Deployment Model: Cloud Native SaaS



1. Introduction

1.1 Purpose

This Software Requirements Specification (SRS) document defines the functional, non-functional, security, performance, scalability, and operational requirements of the SkillBridge platform.

The purpose of this document is to provide a complete and unambiguous description of the software system to ensure alignment between stakeholders, product owners, architects, developers, testers, and DevOps engineers.

This document serves as the primary reference for system design, implementation, testing, deployment, maintenance, and future enhancements.



1.2 Intended Audience

This document is intended for:

Business Stakeholders

Product Owners

School Administrators

Companies

Mentors

Technical Stakeholders

Software Architects

Backend Developers

Frontend Developers

QA Engineers

DevOps Engineers

Database Administrators

Academic Stakeholders

Project Supervisors

Evaluation Committees

Researchers



1.3 Scope

SkillBridge is a cloud-native SaaS platform designed to facilitate experiential learning and employability enhancement by connecting students, educational institutions, mentors, vocational professionals, community organizations, and companies.

The system enables:

Student Registration

Internship Management

Apprenticeship Management

Portfolio Creation

Certificate Management

Analytics

Reporting

Opportunity Discovery

while providing institutions and organizations with tools to manage and evaluate student participation.



1.4 Definitions, Acronyms and Abbreviations

Term

Description

API

Application Programming Interface

JWT

JSON Web Token

RBAC

Role Based Access Control

CI/CD

Continuous Integration / Continuous Deployment

SLA

Service Level Agreement

SLO

Service Level Objective

KPI

Key Performance Indicator

RPO

Recovery Point Objective

RTO

Recovery Time Objective

MTTR

Mean Time To Recovery

MTBF

Mean Time Between Failures

MVP

Minimum Viable Product

P95

95th Percentile Latency

P99

99th Percentile Latency



1.5 References

This document is based on:

Vision Document

BRD

PRD

Agile Development Principles

REST API Standards

Cloud Native Design Principles



2. Overall Description

2.1 Product Perspective

SkillBridge is developed as a multi-tenant SaaS platform that serves multiple categories of users through a unified architecture.

The platform consists of:

Frontend (Next.js)

        |

Backend APIs (FastAPI)

        |

Redis Cache

        |

PostgreSQL Database

        |

Object Storage (AWS S3)

The system follows a layered architecture:

Presentation Layer



Business Layer



Service Layer



Data Access Layer



Database Layer



2.2 Product Functions

Major system functions include:

User Management

Registration

Authentication

Authorization

Profile Management

Opportunity Management

Opportunity Creation

Opportunity Discovery

Opportunity Approval

Application Management

Apply

Review

Accept

Reject

Task Management

Assign Tasks

Submit Work

Review Deliverables

Certification

Generate Certificates

Verify Certificates

Download Certificates

Portfolio Management

Portfolio Generation

Achievement Tracking

Skill Tracking

Analytics

Institution Analytics

Student Analytics

Opportunity Analytics



2.3 User Classes

Student

Primary end user.

Capabilities:

Apply Opportunities

Build Portfolio

Download Certificates

Estimated Users:

10,000+



School Administrator

Capabilities:

Monitor Students

Generate Reports

View Analytics

Estimated Users:

100+



Company

Capabilities:

Create Opportunities

Review Applications

Generate Certificates

Estimated Users:

500+



Mentor

Capabilities:

Offer Opportunities

Evaluate Students

Estimated Users:

500+



System Administrator

Capabilities:

User Management

Moderation

Monitoring

Estimated Users:

10+



3. Operating Environment

Client Environment

Supported Browsers:

Chrome

Firefox

Edge

Safari

Minimum Screen Resolution:

1280 x 720

Recommended:

1920 x 1080



Server Environment

Operating System:

Ubuntu 24.04 LTS

Container Runtime:

Docker

Future:

Kubernetes



Database Environment

Database:

PostgreSQL 16+



Cache Environment

Redis 7+



4. Assumptions and Dependencies

The system assumes:

A-01

Users have internet access.

A-02

Users possess valid email addresses.

A-03

Cloud services remain available.

A-04

SMTP service remains operational.

A-05

Database backups execute successfully.



5. Constraints

C-01 Budget Constraint

MVP must be deployable under ₹5,000/month infrastructure cost.



C-02 Team Constraint

Development team size:

1–5 developers.



C-03 Performance Constraint

API P95 latency:

< 500 ms



C-04 Availability Constraint

Platform uptime:

99.5%



6. System Architecture Assumptions

Architecture Style:

Microservice-ready Modular Monolith

Phase 1:

Next.js



FastAPI



PostgreSQL



Redis



AWS S3

Phase 2:

Auth Service



Internship Service



Certificate Service



Analytics Service



Notification Service



7. Capacity Planning Assumptions

MVP Capacity

Registered Users:

10,000

Concurrent Users:

500

Daily Requests:

100,000

Storage:

500 GB



Scale Capacity

Registered Users:

1,000,000+

Concurrent Users:

10,000+

Daily Requests:

10,000,000+

Storage:

50 TB+



8. Reliability Requirements

System Availability:

99.5%



Database Availability:

99.9%



Backup Frequency:

Daily



Recovery Point Objective (RPO):

24 Hours



Recovery Time Objective (RTO):

30 Minutes



9. Maintainability Requirements

Code Coverage:

80%



CI Build Time:

< 5 Minutes



Deployment Success Rate:

99%



Mean Time To Recovery:

< 30 Minutes



10. Future Expansion Considerations

The architecture must support:

AI Resume Builder

AI Career Guidance

Recommendation Engine

Mobile Applications

Multi-language Support

Kubernetes Migration

Horizontal Scaling



End of SRS Part 1



























SOFTWARE REQUIREMENTS SPECIFICATION (SRS)

SkillBridge

Part 2 – Functional Requirements Specification

Version: 1.0



1. Functional Requirements Overview

This section defines the functional behavior of the SkillBridge platform.

Each requirement is uniquely identified using the following format:

FR-XXX

Where:

FR = Functional Requirement

XXX = Unique Requirement Number



2. Authentication & Authorization Requirements

FR-001 User Registration

Description

The system shall allow new users to register.

Actors

Student

School

Company

Mentor

Inputs

Name

Email

Password

User Type

Preconditions

User does not already exist.

Postconditions

Account created.

Verification email sent.

Priority

Critical



FR-002 Email Verification

Description

The system shall verify user email addresses before granting access.

Inputs

Verification Token

Postconditions

User status changes to VERIFIED.

Priority

Critical



FR-003 Login

Description

The system shall authenticate registered users.

Inputs

Email

Password

Outputs

JWT Access Token

Refresh Token

Performance Requirement

Authentication completed within 1 second.

Priority

Critical



FR-004 Logout

Description

The system shall invalidate active sessions.

Priority

High



FR-005 Password Reset

Description

The system shall allow users to reset forgotten passwords.

Priority

High



FR-006 RBAC Enforcement

Description

The system shall enforce role-based permissions.

Roles

Student

School

Company

Mentor

Admin

Priority

Critical



3. Student Management Requirements

FR-007 Student Profile Creation

Description

The system shall allow students to create profiles.

Fields

Name

Bio

Skills

Education

Interests

Priority

Critical



FR-008 Profile Update

Description

The system shall allow students to update profile information.

Priority

High



FR-009 Skill Management

Description

The system shall allow students to add, edit, and remove skills.

Priority

High



FR-010 Achievement Management

Description

The system shall allow students to manage achievements.

Priority

Medium



FR-011 Certificate Upload

Description

The system shall allow certificate uploads.

File Types

PDF

JPG

PNG

Maximum File Size

10 MB

Priority

High



4. Opportunity Management Requirements

FR-012 Opportunity Creation

Description

Companies and mentors shall be able to create opportunities.

Opportunity Types

Internship

Apprenticeship

Community Project

Skill Project

Priority

Critical



FR-013 Opportunity Draft Saving

Description

The system shall allow opportunities to be saved as drafts.

Priority

Medium



FR-014 Opportunity Publishing

Description

The system shall publish approved opportunities.

Priority

Critical



FR-015 Opportunity Search

Description

Students shall be able to search opportunities.

Search Parameters

Title

Skills

Category

Location

Performance

P95 < 1.5 sec

Priority

Critical



FR-016 Opportunity Filtering

Description

Students shall be able to filter opportunities.

Filters

Remote

Onsite

Paid

Unpaid

Duration

Priority

High



FR-017 Opportunity Details

Description

Students shall view detailed opportunity information.

Priority

Critical



5. Application Management Requirements

FR-018 Application Submission

Description

Students shall apply for opportunities.

Preconditions

User authenticated.

Opportunity active.

Postconditions

Application recorded.

Priority

Critical



FR-019 Duplicate Prevention

Description

The system shall prevent duplicate applications.

Priority

Critical



FR-020 Application Tracking

Description

Students shall track application status.

States

Submitted

Under Review

Shortlisted

Accepted

Rejected

Completed

Priority

Critical



FR-021 Application Review

Description

Companies and mentors shall review applications.

Priority

Critical



FR-022 Application Acceptance

Description

Organizations shall accept applications.

Priority

Critical



FR-023 Application Rejection

Description

Organizations shall reject applications.

Priority

Critical



6. Task Management Requirements

FR-024 Task Creation

Description

Organizations shall create internship tasks.

Fields

Title

Description

Deadline

Priority

High



FR-025 Task Assignment

Description

Tasks shall be assigned to students.

Priority

High



FR-026 Task Submission

Description

Students shall submit completed work.

Priority

Critical



FR-027 Task Review

Description

Mentors shall review submissions.

Priority

Critical



FR-028 Feedback Management

Description

Reviewers shall provide feedback.

Priority

High



7. Assessment Requirements

FR-029 Assessment Creation

Description

Organizations shall create assessments.

Priority

Medium



FR-030 Student Evaluation

Description

Students shall receive scores.

Score Range

0–100

Priority

High



FR-031 Performance Categorization

Description

The system shall categorize performance.

Categories

Outstanding

Excellent

Good

Average

Needs Improvement

Priority

Medium



8. Certificate Management Requirements

FR-032 Certificate Generation

Description

The system shall generate certificates.

Outputs

PDF

Unique Certificate ID

Performance

< 5 seconds

Priority

Critical



FR-033 Certificate Download

Description

Students shall download certificates.

Priority

High



FR-034 Certificate Verification

Description

Certificates shall be publicly verifiable.

Priority

Critical



9. Portfolio Requirements

FR-035 Portfolio Creation

Description

The system shall generate student portfolios.

Priority

Critical



FR-036 Portfolio Update

Description

Portfolio content shall update automatically.

Priority

High



FR-037 Public Portfolio Access

Description

Public users shall access portfolios.

Priority

High



FR-038 Portfolio Sharing

Description

Students shall share portfolio links.

Priority

Medium



10. Analytics Requirements

FR-039 Student Analytics

Description

The system shall provide student analytics.

Metrics

Applications

Certificates

Skills

Priority

High



FR-040 Institution Analytics

Description

Schools shall access student progress reports.

Priority

High



FR-041 Opportunity Analytics

Description

Organizations shall view opportunity statistics.

Priority

Medium



11. Notification Requirements

FR-042 Email Notifications

Events

Registration

Password Reset

Application Updates

Certificate Generation

Priority

Critical



FR-043 In-App Notifications

Events

New Opportunities

Task Assignments

Application Status

Priority

High



12. Administrative Requirements

FR-044 User Management

Description

Administrators shall manage users.

Priority

Critical



FR-045 Opportunity Moderation

Description

Administrators shall approve opportunities.

Priority

Critical



FR-046 Account Suspension

Description

Administrators shall suspend accounts.

Priority

Critical



FR-047 Audit Log Access

Description

Administrators shall access audit logs.

Priority

High



13. Reporting Requirements

FR-048 Institution Reports

Description

Generate school reports.

Format

PDF

CSV

Priority

Medium



FR-049 Student Reports

Description

Generate individual student reports.

Priority

Medium



FR-050 Platform Reports

Description

Generate platform-level reports.

Priority

Medium



14. Future Functional Requirements

FR-051 AI Resume Builder

Future Release



FR-052 AI Career Guidance

Future Release



FR-053 AI Skill Recommendation

Future Release



FR-054 AI Opportunity Matching

Future Release



FR-055 Mobile Application Support

Future Release



Functional Requirements Summary

Module

Requirements

Authentication

FR-001 – FR-006

Student Management

FR-007 – FR-011

Opportunity Management

FR-012 – FR-017

Applications

FR-018 – FR-023

Tasks

FR-024 – FR-028

Assessments

FR-029 – FR-031

Certificates

FR-032 – FR-034

Portfolio

FR-035 – FR-038

Analytics

FR-039 – FR-041

Notifications

FR-042 – FR-043

Administration

FR-044 – FR-047

Reporting

FR-048 – FR-050

End of SRS Part 2

























SOFTWARE REQUIREMENTS SPECIFICATION (SRS)

SkillBridge

Part 3 – Non-Functional Requirements (NFR)

Version: 1.0



1. Non-Functional Requirements Overview

This section defines quality attributes, operational characteristics, performance expectations, scalability objectives, reliability targets, security constraints, maintainability goals, and DevOps requirements.

Each requirement is uniquely identified as:

NFR-XXX



2. Performance Requirements

NFR-001 API Response Time

The system shall respond to API requests within defined latency limits.

Metric

Target

P50 Latency

< 200 ms

P95 Latency

< 500 ms

P99 Latency

< 1000 ms

Priority: Critical



NFR-002 Login Performance

The authentication process shall complete within:

< 1 second

Priority: Critical



NFR-003 Opportunity Search Performance

Opportunity search results shall be returned within:

Average: < 1 second



P95: < 1.5 seconds

Priority: Critical



NFR-004 Dashboard Load Time

User dashboards shall load within:

< 2 seconds

Priority: High



NFR-005 Portfolio Load Time

Public portfolio pages shall load within:

< 2 seconds

Priority: High



NFR-006 Certificate Generation Performance

Certificates shall be generated within:

< 5 seconds

Priority: High



3. Throughput Requirements

NFR-007 Authentication Throughput

Authentication service shall support:

100 Requests / Second

Priority: High



NFR-008 Opportunity Service Throughput

Opportunity management service shall support:

200 Requests / Second

Priority: High



NFR-009 Search Throughput

Search service shall support:

300 Requests / Second

Priority: High



NFR-010 Notification Throughput

Notification service shall support:

1,000 Notifications / Minute

Priority: Medium



4. Scalability Requirements

NFR-011 User Scalability

MVP shall support:

10,000 Registered Users

Future target:

1,000,000+ Users

Priority: Critical



NFR-012 Concurrent Users

MVP:

500 Concurrent Users

Future:

10,000 Concurrent Users

Priority: Critical



NFR-013 Request Volume

System shall support:

100,000 Requests / Day

Future:

10 Million Requests / Day

Priority: High



NFR-014 Horizontal Scalability

System architecture shall support horizontal scaling of:

Backend Services

Cache Layer

Database Read Replicas

Priority: High



5. Availability Requirements

NFR-015 Platform Availability

The platform shall maintain:

99.5% Uptime

Maximum Downtime:

< 3.6 Hours / Month

Priority: Critical



NFR-016 Database Availability

Database uptime shall be:

99.9%

Priority: Critical



NFR-017 Service Availability

Critical services shall remain operational even if non-critical services fail.

Priority: High



6. Reliability Requirements

NFR-018 API Success Rate

The system shall maintain:

> 99%

successful API requests.

Priority: Critical



NFR-019 Error Rate

System error rate shall remain:

< 1%

Priority: Critical



NFR-020 Certificate Generation Success Rate

The certificate generation service shall achieve:

99.5%

success rate.

Priority: High



7. Backup and Recovery Requirements

NFR-021 Backup Frequency

Database backups shall occur:

Every 24 Hours

Priority: Critical



NFR-022 Recovery Point Objective (RPO)

Maximum acceptable data loss:

24 Hours

Priority: Critical



NFR-023 Recovery Time Objective (RTO)

Maximum recovery time:

30 Minutes

Priority: Critical



NFR-024 Disaster Recovery

Recovery procedures shall be tested:

Quarterly

Priority: High



8. Security Requirements

NFR-025 Secure Authentication

The system shall use:

JWT Authentication

Refresh Tokens

Priority: Critical



NFR-026 Password Storage

Passwords shall be stored using:

bcrypt

Cost Factor = 12

Priority: Critical



NFR-027 HTTPS Enforcement

All communication shall occur over:

HTTPS

TLS 1.2+

Priority: Critical



NFR-028 Rate Limiting

The system shall limit requests to:

100 Requests / Minute / User

Priority: High



NFR-029 Account Lockout

Accounts shall be locked after:

5 Failed Login Attempts

Lock Duration:

15 Minutes

Priority: High



NFR-030 Access Logging

Authentication and authorization events shall be logged.

Priority: Critical



9. Usability Requirements

NFR-031 User Interface Consistency

The platform shall maintain a consistent design system.

Priority: Medium



NFR-032 Responsive Design

The system shall support:

Desktop

Tablet

Mobile Browsers

Priority: High



NFR-033 Accessibility

The platform shall meet basic accessibility guidelines.

Priority: Medium



10. Maintainability Requirements

NFR-034 Modular Architecture

The system shall follow modular design principles.

Priority: High



NFR-035 Code Coverage

Automated tests shall achieve:

> 80%

coverage.

Priority: High



NFR-036 Technical Documentation

All APIs and services shall be documented.

Priority: High



NFR-037 Dependency Management

Dependencies shall be tracked and updated regularly.

Priority: Medium



11. DevOps Requirements

NFR-038 CI/CD Pipeline

The system shall support automated deployment pipelines.

Priority: Critical



NFR-039 Build Duration

CI build time shall remain:

< 5 Minutes

Priority: High



NFR-040 Deployment Success Rate

Deployment success rate shall exceed:

99%

Priority: High



NFR-041 Rollback Capability

Rollback shall complete within:

10 Minutes

Priority: High



NFR-042 Deployment Frequency

Target:

5 Deployments / Week

Priority: Medium



12. Observability Requirements

NFR-043 Monitoring

The system shall expose metrics for:

CPU

Memory

Network

Requests

Errors

Priority: Critical



NFR-044 Metrics Collection

Metrics shall be collected using:

Prometheus

Priority: High



NFR-045 Visualization

Operational dashboards shall be available using:

Grafana

Priority: High



NFR-046 Log Aggregation

Application logs shall be centralized.

Priority: High



NFR-047 Alerting

Critical alerts shall be generated for:

Service Failure

Database Failure

High Error Rate

Priority: Critical



13. Storage Requirements

NFR-048 File Storage Capacity

MVP Storage:

500 GB

Future Capacity:

50 TB+

Priority: Medium



NFR-049 Maximum Upload Size

Maximum file size:

10 MB

Priority: Medium



NFR-050 Storage Durability

Certificate and portfolio files shall have:

99.999999999%

durability.

Priority: High



14. Compatibility Requirements

NFR-051 Browser Compatibility

Supported Browsers:

Chrome

Firefox

Edge

Safari

Priority: High



NFR-052 API Compatibility

APIs shall follow REST standards and OpenAPI specifications.

Priority: High



15. Audit Requirements

NFR-053 Audit Retention

Audit logs shall be retained for:

365 Days

Priority: High



NFR-054 Activity Tracking

The system shall record:

Logins

Opportunity Creation

Applications

Certificate Generation

Priority: High



16. Future Requirements

NFR-055 Kubernetes Readiness

Architecture shall support migration to Kubernetes.

Priority: Medium



NFR-056 Multi-Region Deployment

Architecture shall support deployment across multiple regions.

Priority: Medium



NFR-057 AI Service Integration

Architecture shall support AI microservices.

Priority: Medium



Summary

Category

Requirements

Performance

NFR-001 – NFR-006

Throughput

NFR-007 – NFR-010

Scalability

NFR-011 – NFR-014

Availability

NFR-015 – NFR-017

Reliability

NFR-018 – NFR-020

Backup & Recovery

NFR-021 – NFR-024

Security

NFR-025 – NFR-030

Usability

NFR-031 – NFR-033

Maintainability

NFR-034 – NFR-037

DevOps

NFR-038 – NFR-042

Observability

NFR-043 – NFR-047

Storage

NFR-048 – NFR-050

Compatibility

NFR-051 – NFR-052

Audit

NFR-053 – NFR-054

Future

NFR-055 – NFR-057

End of SRS Part 3













SOFTWARE REQUIREMENTS SPECIFICATION (SRS)

SkillBridge

Part 4 – Security Requirements, DevSecOps, Compliance & Threat Model

Version: 1.0



1. Security Overview

This document defines the security architecture, security controls, compliance requirements, threat mitigation strategies, and DevSecOps requirements for the SkillBridge platform.

The goal is to ensure:

Confidentiality

Integrity

Availability

Accountability

Non-Repudiation

of system resources and user data.



2. Security Objectives

SEC-001 Confidentiality

The system shall ensure that user information is accessible only to authorized users.

Priority: Critical



SEC-002 Integrity

The system shall prevent unauthorized modification of data.

Priority: Critical



SEC-003 Availability

The platform shall maintain:

99.5% Uptime

Priority: Critical



SEC-004 Accountability

All critical actions shall be logged.

Priority: Critical



SEC-005 Non-Repudiation

Certificate issuance and critical actions shall be traceable to responsible users.

Priority: High



3. Authentication Security Requirements

SEC-006 Secure Authentication

The platform shall use JWT-based authentication.

Priority: Critical



SEC-007 Access Token Expiration

Access Tokens shall expire after:

15 Minutes

Priority: Critical



SEC-008 Refresh Token Expiration

Refresh Tokens shall expire after:

7 Days

Priority: High



SEC-009 Email Verification

All newly created accounts shall require email verification.

Priority: Critical



SEC-010 Password Policy

Passwords must satisfy:

Minimum Length: 8



Uppercase Character



Lowercase Character



Numeric Character



Special Character

Priority: Critical



SEC-011 Password Storage

Passwords shall be stored using:

bcrypt

Cost Factor = 12

Priority: Critical



SEC-012 Account Lockout

Account shall be locked after:

5 Failed Attempts

Duration:

15 Minutes

Priority: High



4. Authorization Requirements

SEC-013 RBAC Enforcement

The platform shall implement role-based access control.

Roles:

Student

School

Company

Mentor

Admin

Priority: Critical



SEC-014 Least Privilege Principle

Users shall receive only permissions required for their role.

Priority: Critical



SEC-015 Administrative Access Restriction

Administrative functions shall only be available to authorized administrators.

Priority: Critical



5. Session Security

SEC-016 Session Timeout

Inactive sessions shall expire after:

30 Minutes

Priority: High



SEC-017 Session Revocation

Users shall be able to invalidate active sessions.

Priority: Medium



SEC-018 Multiple Device Sessions

The system shall track active devices.

Priority: Medium



6. Data Protection Requirements

SEC-019 Data Encryption in Transit

All network communication shall use:

HTTPS

TLS 1.2+

Priority: Critical



SEC-020 Data Encryption at Rest

Sensitive data shall be encrypted before storage.

Priority: High



SEC-021 Secure Certificate Storage

Certificates shall be stored in secure object storage.

Priority: High



SEC-022 Backup Encryption

Backups shall be encrypted.

Priority: High



7. API Security Requirements

SEC-023 API Authentication

All protected APIs shall require valid JWT tokens.

Priority: Critical



SEC-024 API Authorization

API access shall be role restricted.

Priority: Critical



SEC-025 API Rate Limiting

Limit:

100 Requests / Minute / User

Priority: High



SEC-026 API Input Validation

All incoming data shall be validated.

Priority: Critical



SEC-027 API Output Sanitization

Sensitive information shall never be exposed.

Priority: Critical



8. OWASP Security Controls

SEC-028 SQL Injection Protection

Use:

ORM

Parameterized Queries

Priority: Critical



SEC-029 XSS Protection

User-generated content shall be sanitized.

Priority: Critical



SEC-030 CSRF Protection

State-changing operations shall implement CSRF protection where applicable.

Priority: High



SEC-031 Broken Authentication Prevention

JWT validation shall be enforced.

Priority: Critical



SEC-032 Sensitive Data Exposure Prevention

Sensitive information shall never be exposed in logs.

Priority: Critical



9. File Security Requirements

SEC-033 Allowed File Types

Permitted:

PDF

JPG

PNG

Priority: High



SEC-034 File Size Restrictions

Maximum Upload:

10 MB

Priority: High



SEC-035 Malware Scanning

Uploaded files shall be scanned before storage.

Priority: Medium



10. Audit Logging Requirements

SEC-036 Authentication Logging

The system shall log:

Login

Logout

Failed Login

Priority: Critical



SEC-037 Administrative Activity Logging

The system shall log:

User Suspension

Opportunity Approval

Permission Changes

Priority: Critical



SEC-038 Certificate Audit Trail

Certificate generation and verification shall be recorded.

Priority: High



SEC-039 Audit Retention

Retention:

365 Days

Priority: High



11. Monitoring & Incident Detection

SEC-040 Failed Login Monitoring

Alert Threshold:

10 Failed Attempts / Minute

Priority: High



SEC-041 Suspicious Activity Monitoring

The system shall detect abnormal access patterns.

Priority: Medium



SEC-042 Error Rate Monitoring

Alert Threshold:

Error Rate > 5%

Priority: High



12. DevSecOps Requirements

SEC-043 Security Scanning

All code shall undergo automated security scanning.

Priority: High



SEC-044 Dependency Scanning

Third-party dependencies shall be scanned for vulnerabilities.

Priority: High



SEC-045 Secret Management

Secrets shall never be stored in source code.

Use:

Environment Variables

Secret Managers

Priority: Critical



SEC-046 Container Security

Docker images shall be scanned before deployment.

Priority: High



SEC-047 CI/CD Security Gates

Production deployment shall require:

Test Success

Security Scan Success

Priority: High



13. Threat Model

Threat T-001

Credential Theft

Impact:

High

Mitigation:

Strong Password Policy

JWT Expiration

Account Lockout



Threat T-002

SQL Injection

Impact:

Critical

Mitigation:

ORM

Input Validation



Threat T-003

XSS Attacks

Impact:

High

Mitigation:

Output Encoding

Sanitization



Threat T-004

Privilege Escalation

Impact:

Critical

Mitigation:

RBAC

Access Validation



Threat T-005

Data Leakage

Impact:

Critical

Mitigation:

Encryption

Access Controls



Threat T-006

DDoS Attacks

Impact:

High

Mitigation:

Rate Limiting

Reverse Proxy

CDN



14. Compliance Requirements

SEC-048 Privacy Compliance

Users shall be informed about data collection and usage.

Priority: High



SEC-049 Data Retention Compliance

Data shall follow retention policies.

Priority: High



SEC-050 User Data Access

Users shall be able to access their own information.

Priority: Medium



15. Disaster Recovery Security

SEC-051 Backup Verification

Backup restoration shall be tested quarterly.

Priority: High



SEC-052 Recovery Objectives

RPO:

24 Hours

RTO:

30 Minutes

Priority: Critical



16. Future Security Enhancements

SEC-053 Multi-Factor Authentication

Future Release



SEC-054 Single Sign-On

Future Release



SEC-055 Device Fingerprinting

Future Release



SEC-056 Behavioral Analysis

Future Release



SEC-057 Zero Trust Architecture

Future Release



Security Summary

Category

Requirements

Authentication

SEC-006 – SEC-012

Authorization

SEC-013 – SEC-015

Session Security

SEC-016 – SEC-018

Data Protection

SEC-019 – SEC-022

API Security

SEC-023 – SEC-027

OWASP Controls

SEC-028 – SEC-032

File Security

SEC-033 – SEC-035

Audit Logging

SEC-036 – SEC-039

Monitoring

SEC-040 – SEC-042

DevSecOps

SEC-043 – SEC-047

Compliance

SEC-048 – SEC-050

Disaster Recovery

SEC-051 – SEC-052

End of SRS Part 4







































SOFTWARE REQUIREMENTS SPECIFICATION (SRS)

SkillBridge

Part 5 – Database Requirements, Data Dictionary & Data Management Specification

Version: 1.0



1. Database Overview

The SkillBridge platform shall use a relational database management system (RDBMS) as the primary source of truth for transactional data.

Database Technology

PostgreSQL 16+

Cache Layer

Redis 7+

Object Storage

AWS S3

Purpose:

User Management

Opportunity Management

Applications

Assessments

Certificates

Analytics

Audit Logs



2. Database Design Goals

The database shall be designed to ensure:

Data Integrity

High Availability

Scalability

ACID Compliance

Query Performance

Fault Tolerance

Disaster Recovery



3. Data Requirements

DB-001 Unique User Identity

Every user shall have a globally unique identifier.

Type:

UUID

Priority: Critical



DB-002 Referential Integrity

Foreign key relationships shall be enforced.

Priority: Critical



DB-003 Soft Delete Support

Critical entities shall support soft deletion.

Fields:

deleted_at

deleted_by

Priority: High



DB-004 Audit Fields

All major entities shall contain:

created_at

updated_at

created_by

updated_by

Priority: High



4. Core Entity Definitions

Entity: Users

Purpose

Store authentication and identity information.

Table

users

Fields

id UUID PK



email VARCHAR(255)



password_hash TEXT



role ENUM



status ENUM



email_verified BOOLEAN



last_login TIMESTAMP



created_at TIMESTAMP



updated_at TIMESTAMP



Indexes

UNIQUE(email)

INDEX(role)

INDEX(status)



Entity: Students

Purpose

Store student profile information.

Table

students

Fields

id UUID PK



user_id UUID FK



school_id UUID FK



first_name VARCHAR(100)



last_name VARCHAR(100)



bio TEXT



class_level VARCHAR(50)



location VARCHAR(100)



portfolio_slug VARCHAR(255)



employability_score INTEGER



Indexes

INDEX(user_id)



INDEX(school_id)



INDEX(employability_score)



Entity: Schools

Purpose

Store institution information.

Table

schools

Fields

id UUID PK



name VARCHAR(255)



email VARCHAR(255)



subscription_plan VARCHAR(100)



student_limit INTEGER



status ENUM



Entity: Companies

Purpose

Store company information.

Fields

id UUID PK



name VARCHAR(255)



industry VARCHAR(100)



website VARCHAR(255)



verified BOOLEAN



status ENUM



Entity: Mentors

Purpose

Store mentor information.

Fields

id UUID PK



user_id UUID FK



specialization VARCHAR(255)



experience_years INTEGER



rating DECIMAL(3,2)



5. Opportunity Domain

Entity: Opportunities

Purpose

Store internships, apprenticeships and projects.

Table

opportunities

Fields

id UUID PK



title VARCHAR(255)



description TEXT



category VARCHAR(100)



location VARCHAR(255)



mode ENUM



stipend DECIMAL



deadline TIMESTAMP



status ENUM



company_id UUID FK



mentor_id UUID FK



Indexes

INDEX(category)



INDEX(location)



INDEX(deadline)



INDEX(status)



Entity: Opportunity Skills

Purpose

Map required skills.

Table

opportunity_skills

Fields:

opportunity_id UUID



skill_id UUID



6. Application Domain

Entity: Applications

Purpose

Track opportunity applications.

Table

applications

Fields

id UUID PK



student_id UUID FK



opportunity_id UUID FK



status ENUM



submitted_at TIMESTAMP



reviewed_at TIMESTAMP



Constraints

UNIQUE(student_id, opportunity_id)



Indexes

INDEX(status)



INDEX(student_id)



INDEX(opportunity_id)



7. Task Domain

Entity: Tasks

Purpose

Track assigned work.

Fields

id UUID PK



opportunity_id UUID FK



title VARCHAR(255)



description TEXT



deadline TIMESTAMP



status ENUM



Entity: Submissions

Purpose

Store task submissions.

Fields

id UUID PK



task_id UUID FK



student_id UUID FK



submission_url TEXT



submitted_at TIMESTAMP



8. Assessment Domain

Entity: Assessments

Purpose

Store evaluations.

Fields

id UUID PK



submission_id UUID FK



reviewer_id UUID FK



score INTEGER



feedback TEXT



Score Constraints

0 <= score <= 100



9. Certification Domain

Entity: Certificates

Purpose

Store generated certificates.

Fields

id UUID PK



student_id UUID FK



opportunity_id UUID FK



certificate_number VARCHAR(100)



certificate_url TEXT



issued_at TIMESTAMP



Constraints

UNIQUE(certificate_number)



Indexes

INDEX(student_id)



INDEX(opportunity_id)



10. Portfolio Domain

Entity: Portfolios

Purpose

Store portfolio metadata.

Fields

id UUID PK



student_id UUID FK



slug VARCHAR(255)



visibility ENUM



views_count INTEGER



11. Notification Domain

Entity: Notifications

Purpose

Store notification records.

Fields

id UUID PK



user_id UUID FK



title VARCHAR(255)



message TEXT



read BOOLEAN



created_at TIMESTAMP



12. Analytics Domain

Entity: Analytics Events

Purpose

Store user behavior events.

Fields

id UUID PK



user_id UUID FK



event_type VARCHAR(100)



resource_id UUID



timestamp TIMESTAMP



13. Audit Domain

Entity: Audit Logs

Purpose

Track system actions.

Fields

id UUID PK



user_id UUID FK



action VARCHAR(255)



resource_type VARCHAR(100)



resource_id UUID



ip_address VARCHAR(45)



created_at TIMESTAMP



14. Database Performance Requirements

DB-005 Query Latency

Read Operations:

< 100 ms

Write Operations:

< 200 ms

Priority: Critical



DB-006 Connection Pool

Maximum Active Connections:

100

Priority: High



DB-007 Slow Query Detection

Threshold:

500 ms

Priority: High



15. Storage Estimates

MVP

Users:

10,000

Storage:

500 GB



Future Scale

Users:

1,000,000+

Storage:

50 TB+



16. Backup Requirements

DB-008 Full Backup

Frequency:

Daily



DB-009 Incremental Backup

Frequency:

Hourly



DB-010 Backup Retention

Retention Period:

30 Days



17. Data Retention Policies

Data Type

Retention

User Accounts

Lifetime

Applications

5 Years

Certificates

Lifetime

Notifications

1 Year

Audit Logs

1 Year

Analytics Events

2 Years



18. Data Lifecycle

Create

   ↓

Update

   ↓

Archive

   ↓

Retention Period

   ↓

Permanent Deletion



19. Future Database Requirements

DB-011 Read Replicas

Support read scaling.



DB-012 Table Partitioning

Support analytics table partitioning.



DB-013 Sharding Readiness

Architecture shall support future sharding.



DB-014 Multi-Region Replication

Future deployment support.



20. Entity Relationship Summary

Users

  |

  ├── Students

  ├── Mentors



Schools

  |

  └── Students



Companies

  |

  └── Opportunities



Mentors

  |

  └── Opportunities



Opportunities

  |

  ├── Applications

  ├── Tasks

  └── Certificates



Tasks

  |

  └── Submissions



Submissions

  |

  └── Assessments



Students

  |

  ├── Portfolios

  ├── Certificates

  └── Applications



End of SRS Part 5