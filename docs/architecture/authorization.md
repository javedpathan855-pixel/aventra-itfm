# Aventra ITFM Authorization Architecture (RBAC + Multi-Tenancy)

## Role model

Platform and organization roles are separate concepts that are never merged:

- `User.platformRole`: `SUPERADMIN` or null (standard user). Nullable by
  design — normal users carry no admin marker. Never inferred from email,
  domain, or organization data; assigned only via `npm run
  bootstrap:superadmin -- --email=...` (server-side, direct database
  write, refuses unknown emails).
- `Member.role`: `OWNER` | `ADMIN` | `ENGINEER` | `USER` per organization.
  Stored as plain strings for Better Auth compatibility; the provider's
  lowercase `owner` (written at registration) is normalized at the domain
  boundary. A user may hold different roles in different organizations.

## Permission model

Application code checks permissions, never roles (`requirePermission(ctx,
"member.invite")`). The matrix lives in
`features/auth/domain/authorization/permissions.ts` — the single policy
source. OWNER holds all 11 organization permissions; ADMIN holds all
except `organization.delete` and `organization.transferOwnership`;
ENGINEER/USER hold none (operational permissions arrive with future
modules). `platform.*` permissions belong to SUPERADMIN exclusively and
are never derived from organization roles.

## Authorization flow

```text
request
  → resolveAuthorizationContext (session → user/platform role → active org → membership)
  → requirePermission / requirePlatformPermission (pure guards)
  → use case (tenant id taken from the verified context, never the client)
  → repository port → Prisma adapter (org-scoped queries)
```

Ownership transfer is not a generic role change: any role update or
removal touching OWNER is rejected; transfer is a future explicit
operation. Self role-changes and self-removals are rejected. Invitations
accept only OWNER→{ADMIN,ENGINEER,USER} and ADMIN→{ENGINEER,USER};
`SUPERADMIN` is rejected by schema validation (it is not an
`ORGANIZATION_ROLES` member).

## Tenant isolation

Every organization-scoped read/write carries the verified active
`organizationId` (repository methods scope members by `id +
organizationId`; unknown/foreign ids fail identically as FORBIDDEN, no
existence leak). SUPERADMIN gets no implicit tenant bypass — platform
operations select an organization explicitly and stay tenant-scoped.

## proxy responsibility

`src/proxy.ts` answers session-presence only (Better Auth session-cookie
check): protected pages (`/dashboard*`, `/organization*`,
`/invitations*`) without a cookie redirect to `/auth?callbackUrl=…`.
Membership, roles, and tenant scope are enforced server-side per operation.
A valueless cookie passes proxy and is rejected downstream.

## Invitation lifecycle

```text
invite (OWNER/ADMIN, role policy) → row (pending, hashed token) + email
  → recipient opens /invitations/accept?token=… (session required)
  → accept use case (pending → accepted + membership, one transaction)
```

- Tokens: 256-bit `randomBytes` hex; only the SHA-256 digest is stored.
  Raw tokens travel email → URL → hashed lookup, never logs or rows.
- Acceptance verifies pending status, expiry, normalized-email match,
  role sanity, and organization existence — one generic message for all
  failures. Already-a-member is an idempotent success; replayed/cancelled
  tokens fail identically. No `accepted/cancelled/expired → pending`
  transitions exist.
- Email dispatch uses the existing Resend service (branded template); a
  failed dispatch cancels the invitation so no stuck pending row remains.
- Duplicate pending invitations are rejected (CONFLICT).

## API abuse protection

Member/invitation mutations (`POST`/`PATCH`/`DELETE` members,
invitation accept/cancel) are throttled per authenticated user with
conservative hourly budgets (`MEMBER_API_RATE_LIMITS`: invites 20/h,
role changes 30/h, removals 20/h, accepts/cancels 30/h). Enforcement is
an atomic advisory-locked count-and-insert transaction and fails closed
(unknown budget → deny). Denied budgets return 429 with `Retry-After`.
Throttle keys derive from verified session identity, never client input.
Reads (member list) and page navigation are unthrottled.

## Audit logging

Security events flow `use case → AuditLogPort → stdout JSON logger`
(`authz-audit` source): invitation created/accepted/cancelled, role
changed, member removed, organization switched, superadmin bootstrap, and
API-level authorization denials. Payloads carry identifiers and roles
only — never passwords, tokens, OTPs, or secrets. The logger never
throws, and authorization never depends on it. Promotion to a queryable
audit table is future work.

## Member writes vs provider

Member/invitation rows are written by our Prisma adapter under our
policy — not via Better Auth member endpoints — because the provider
rejects unknown role strings (`ENGINEER`/`USER` → `ROLE_NOT_FOUND`) and
duplicating the matrix into provider access-control config would create
two policy sources. Provider-owned: users, sessions, org creation,
`setActiveOrganization` (validates membership itself), invitation
acceptance (copies the stored role verbatim — compatible).

## Known follow-ups (not regressions)

- Ownership transfer and organization deletion remain permissions/policies
  only — no UI/operations by design (transfer needs a product decision on
  the previous owner's resulting role).
- Invitation emails require a working Resend key; dispatch failures cancel
  the invitation (safe retry) rather than leaving stuck rows.
