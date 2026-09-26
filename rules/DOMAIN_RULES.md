# Domain Rules

Domain contains business truth and must remain framework-independent.

Allowed: entities, value objects, invariants, domain services, domain errors, domain-owned types.

Forbidden: React, Next.js, Prisma/ORM, HTTP, browser APIs, Node-specific infrastructure, auth-provider SDKs, UI components.

Domain must be independently testable.
