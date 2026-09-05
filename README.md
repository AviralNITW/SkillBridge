# SkillBridge

SkillBridge is an enterprise SaaS platform designed to align higher education with the National Education Policy (NEP) 2020. The platform bridges the gap between academic theory and industry employability by providing structured pathways for skill discovery, verified internships, apprenticeship management, milestone-based task evaluations, dynamic public portfolios, and cryptographically verifiable digital certificates.

---

## Table of Contents

1. [Platform Overview and NEP 2020 Alignment](#platform-overview-and-nep-2020-alignment)
2. [System Architecture](#system-architecture)
3. [UML Sequence Diagram](#uml-sequence-diagram)
4. [Database Architecture and ER Model](#database-architecture-and-er-model)
5. [Core Functional Modules](#core-functional-modules)
6. [Technology Stack](#technology-stack)
7. [Repository Structure](#repository-structure)
8. [API Reference](#api-reference)
9. [Redis Caching and Performance Architecture](#redis-caching-and-performance-architecture)
10. [Docker Orchestration and Local Setup](#docker-orchestration-and-local-setup)
11. [Security, Governance, and Verification](#security-governance-and-verification)
12. [License](#license)

---

## Platform Overview and NEP 2020 Alignment

Traditional education systems often prioritize theoretical examinations over practical industry readiness. SkillBridge operationalizes the core objectives of the National Education Policy (NEP) 2020 by establishing an integrated ecosystem for:

- **Experiential and Vocational Learning**: Connecting students with real-world industry tasks, vocational specialists, and verified apprenticeships.
- **Continuous Comprehensive Assessment**: Replacing singular exam metrics with milestone rubrics, mentor evaluations, and structured feedback loops.
- **Verifiable Skill Portfolios**: Generating dynamic, shareable digital portfolios backed by cryptographically verifiable certificates and project audit trails.
- **Institutional Governance**: Enabling colleges, universities, and training institutes to monitor student employability metrics and industry engagement rates.

---

## System Architecture

The following UML component and deployment diagram illustrates the cloud-native multi-tier architecture of SkillBridge, covering client applications, API gateways, domain services, caching, persistence, and external cloud integrations.

```mermaid
graph TD
    %% Custom Vibrant Color Classes
    classDef clientStyle fill:#1e40af,stroke:#60a5fa,stroke-width:2px,color:#ffffff;
    classDef gatewayStyle fill:#5b21b6,stroke:#a78bfa,stroke-width:2px,color:#ffffff;
    classDef serviceStyle fill:#065f46,stroke:#34d399,stroke-width:2px,color:#ffffff;
    classDef dbStyle fill:#831843,stroke:#f472b6,stroke-width:2px,color:#ffffff;
    classDef cacheStyle fill:#9a3412,stroke:#fb923c,stroke-width:2px,color:#ffffff;
    classDef cloudStyle fill:#075985,stroke:#38bdf8,stroke-width:2px,color:#ffffff;

    subgraph Client_Tier ["Presentation Layer (Next.js 15 / React 19 / TypeScript)"]
        StudentPortal["Student Dashboard &\nOpportunity Portal"]:::clientStyle
        OrgPortal["Organization &\nMentor Workspace"]:::clientStyle
        InstitutionPortal["Institutional Governance\n& Analytics Console"]:::clientStyle
        PublicPortfolio["Public Dynamic Portfolio\n& Certificate Verifier"]:::clientStyle
    end

    subgraph Gateway_Tier ["API Gateway & Middleware Layer (Express.js / TypeScript)"]
        Router["Express API Router\n(/api/v1)"]:::gatewayStyle
        AuthGuard["JWT Authentication &\nRBAC Security Filter"]:::gatewayStyle
        RateLimiter["Redis-Backed Distributed\nRate Limiting Engine"]:::gatewayStyle
        ValidationPipe["Zod Schema\nValidation Pipeline"]:::gatewayStyle
        UploadHandler["Multer & S3\nStream Upload Handler"]:::gatewayStyle
        Logger["Winston & Morgan\nAudit Logger"]:::gatewayStyle
    end

    subgraph Service_Tier ["Domain Microservices & Business Logic Layer"]
        AuthService["Auth & Session\nService"]:::serviceStyle
        StudentService["Student Profile &\nSkill Graph Service"]:::serviceStyle
        OrgService["Organization & Branch\nManagement Service"]:::serviceStyle
        OpportunityService["Opportunity Matching\n& Search Engine"]:::serviceStyle
        ApplicationService["Application Workflow\n& Lifecycle Manager"]:::serviceStyle
        TaskService["Task Assignment &\nSubmission Pipeline"]:::serviceStyle
        AssessmentService["Assessment Engine &\nRubric Scoring"]:::serviceStyle
        CertificateService["Certificate Generation\n& Verification Service"]:::serviceStyle
        PortfolioService["Portfolio Aggregator\n& Analytics Engine"]:::serviceStyle
        NotificationService["Notification &\nDispatch Worker"]:::serviceStyle
    end

    subgraph Persistence_Tier ["Data, Cache, and Cloud Storage Layer"]
        PrismaClient["Prisma ORM Layer (v5)"]:::dbStyle
        PostgresDB[("PostgreSQL Relational Database\n(Port 5432)")]:::dbStyle
        RedisCache[("Redis In-Memory Cache &\nSession Store (Port 6379)")]:::cacheStyle
        AWSS3[("AWS S3 / Cloud Storage\n(Artifacts & Submissions)")]:::cloudStyle
    end

    %% Subgraph Container Styling
    style Client_Tier fill:#0f172a,stroke:#3b82f6,stroke-width:2px,color:#93c5fd
    style Gateway_Tier fill:#1e1b4b,stroke:#8b5cf6,stroke-width:2px,color:#c4b5fd
    style Service_Tier fill:#062e24,stroke:#10b981,stroke-width:2px,color:#6ee7b7
    style Persistence_Tier fill:#500724,stroke:#ec4899,stroke-width:2px,color:#f472b6

    %% Data Flow Connections
    StudentPortal --> Router
    OrgPortal --> Router
    InstitutionPortal --> Router
    PublicPortfolio --> Router

    Router --> RateLimiter
    RateLimiter --> AuthGuard
    AuthGuard --> ValidationPipe
    ValidationPipe --> Logger

    Logger --> AuthService
    Logger --> StudentService
    Logger --> OrgService
    Logger --> OpportunityService
    Logger --> ApplicationService
    Logger --> TaskService
    Logger --> AssessmentService
    Logger --> CertificateService
    Logger --> PortfolioService
    Logger --> NotificationService

    AuthService --> PrismaClient
    AuthService --> RedisCache
    StudentService --> PrismaClient
    OrgService --> PrismaClient
    OpportunityService --> PrismaClient
    OpportunityService --> RedisCache
    ApplicationService --> PrismaClient
    TaskService --> PrismaClient
    TaskService --> AWSS3
    AssessmentService --> PrismaClient
    CertificateService --> PrismaClient
    CertificateService --> AWSS3
    PortfolioService --> PrismaClient
    PortfolioService --> RedisCache

    PrismaClient --> PostgresDB
```

---

## UML Sequence Diagram

This sequence diagram illustrates the complete student journey: discovering an opportunity, submitting an application, organization review, task assignment and submission, mentor rubric assessment, and automatic certificate issuance with portfolio integration.

```mermaid
sequenceDiagram
    autonumber
    actor Student as Student
    participant Portal as SkillBridge Frontend
    participant Gateway as Express API Gateway
    participant OppService as Opportunity Service
    participant AppService as Application Service
    participant TaskService as Task Engine
    actor Mentor as Mentor / Organization
    participant EvalService as Assessment Service
    participant CertService as Certificate Service
    participant DB as PostgreSQL Database

    Student->>Portal: Search Internships / Apprenticeships
    Portal->>Gateway: GET /api/v1/opportunities
    Gateway->>OppService: Query active listings
    OppService-->>Portal: Return opportunity records
    Student->>Portal: Apply with Cover Note & Resume
    Portal->>Gateway: POST /api/v1/applications
    Gateway->>AppService: Create application (Status: PENDING)
    AppService->>DB: INSERT INTO Application
    DB-->>AppService: Application Created

    Mentor->>Portal: Review Application & Accept
    Portal->>Gateway: PATCH /api/v1/applications/:id/status (ACCEPTED)
    Gateway->>AppService: Transition status to ACCEPTED
    AppService->>DB: UPDATE Application SET status = ACCEPTED

    Mentor->>Portal: Assign Milestone Tasks
    Portal->>Gateway: POST /api/v1/tasks
    Gateway->>TaskService: Create Task with Deadline & Guidelines
    TaskService->>DB: INSERT INTO Task

    Student->>Portal: Submit Work Deliverable
    Portal->>Gateway: POST /api/v1/tasks/:id/submissions
    Gateway->>TaskService: Record Deliverable URL & Notes
    TaskService->>DB: INSERT INTO Submission

    Mentor->>Portal: Grade Deliverable with Rubric Criteria
    Portal->>Gateway: POST /api/v1/assessments
    Gateway->>EvalService: Calculate Weighted Score & Feedback
    EvalService->>DB: INSERT INTO AssessmentReport

    alt Assessment Criteria Passed (Score >= Passing Threshold)
        EvalService->>CertService: Trigger Certificate Issuance
        CertService->>DB: INSERT INTO Certificate (Unique Verification Code)
        CertService->>DB: UPDATE Portfolio (Add Verified Credential Badge)
        CertService-->>Portal: Issue Verifiable Credential Link
        Portal-->>Student: Display Digital Certificate & Updated Portfolio
    else Assessment Below Threshold
        EvalService-->>Portal: Return Revision Request & Mentor Feedback
    end
```

---

## Database Architecture and ER Model

The data layer is managed via PostgreSQL with Prisma ORM, utilizing normalized relational tables with enforced foreign key integrity and audit triggers.

```mermaid
erDiagram
    User ||--o| Student : "profile_as"
    User ||--o| Mentor : "mentors_as"
    User ||--o{ UserSession : "authenticates"
    User ||--o{ AuditLog : "triggers"

    Organization ||--o{ OrganizationMember : "employs"
    Organization ||--o{ Opportunity : "publishes"
    Organization ||--o{ Internship : "manages"
    Organization ||--o{ OrganizationBranch : "operates"

    Student ||--o{ Application : "submits"
    Student ||--o{ Submission : "uploads"
    Student ||--o| Portfolio : "owns"
    Student ||--o{ StudentSkill : "possesses"
    Student ||--o{ StudentProject : "builds"
    Student ||--o{ Certificate : "earns"

    Opportunity ||--o{ Application : "receives"
    Opportunity ||--o{ OpportunitySkill : "requires"
    Opportunity ||--o{ OpportunityBookmark : "saved_by"

    Application ||--o{ ApplicationStatusHistory : "tracks"
    Application ||--o{ ApplicationNote : "annotated_with"

    Task ||--o{ Submission : "evaluated_via"
    Internship ||--o{ InternshipTask : "contains"
    InternshipTask ||--o{ InternshipSubmission : "receives"
    InternshipSubmission ||--o{ InternshipSubmissionReview : "reviewed_by"

    AssessmentRubric ||--o{ RubricCriteria : "defines"
    InternshipAssessment ||--o{ AssessmentReport : "generates"

    Certificate ||--o{ CertificateVerification : "verified_via"
    Certificate ||--o{ CertificateDownload : "downloaded_by"

    Portfolio ||--o{ PortfolioProject : "features"
    Portfolio ||--o{ PortfolioCertificate : "showcases"
    Portfolio ||--o{ PortfolioAnalytics : "measures"

    User {
        string id PK
        string email UK
        string password
        string role
        boolean isActive
        boolean isVerified
        datetime createdAt
        datetime updatedAt
    }

    Student {
        string id PK
        string userId FK
        string firstName
        string lastName
        string collegeName
        string rollNumber
        string degree
        string department
        int graduationYear
        float cgpa
        string resumeUrl
        datetime createdAt
    }

    Organization {
        string id PK
        string name
        string slug UK
        string orgType
        string industry
        string website
        string verificationStatus
        datetime createdAt
    }

    Opportunity {
        string id PK
        string organizationId FK
        string title
        string description
        string oppType
        string locationType
        string stipendType
        float stipendAmount
        int durationWeeks
        string status
        datetime deadline
        datetime createdAt
    }

    Application {
        string id PK
        string opportunityId FK
        string studentId FK
        string status
        string coverLetter
        datetime appliedAt
        datetime updatedAt
    }

    Task {
        string id PK
        string opportunityId FK
        string title
        string instructions
        datetime dueDate
        int maxPoints
        datetime createdAt
    }

    Submission {
        string id PK
        string taskId FK
        string studentId FK
        string deliverableUrl
        string notes
        string status
        float score
        datetime submittedAt
    }

    Certificate {
        string id PK
        string studentId FK
        string opportunityId FK
        string certificateNumber UK
        string issueDate
        string verificationUrl
        string pdfUrl
        datetime createdAt
    }

    Portfolio {
        string id PK
        string studentId FK
        string customSlug UK
        string bio
        string theme
        boolean isPublic
        datetime updatedAt
    }
```

---

## Core Functional Modules

### 1. Authentication and Authorization
- Multi-role support: `STUDENT`, `ORGANIZATION_ADMIN`, `MENTOR`, `INSTITUTION_ADMIN`, and `SUPER_ADMIN`.
- Stateless JWT architecture with token rotation, refresh tokens, and session tracking via Redis.
- Password encryption using bcrypt with configurable work factors.

### 2. Opportunity Discovery and Matching
- Multi-faceted filtering: Location (Remote, On-site, Hybrid), Opportunity Type (Internship, Apprenticeship, Project, Vocational Training), Domain, and Required Skill Graph.
- Bookmark, saved searches, and view analytics for opportunity publishers.

### 3. Application Lifecycle Management
- Multi-state progression: `DRAFT` -> `SUBMITTED` -> `UNDER_REVIEW` -> `SHORTLISTED` -> `INTERVIEW_SCHEDULED` -> `ACCEPTED` / `REJECTED`.
- Complete status change history logs with reviewer annotations.

### 4. Task and Milestone Management
- Structured task creation with deliverable guidelines, rubrics, and deadlines.
- Multi-file attachments and external project repository linking.
- Direct feedback and revision requests prior to final grading.

### 5. NEP-Aligned Assessment Engine
- Rubric-based scoring criteria evaluating technical execution, documentation, timeliness, and problem-solving.
- Automated grade computation and weighted performance analytics.

### 6. Digital Credentialing and Verification
- Automated certificate generation upon successful completion of required milestones.
- Unique cryptographic certificate identifiers with public URL verification routes for employers and institutions.

### 7. Dynamic Student Portfolios
- Public showcase pages aggregating verified skills, completed projects, mentor recommendations, and certificates.
- Built-in traffic analytics (profile views, unique visitors, recruiter downloads).

---

## Technology Stack

### Frontend Client
- **Framework**: Next.js 15 (App Router) / React 19
- **Language**: TypeScript 5.4+
- **Styling**: TailwindCSS
- **Icons**: Lucide React
- **Client Authentication**: Clerk React / Custom JWT Interceptor
- **Build Engine**: Vite / Next Compiler

### Backend API Server
- **Runtime**: Node.js (v20+ LTS)
- **Framework**: Express.js (v4.19+)
- **Language**: TypeScript (v5.4+)
- **ORM**: Prisma ORM (v5.15+)
- **Database**: PostgreSQL (v15+)
- **Cache & Session**: Redis (v7+)
- **Schema Validation**: Zod (v3.23+)
- **File Storage**: AWS S3 SDK / Multer Stream
- **Security & Logging**: Winston, Morgan, CORS, bcrypt, jsonwebtoken, ua-parser-js

---

## Repository Structure

```text
SkillBridge/
├── backend/                         # Express.js TypeScript Backend API
│   ├── prisma/
│   │   └── schema.prisma            # Prisma schema and relational models
│   ├── src/
│   │   ├── config/                  # Environment, database, Redis, S3 config
│   │   ├── core/                    # Base controllers, middlewares, error handlers
│   │   ├── modules/                 # Domain-driven feature modules
│   │   │   ├── applications/        # Application lifecycle controllers & services
│   │   │   ├── assessments/         # Rubric evaluation & score calculation
│   │   │   ├── auth/                # JWT auth, sessions, registration
│   │   │   ├── certificates/        # Credential issuance & verification
│   │   │   ├── notifications/       # Internal notifications & dispatch
│   │   │   ├── opportunities/       # Listings, filters, and search queries
│   │   │   ├── organizations/       # Company, university, branch management
│   │   │   ├── portfolios/          # Public portfolio builder & analytics
│   │   │   ├── students/            # Profile, education, and skill graphs
│   │   │   └── tasks/               # Milestone task assignment & submissions
│   │   ├── utils/                   # Shared helpers, formatters, validators
│   │   └── server.ts                # Application entrypoint & HTTP bootstrap
│   ├── Dockerfile                   # Multi-stage production build for backend
│   ├── package.json                 # Backend dependencies and scripts
│   └── tsconfig.json                # TypeScript compiler configuration
│
├── frontend/                        # Next.js / React Web Application
│   ├── src/                         # Source components, pages, hooks, state
│   ├── public/                      # Static assets and fonts
│   ├── Dockerfile                   # Multi-stage production build for frontend
│   ├── package.json                 # Frontend dependencies and scripts
│   └── vite.config.ts / tsconfig    # Build and compiler configurations
│
├── docs/                            # Architecture Decision Records (ADRs)
├── markdown/                        # Comprehensive specifications (PRD, HLD, LLD, BRD)
├── docker-compose.yml               # Unified multi-container orchestration
├── .gitignore                       # Repository exclusion rules
└── README.md                        # Master project documentation
```

---

## API Reference

All REST endpoints are namespaced under `/api/v1`.

### Authentication
- `POST /api/v1/auth/register` - Create user and initiate role profile.
- `POST /api/v1/auth/login` - Authenticate credentials and receive access/refresh tokens.
- `POST /api/v1/auth/refresh-token` - Renew access token using refresh token.
- `POST /api/v1/auth/logout` - Invalidate active session in Redis.

### Opportunities
- `GET /api/v1/opportunities` - Query opportunities with multi-criteria filters.
- `POST /api/v1/opportunities` - Create a new internship or apprenticeship posting.
- `GET /api/v1/opportunities/:id` - Retrieve full opportunity specification.
- `PUT /api/v1/opportunities/:id` - Update listing details.
- `DELETE /api/v1/opportunities/:id` - Archive or deactivate listing.

### Applications
- `POST /api/v1/applications` - Submit an application for an opportunity.
- `GET /api/v1/applications/student` - List all applications for current student.
- `GET /api/v1/applications/opportunity/:id` - List applicants for an opportunity.
- `PATCH /api/v1/applications/:id/status` - Transition applicant status.

### Tasks and Milestones
- `POST /api/v1/tasks` - Create milestone task for accepted candidates.
- `GET /api/v1/tasks/opportunity/:id` - List tasks assigned to an opportunity.
- `POST /api/v1/tasks/:id/submissions` - Upload deliverable submission.
- `GET /api/v1/tasks/:id/submissions` - Retrieve submissions for review.

### Assessments and Rubrics
- `POST /api/v1/assessments` - Record evaluation using structured rubric criteria.
- `GET /api/v1/assessments/student/:id` - Retrieve assessment history for student.

### Certificates and Portfolios
- `POST /api/v1/certificates/issue` - Generate verified completion certificate.
- `GET /api/v1/certificates/verify/:code` - Public verification endpoint.
- `GET /api/v1/portfolios/:slug` - Fetch public dynamic student portfolio.

---

## Redis Caching and Performance Architecture

SkillBridge utilizes Redis for high-throughput performance optimization:

1. **Session Management**: Fast token validation and instant revocation without hitting PostgreSQL on every request.
2. **Opportunity Feed Caching**: Active opportunity listings cached with time-to-live (TTL) invalidation on new publications.
3. **API Rate Limiting**: Distributed token bucket rate limiting preventing brute-force and DDoS attacks.
4. **Portfolio Read Caching**: Public portfolio pages cached in-memory with background revalidation.

---

## Docker Orchestration and Local Setup

### Prerequisites
- Docker Engine (v24.0+) & Docker Compose (v2.0+)
- Node.js (v20+ LTS)
- npm or yarn

### 1. Clone the Repository
```bash
git clone https://github.com/AviralNITW/SkillBridge.git
cd SkillBridge
```

### 2. Run with Docker Compose (Recommended)
Launch PostgreSQL, Redis, Express Backend, and Next.js Frontend with a single command:
```bash
docker-compose up --build
```

- **Frontend Application**: `http://localhost:3000`
- **Backend API Gateway**: `http://localhost:5000/api/v1`
- **PostgreSQL Database**: `localhost:5432`
- **Redis Cache Instance**: `localhost:6379`

### 3. Manual Local Development Setup

#### Backend Setup:
```bash
cd backend
npm install
cp .env.example .env
npx prisma generate
npx prisma db push
npm run dev
```

#### Frontend Setup:
```bash
cd ../frontend
npm install
npm run dev
```

---

## Security, Governance, and Verification

- **Role-Based Access Control (RBAC)**: Enforces least-privilege principles across student, mentor, and organizational boundaries.
- **Cryptographic Certificate Verification**: Every issued credential receives a SHA-256 derived verification code linked to permanent audit logs.
- **Data Protection & Sanitization**: Comprehensive input validation with Zod schemas and SQL injection protection through Prisma parameterized queries.
- **Audit Logging**: Sensitive operations (status transitions, score grading, certificate generation) written to immutable audit tables.

---

## License

This project is licensed under the ISC License. Refer to the LICENSE file for full terms.
