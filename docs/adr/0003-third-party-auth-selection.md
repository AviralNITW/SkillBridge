# ADR 0003: Third-Party Authentication Strategy for MVP

## Status
Approved

## Context
During the design phase of Module 1: Identity & Access Management (IAM), we discussed bringing third-party social authentication (Google and GitHub logins) forward from Phase 2 into the MVP. We evaluated two primary models for this integration:
1. **Approach A: Custom OAuth Integration**: Build direct OAuth handlers on our Express server (or use Passport.js) and generate our own JWTs and sessions, extending our existing local database schema.
2. **Approach B: Managed Identity Providers**: Delegate identity management to an external provider (such as Clerk or Auth0) and verify their signatures.

## Decision
We will use **Approach A (Custom OAuth Integration)** for the SkillBridge MVP.

We recommend this approach for the following reasons:
1. **Data Sovereignty and Integrity**: We maintain a single source of truth for users in our local PostgreSQL database. This ensures profile tables (`Student`, `Mentor`) can be created transactionally when a user registers, avoiding race conditions or webhook syncing issues inherent in Approach B.
2. **Audit & Session Control**: The functional requirements demand detailed session management (logging device, IP, and activity) and session revocation. With a custom database + Redis implementation, we can easily track and invalidate sessions without calling expensive third-party management APIs.
3. **Hybrid Login Options**: Users will be able to log in using traditional email/password OR via Google/GitHub. The database will link these identities under a single `User` record (making `passwordHash` optional for pure OAuth signups).
4. **Development and Cost Efficiency**: There are no monthly active user (MAU) subscription costs, and developers can mock OAuth callbacks locally during development/testing without requiring live domain configurations.

## Consequences

### Positive (Pros):
- Perfect alignment with the predefined `users` and `audit_logs` database schemas.
- Full control over JWT structure, expiration, and rotation logic.
- Easier database-level authorization (RBAC) and profile linking.

### Negative (Cons):
- Requires writing and maintaining custom endpoints for the OAuth exchange flow.
- Requires securing credentials (client IDs/secrets) for external providers in `.env`.
