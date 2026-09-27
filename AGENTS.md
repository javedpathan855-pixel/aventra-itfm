# AGENTS.md — Next.js Clean Architecture

## Mission
This repository follows strict, scalable, project-agnostic Clean Architecture for Next.js applications. Read this file and the relevant `/rules` files before changing code.

## Non-negotiable principles
- Preserve architectural boundaries and dependency direction.
- Business rules must be framework-independent.
- `app/` is routing/composition, not a business-logic layer.
- Domain must not import Next.js, React, Prisma/ORMs, provider SDKs, HTTP clients, browser APIs, or infrastructure.
- Application orchestrates use cases and depends on domain/contracts, not infrastructure implementations.
- Repository contains abstractions/contracts; Infrastructure contains implementations.
- Presentation contains UI concerns, not business workflows.
- Database access belongs in Infrastructure.
- Server-only code and secrets must never cross into client modules.
- Do not add libraries without a clear technical reason.
- Do not create empty/speculative abstractions.
- Do not claim tests/build/lint passed unless actually run.

## Architecture
Preferred feature shape:

```text
features/<feature>/
├── domain/
├── application/
├── repository/
├── infrastructure/
└── presentation/
```

Dependency direction:

```text
Presentation -> Application -> Domain
                     ↑
              Repository Contracts
                     ↑
               Infrastructure
```

Infrastructure implementations are wired at the outer/composition boundary.

## Layer responsibilities
### Domain
Entities, value objects, invariants, domain services, domain errors, domain-owned types. Framework independent.

### Application
Use cases, DTOs, application services, orchestration, mapping, and ports required by use cases. No UI or ORM implementation.

### Repository / Contracts
Interfaces/ports for persistence or external capabilities. No Prisma/SQL/provider implementation.

### Infrastructure
ORM/database adapters, auth providers, APIs, email/SMS, storage, caching, cryptography adapters, repository implementations.

### Presentation
React components, forms, client hooks, presentation state, UI validation and display behavior.

### Next.js app/composition
Routes, pages, layouts, route handlers, metadata, providers and dependency wiring. Keep these thin.

## Next.js
- App Router is the default.
- Server Components are the default.
- Use `"use client"` only when required.
- Never import server-only modules into client modules.
- Route handlers/server actions are adapters: parse, authenticate, authorize, validate, invoke application logic, map result/error.
- Pages/layouts must not contain business workflows.

## Security
- Treat all client input as untrusted.
- Validate again on the server.
- Authorize on the server; UI visibility is not security.
- Never log passwords, tokens, OTPs, cookies, secrets, or authorization headers.
- Never expose secrets or server-only environment variables to the client.
- Rate-limit security-sensitive operations.
- Prevent open redirects and account/resource enumeration where applicable.
- Use secure session/cookie settings and least privilege.

## TypeScript
- Strict TypeScript.
- Avoid `any`, unnecessary `as` casts and non-null assertions.
- Narrow `unknown` explicitly.
- Prefer discriminated unions.
- Do not leak ORM/provider types into domain contracts.

## Validation & errors
Use layered validation: Presentation -> Application -> Domain -> Infrastructure. Client validation is UX; server validation is security; domain validation protects invariants.

Use typed error categories: validation, authentication, authorization, domain, infrastructure, unexpected. Never expose internal stack/database/provider details to users.

## UI/accessibility
- Prefer semantic HTML and keyboard accessibility.
- Provide labels, focus states, error states, loading/empty/success states.
- Respect reduced motion.
- Reuse existing primitives; do not introduce a UI library without approval.

## State/performance
Prefer the smallest state scope: local -> URL -> server state -> feature state -> global state. Avoid duplicating server state unnecessarily. Prefer Server Components and minimize client JavaScript.

## Agent workflow
1. Read `AGENTS.md`.
2. Read relevant `/rules`.
3. Inspect existing structure/code and search for existing abstractions.
4. Decide the correct architectural owner.
5. Implement the smallest correct change.
6. Run typecheck/lint/tests/build as appropriate.
7. Inspect the diff and report remaining risks honestly.

Never bypass an architectural rule for convenience.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
