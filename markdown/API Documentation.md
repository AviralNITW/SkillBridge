# API Documentation

SkillBridge API Documentation

Version: 1.0

API Specification: REST API

Protocol: HTTPS

Data Format: JSON

Authentication: JWT Bearer Token

Base URL:

https://api.skillbridge.com/api/v1



1. API Standards

Request Headers

Public APIs

Content-Type: application/json

Protected APIs

Authorization: Bearer <JWT_TOKEN>

Content-Type: application/json



Standard Success Response

{

  "success": true,

  "message": "Operation completed successfully",

  "data": {}

}



Standard Error Response

{

  "success": false,

  "message": "Application already exists",

  "error_code": "APP_001"

}



Pagination Response

{

  "success": true,

  "data": [],

  "pagination": {

    "page": 1,

    "limit": 10,

    "total_records": 100,

    "total_pages": 10

  }

}



2. Authentication APIs

Register User

Endpoint

POST /auth/register

Request Body

{

  "email": "student@example.com",

  "password": "Password@123",

  "role": "student"

}

Success Response

{

  "success": true,

  "message": "User registered successfully"

}

Status Codes

201 Created

400 Bad Request

409 Conflict



Login

Endpoint

POST /auth/login

Request Body

{

  "email": "student@example.com",

  "password": "Password@123"

}

Success Response

{

  "success": true,

  "data": {

    "access_token": "jwt_access_token",

    "refresh_token": "jwt_refresh_token"

  }

}



Refresh Token

POST /auth/refresh



Logout

POST /auth/logout



Forgot Password

POST /auth/forgot-password



Reset Password

POST /auth/reset-password



3. Student APIs

Get Student Profile

GET /students/profile

Response

{

  "id": "uuid",

  "first_name": "Aviral",

  "last_name": "Mishra",

  "skills": [

    "React",

    "FastAPI"

  ],

  "employability_score": 85

}



Update Profile

PUT /students/profile



Add Skill

POST /students/skills

Request

{

  "skill_name": "React"

}



Get Student Dashboard

GET /students/dashboard



4. School APIs

Register School

POST /schools



Get School Dashboard

GET /schools/dashboard



Get School Students

GET /schools/students



Generate School Report

GET /schools/reports



5. Company APIs

Create Company Profile

POST /companies



Get Company Dashboard

GET /companies/dashboard



Get Company Opportunities

GET /companies/opportunities



6. Mentor APIs

Create Mentor Profile

POST /mentors



Get Assigned Students

GET /mentors/students



Submit Evaluation

POST /mentors/evaluations



7. Opportunity APIs

Get Opportunities

GET /opportunities

Query Parameters

?page=1



&limit=10



&category=internship



&location=remote



&mode=online



Get Opportunity By ID

GET /opportunities/{id}



Create Opportunity

POST /opportunities

Request

{

  "title": "Frontend Intern",

  "description": "React Internship",

  "category": "Internship",

  "mode": "Remote",

  "stipend": 5000

}



Update Opportunity

PUT /opportunities/{id}



Delete Opportunity

DELETE /opportunities/{id}



8. Application APIs

Apply For Opportunity

POST /applications

Request

{

  "opportunity_id": "uuid"

}



Get My Applications

GET /applications/me



Get Applicants

GET /applications/opportunity/{id}



Update Application Status

PUT /applications/{id}/status

Request

{

  "status": "accepted"

}

Valid Values:

submitted



under_review



accepted



rejected



completed



9. Task APIs

Create Task

POST /tasks



Assign Task

POST /tasks/{id}/assign



Get Assigned Tasks

GET /tasks/me



Submit Task

POST /tasks/{id}/submit



Review Task

PUT /tasks/{id}/review



10. Assessment APIs

Create Assessment

POST /assessments

Request

{

  "submission_id": "uuid",

  "score": 90,

  "feedback": "Excellent Work"

}



Get Assessment

GET /assessments/{id}



11. Certificate APIs

Generate Certificate

POST /certificates/generate



Get Student Certificates

GET /certificates



Download Certificate

GET /certificates/{id}/download



Verify Certificate

GET /certificates/verify/{certificate_id}



12. Portfolio APIs

Get Public Portfolio

GET /portfolio/{slug}

Public Endpoint



Update Portfolio

PUT /portfolio



Get Portfolio Analytics

GET /portfolio/analytics



13. Analytics APIs

Student Analytics

GET /analytics/student



School Analytics

GET /analytics/school



Company Analytics

GET /analytics/company



Platform Analytics

GET /analytics/platform

Admin Only



14. Notification APIs

Get Notifications

GET /notifications



Mark Notification Read

PUT /notifications/{id}/read



Mark All Notifications Read

PUT /notifications/read-all



15. Audit APIs

Get Audit Logs

GET /audit-logs

Admin Only



16. Rate Limiting Policy

Authenticated Users:

100 Requests / Minute



Anonymous Users:

20 Requests / Minute



17. Security Standards

Authentication:

JWT Access Token

Authorization:

RBAC

Password Hashing:

bcrypt

Transport Security:

HTTPS TLS 1.2+



18. HTTP Status Codes

200 OK



201 Created



204 No Content



400 Bad Request



401 Unauthorized



403 Forbidden



404 Not Found



409 Conflict



422 Validation Error



429 Too Many Requests



500 Internal Server Error



19. API Versioning Strategy

Current Version:

v1

Example:

/api/v1/students/profile

Future Versions:

/api/v2/students/profile



20. API Documentation Summary

Total Modules:

Authentication



Student



School



Company



Mentor



Opportunity



Application



Task



Assessment



Certificate



Portfolio



Analytics



Notification



Audit

Architecture Style:

REST API



JSON



JWT Authentication



Role Based Access Control



Versioned Endpoints

