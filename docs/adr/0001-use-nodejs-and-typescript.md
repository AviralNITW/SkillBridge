# ADR 0001: Use Node.js and TypeScript for Backend Development

## Status
Approved

## Context
The initial conceptual designs (HLD/LLD) proposed Python 3.13 and FastAPI for the SkillBridge backend. However, the frontend is designed as a React/Next.js application, which uses JavaScript and TypeScript.

To build a high-quality SaaS ecosystem, we need to balance performance, development velocity, and system maintainability. We must decide whether to adhere to the Python stack or switch to a TypeScript-based Node.js backend.

## Decision
We will use **Node.js** with **TypeScript** and **Express.js** for the backend API services.

The primary reasons for this choice are:
1. **Unified Language Stack**: By using TypeScript on both the frontend and backend, the development team can write code in a single language. This allows us to share code patterns, utility functions, and type definitions (interfaces, Zod validation schemas) between frontend and backend.
2. **High Concurrency and I/O Performance**: The core workflows of SkillBridge (submitting tasks, logging audit trails, broadcasting alerts) are highly I/O bound. Node.js's event-driven, single-threaded non-blocking architecture is optimized for high-concurrency connections and fast API responses.
3. **Ecosystem & Community Support**: The Node.js ecosystem contains mature, production-ready libraries for our planned modules:
   - **Prisma** for type-safe database queries and migrations.
   - **BullMQ** (powered by Redis) for high-performance background queues.
   - **Winston** for robust logging.

## Consequences

### Positive (Pros):
- **Unified Stack**: Code reviews, developers onboarding, and full-stack integration are simplified.
- **Shared Types**: API request/response contracts (e.g., Zod schemas) can be shared across backend and frontend, preventing mismatches and bugs.
- **Velocity**: Fast prototyping and unified package managers (npm/yarn/pnpm).

### Negative (Cons):
- Requires translating references to Python packages (e.g., SQLAlchemy to Prisma, APScheduler to BullMQ) in the legacy docx specifications.
