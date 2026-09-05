# LLD

LOW LEVEL DESIGN (LLD)

SkillBridge

Version: 1.0

Document Type: Low Level Design



1. Purpose

The purpose of this document is to describe the internal software design of the SkillBridge platform, including modules, services, APIs, database interactions, design patterns, package structure, and implementation details.

The LLD serves as the blueprint for developers during implementation.



2. Backend Architecture

Technology:

FastAPIPython 3.13PostgreSQLRedis

Architecture:

Controller LayerService LayerRepository LayerDatabase Layer



3. Project Structure

backend/├── app/│├── api/│   ├── auth/│   ├── students/│   ├── schools/│   ├── companies/│   ├── mentors/│   ├── opportunities/│   ├── applications/│   ├── tasks/│   ├── assessments/│   ├── certificates/│   ├── portfolios/│   ├── analytics/│   └── notifications/│├── services/│├── repositories/│├── models/│├── schemas/│├── middleware/│├── utils/│├── core/│└── tests/



4. Design Patterns

Service Layer Pattern

Responsibilities:

Business Logic 

Validation 

Workflow Processing 

Example:

StudentServiceOpportunityServiceApplicationServiceCertificateService



Repository Pattern

Responsibilities:

Database Operations 

Query Management 

Example:

StudentRepositoryApplicationRepositoryCertificateRepository



Factory Pattern

Used For:

User Creation

StudentFactoryCompanyFactoryMentorFactory



Strategy Pattern

Used For:

Skill Score Calculation

CodingSkillStrategyDesignSkillStrategyCommunicationSkillStrategy



Observer Pattern

Used For:

Notifications

ApplicationSubmittedCertificateGeneratedTaskAssigned



5. Authentication Module

Components

AuthControllerAuthServiceAuthRepository



Responsibilities

Register User 

Login User 

JWT Generation 

Refresh Tokens 

Password Reset 



6. Student Module

Components

StudentControllerStudentServiceStudentRepository



Responsibilities

Create Profile 

Update Profile 

Manage Skills 

Manage Achievements 



7. Opportunity Module

Components

OpportunityControllerOpportunityServiceOpportunityRepository



Responsibilities

Create Opportunity 

Search Opportunity 

Filter Opportunity 

Update Opportunity 



8. Application Module

Components

ApplicationControllerApplicationServiceApplicationRepository



Application States

SubmittedUnder ReviewAcceptedRejectedCompleted



9. Task Module

Responsibilities

Create TaskAssign TaskTrack TaskReview Submission



10. Assessment Module

Responsibilities

Evaluate SubmissionProvide ScoreGenerate Feedback



11. Certificate Module

Responsibilities

Generate CertificateVerify CertificateDownload Certificate



Certificate Flow

Assessment Completed        |Generate PDF        |Store in S3        |Save Metadata



12. Portfolio Module

Responsibilities

Generate Public PortfolioDisplay SkillsDisplay CertificatesDisplay Projects



13. Analytics Module

Responsibilities

Track EventsGenerate ReportsGenerate KPIs





14. Notification Module

Responsibilities

Email NotificationsIn-App Notifications

Events:

RegistrationApplication SubmittedApplication AcceptedCertificate Generated



































Additional Sections for LLD (Add after Section 14)

15. Class Design

The system follows an object-oriented design approach where each domain entity is represented by a dedicated class.

Core Domain Classes

User

 ├── Student

 ├── School

 ├── Company

 ├── Mentor

 └── Admin



Opportunity

Application

Task

Submission

Assessment

Certificate

Portfolio

Notification

AuditLog

User Class

Attributes:

id

email

password_hash

role

status

Methods:

login()

logout()

reset_password()



Student Class

Attributes:

student_id

skills

achievements

employability_score

Methods:

apply_opportunity()

update_profile()

generate_portfolio()



Opportunity Class

Attributes:

title

description

category

deadline

status

Methods:

publish()

close()

archive()



16. State Management Design

Application Lifecycle

Draft

 ↓

Submitted

 ↓

Under Review

 ↓

Accepted

 ↓

In Progress

 ↓

Completed

Alternative Path:

Under Review

      ↓

Rejected



Opportunity Lifecycle

Draft

 ↓

Pending Approval

 ↓

Published

 ↓

Applications Open

 ↓

Closed

 ↓

Archived



Certificate Lifecycle

Generated

 ↓

Issued

 ↓

Downloaded

 ↓

Verified



17. Database Access Design

The system follows Repository Pattern for all database interactions.

Controller

     |

Service

     |

Repository

     |

PostgreSQL

Read Operations

Profile Retrieval

Opportunity Search

Certificate Lookup

Dashboard Data

Write Operations

User Registration

Application Submission

Task Submission

Certificate Creation



Transaction Management

Critical workflows shall execute within database transactions.

Example:

BEGIN



Create Application



Create Audit Log



Generate Notification



COMMIT

Rollback on failure.



18. API Design Summary

Authentication APIs

POST   /api/v1/auth/register



POST   /api/v1/auth/login



POST   /api/v1/auth/refresh



POST   /api/v1/auth/logout



Student APIs

GET    /api/v1/students/profile



PUT    /api/v1/students/profile



GET    /api/v1/students/portfolio



Opportunity APIs

GET    /api/v1/opportunities



GET    /api/v1/opportunities/{id}



POST   /api/v1/opportunities



PUT    /api/v1/opportunities/{id}



Application APIs

POST   /api/v1/applications



GET    /api/v1/applications



PUT    /api/v1/applications/{id}/status



Certificate APIs

GET    /api/v1/certificates



GET    /api/v1/certificates/{id}



GET    /api/v1/certificates/verify/{certificate_id}



19. Sequence Design

Student Registration Sequence

Student

   |

Frontend

   |

Auth Controller

   |

Auth Service

   |

Auth Repository

   |

Database



Opportunity Application Sequence

Student

   |

Application Controller

   |

Application Service

   |

Application Repository

   |

Database



Certificate Generation Sequence

Assessment Module

      |

Certificate Service

      |

PDF Generator

      |

AWS S3

      |

Database



20. Caching Design

Technology:

Redis

Cache Keys

student:{id}



opportunity:{id}



dashboard:{user_id}



certificate:{id}



TTL Strategy

Opportunity Cache = 15 Minutes



Dashboard Cache = 5 Minutes



Analytics Cache = 10 Minutes



21. Background Jobs

The platform shall support asynchronous background processing.

Jobs

Certificate Generation



Email Notifications



Analytics Aggregation



Expired Opportunity Cleanup



Audit Log Archival

Technology:

APScheduler

Future:

Celery + Redis



22. Exception Catalogue

Authentication Errors

AUTH_001

Invalid Credentials



AUTH_002

Expired Token



AUTH_003

Unauthorized Access



Opportunity Errors

OPP_001

Opportunity Not Found



OPP_002

Opportunity Closed



Application Errors

APP_001

Duplicate Application



APP_002

Application Not Found



Certificate Errors

CERT_001

Certificate Not Found



CERT_002

Invalid Certificate



23. Detailed Project Structure

backend/



app/



api/



services/



repositories/



models/



schemas/



middleware/



utils/



core/



config.py



database.py



security.py



exceptions.py



logging.py



main.py



tests/



24. Final LLD Architecture

Client

   |

Next.js

   |

Controller Layer

   |

Service Layer

   |

Repository Layer

   |

PostgreSQL



        |

        +---- Redis



        |

        +---- AWS S3

The architecture follows:

Service Layer Pattern

Repository Pattern

Factory Pattern

Strategy Pattern

Observer Pattern

and supports scalability, maintainability, security, and future migration to microservices.





15. DTOs (Schemas)

Example:

StudentCreateDTO

{  "first_name": "Aviral",  "last_name": "Mishra",  "bio": "MCA Student"}



OpportunityCreateDTO

{  "title": "Frontend Intern",  "category": "Internship",  "location": "Remote"}



16. Middleware Design

JWT Middleware

Responsibilities:

Validate TokenExtract UserAuthorize Request



Rate Limiter Middleware

100 Requests / Minute



Audit Middleware

Responsibilities:

Track RequestsStore Logs



17. Redis Design

Use Cases:

JWT BlacklistRate LimitingDashboard CacheOpportunity Cache



18. Error Handling Strategy

Common Response:

{  "success": false,  "message": "Opportunity not found",  "error_code": "OPP_404"}



19. Logging Strategy

Levels:

INFOWARNINGERRORCRITICAL

Stored:

API LogsAuth LogsAudit Logs



20. Unit Testing Structure

tests/auth/student/opportunity/application/certificate/

Coverage Target:

80%+



21. Coding Standards

Naming Convention:

snake_case → PythonPascalCase → ClassesUPPER_CASE → Constants

Linting:

RuffBlack



22. LLD Summary

Architecture:

Controller      |Service      |Repository      |PostgreSQL

Patterns:

Service LayerRepositoryFactoryStrategyObserver

Security:

JWTRBACRate LimitingAudit Logging

