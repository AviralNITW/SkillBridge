# ER diagram

Entity Relationship Diagram (ERD)

Purpose

The ER Diagram defines the logical database structure of the SkillBridge platform and illustrates relationships between entities.

The design follows normalization principles to minimize redundancy while maintaining performance and scalability.



Core Entities

Users

user_id (PK)



email



password_hash



role



status



email_verified



created_at



updated_at



Students

student_id (PK)



user_id (FK)



school_id (FK)



first_name



last_name



bio



employability_score



portfolio_slug

Relationship:

User (1) ---- (1) Student



Schools

school_id (PK)



name



email



subscription_plan



status

Relationship:

School (1) ---- (N) Students



Companies

company_id (PK)



name



industry



website



verified

Relationship:

Company (1) ---- (N) Opportunities



Mentors

mentor_id (PK)



user_id (FK)



specialization



experience_years

Relationship:

User (1) ---- (1) Mentor



Opportunities

opportunity_id (PK)



company_id (FK)



mentor_id (FK)



title



description



category



location



mode



stipend



deadline



status

Relationships:

Company (1) ---- (N) Opportunities



Mentor (1) ---- (N) Opportunities



Applications

application_id (PK)



student_id (FK)



opportunity_id (FK)



status



submitted_at

Relationships:

Student (1) ---- (N) Applications



Opportunity (1) ---- (N) Applications



Tasks

task_id (PK)



opportunity_id (FK)



title



description



deadline

Relationship:

Opportunity (1) ---- (N) Tasks



Submissions

submission_id (PK)



task_id (FK)



student_id (FK)



submission_url



submitted_at

Relationships:

Task (1) ---- (N) Submissions



Student (1) ---- (N) Submissions



Assessments

assessment_id (PK)



submission_id (FK)



reviewer_id



score



feedback

Relationship:

Submission (1) ---- (1) Assessment



Certificates

certificate_id (PK)



student_id (FK)



opportunity_id (FK)



certificate_number



certificate_url



issued_at

Relationships:

Student (1) ---- (N) Certificates



Opportunity (1) ---- (N) Certificates



Portfolios

portfolio_id (PK)



student_id (FK)



slug



visibility



views_count

Relationship:

Student (1) ---- (1) Portfolio



Notifications

notification_id (PK)



user_id (FK)



title



message



read

Relationship:

User (1) ---- (N) Notifications



Audit Logs

audit_id (PK)



user_id (FK)



action



resource_type



resource_id



ip_address



created_at

Relationship:

User (1) ---- (N) Audit Logs



ER Diagram Summary

Users

│

├── Students

│     │

│     ├── Applications

│     ├── Submissions

│     ├── Certificates

│     └── Portfolio

│

├── Mentors

│     │

│     └── Opportunities

│

└── Notifications



Schools

│

└── Students



Companies

│

└── Opportunities



Opportunities

│

├── Applications

├── Tasks

└── Certificates



Tasks

│

└── Submissions



Submissions

│

└── Assessments



Users

│

└── Audit Logs

