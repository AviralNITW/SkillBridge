# ADR 0002: Choose Prisma ORM for Database Access

## Status
Approved

## Context
The database design for SkillBridge is structured and highly relational (containing Users, Students, Opportunities, Applications, Tasks, Submissions, Assessments, Certificates, Portfolios, and Logs). 

For database access and schema migrations in our TypeScript Node.js backend, we need an Object-Relational Mapper (ORM) or Query Builder. The primary choices considered were:
1. **Raw SQL Drivers (`pg`)**: High performance but lacks type-safety and requires writing database schema migrations manually.
2. **TypeORM / Sequelize**: Traditional ORMs but require verbose configuration and lack compile-time type safety for complex relations.
3. **Prisma ORM**: Modern, schema-driven, type-safe ORM.

## Decision
We will use **Prisma ORM** for database modeling, migrations, and access.

The reasons for choosing Prisma include:
1. **Declarative Schema**: Prisma uses a single `schema.prisma` file to model the database structure. This schema is clean, readable, and acts as a single source of truth for both database tables and TypeScript definitions.
2. **Automatic Type Generation**: Prisma automatically generates TypeScript typings based on the database schema. This means when we query the database, we get auto-complete support and compile-time verification, eliminating standard database mapping bugs.
3. **Robust Migrations**: Prisma Migrations (`prisma migrate`) are fully automated, SQL-based, and simple to version control.
4. **Rich GUI**: Prisma Studio provides an excellent web-based GUI interface to view, edit, and manage database records during development and staging tests.

## Consequences

### Positive (Pros):
- **Type Safety**: Compile-time check of all SQL query responses, preventing runtime database errors.
- **Fast Iteration**: Modifying schema columns is automated with SQL migrations.
- **Readability**: Clear database relation configurations in `schema.prisma` that align with our Entity-Relationship Diagram (ERD).

### Negative (Cons):
- Slightly higher memory overhead and minor performance abstraction compared to fine-tuned raw SQL.
- Lack of support for some highly complex database-specific features without resorting to `$queryRaw` bypasses.
