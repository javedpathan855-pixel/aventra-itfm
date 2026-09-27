# Aventra ITFM Asset Management Architecture (Phase 1)

## Mission & Scope
Phase 1 delivers a complete Asset Management module: registry, categories,
models, assignment/return, dashboard, reports with CSV export, permissions
and audit — integrated with the existing Organization module, auth,
design system and Postgres database under strict Clean Architecture.

Explicitly out of scope for Phase 1: maintenance work orders, asset
transfers between organizations, depreciation schedules, AMC workflows,
physical audit campaigns, and generic file attachments (no shared file
storage exists yet — the logo pipeline is logo-specific).

---

## Clean Architecture Structure

```text
src/features/asset/
├── domain/
│   ├── constants/   # Statuses, conditions, limits, history event types
│   ├── entities/    # Category, Model, Asset, Assignment, History, queries
│   ├── schemas/     # Zod validation schemas with transformations
│   └── services/    # Pure warranty-status derivation (injectable clock)
├── repository/      # AssetRepository port interface (contracts only)
├── infrastructure/
│   └── prisma/      # Prisma repository ($transaction scoped)
├── application/
│   └── use-cases/   # Categories, models, assets, assignments, dashboard, reports
└── presentation/
    └── components/  # Dashboard, registry, forms, detail, taxonomy, reports

src/app/assets/
├── layout.tsx            # Protected shell (mirrors organization layout)
├── actions.ts            # Server-action adapters + getDeps
├── page.tsx              # Registry
├── dashboard/page.tsx
├── new/page.tsx          # Create (managers only)
├── [assetId]/page.tsx    # Detail + assign/return
├── [assetId]/edit/page.tsx
├── categories/page.tsx   # Categories & models tabs
└── reports/page.tsx      # Reports + CSV export
```

---

## Data Model & Prisma Schema

Migration: `20260927121521_add_asset_management_models` (new tables only,
no destructive changes, applied to the dev database).

### `AssetCategory`
`id, organizationId, name, code, description?, isActive, timestamps`.
`@@unique([organizationId, code])`, `@@unique([organizationId, name])`.
Soft-deactivated; deactivation is blocked while non-archived assets
reference the category. Categories are never hard-deleted.

### `AssetModel`
`id, organizationId, categoryId→AssetCategory(Restrict), brand, modelName,
modelCode?, description?, isActive, timestamps`.
`@@unique([organizationId, brand, modelName])`,
`@@unique([organizationId, modelCode])` (NULLs stay distinct in Postgres).
Creating/updating requires an active category; the model must belong to
the asset's category. Deactivation blocked while active assets reference it.

### `Asset`
Identity: `assetTag` (required, `@@unique([organizationId, assetTag])`),
`name`, `description?`, `categoryId`, `modelId?`, `brand?` (free text when
no model fits), `serialNumber?` (`@@unique([organizationId, serialNumber])`
— Postgres treats NULLs as distinct, so many NULLs are allowed).
Purchase: `purchaseDate`, `purchaseCost Decimal(14,2)`, `currency`
(default INR, ISO-4217 validated), `vendorName?`, `invoiceNumber?`.
Warranty: `warrantyStartDate?`, `warrantyEndDate?` (end ≥ start enforced).
Lifecycle: `condition` (NEW/GOOD/FAIR/POOR/DAMAGED), `status`
(AVAILABLE/ASSIGNED/MAINTENANCE/RETIRED), `archivedAt?` (soft archive,
excluded from active counts and default listings).
Placement: `currentLocationId?`, `currentDepartmentId?` (moved
transactionally on assign/return).
Concurrency: `activeAssignmentId? @unique` + conditional-claim `updateMany`
inside the assignment transaction; write-conflict retries (P2034, bounded)
convert race losers into clean `CONFLICT` errors.

Money rule: amounts are `Decimal` in Postgres and decimal strings in
entities/schemas — floating-point arithmetic never appears.

### `AssetAssignment`
One row per handover: `membershipId?→Member(SetNull)` (member removal must
not destroy history), `assigneeUserId`, snapshot `assigneeName/Email`,
`locationId→Location(Restrict)` + snapshot `locationName`,
`departmentId?→Department(Restrict)` + snapshot `departmentName?`,
`assignedAt`, `expectedReturnAt?`, `returnedAt?` (null = open),
`assignmentCondition`, `returnCondition?`, `notes?`, `createdBy`.
Snapshots make history immune to later renames. A department assignment
requires an existing location↔department link.

### `AssetHistory`
Queryable, immutable event log: `assetId?` (null for taxonomy-adjacent
events if ever needed), `eventType`, `actorUserId?`, `summary`,
`metadata Json?`, `createdAt` only. Backs the detail timeline.
Complements the stdout security audit log (identifiers only, never throws)
— history is readable product data, the audit logger is the security trail.

---

## Asset Lifecycle Rules

- `AVAILABLE` → `ASSIGNED` only via the assign flow (eligibility: not
  archived, status AVAILABLE, no open assignment; member/location/department
  verified org-scoped; dates valid).
- `ASSIGNED` → `AVAILABLE` only via return (records date, condition, notes;
  condition adopts the return condition).
- `MAINTENANCE` / `RETIRED` are set by editing a free asset; an assigned
  asset keeps `ASSIGNED` until returned (edits cannot move it).
- `ARCHIVED` only via the archive action and only with no open assignment
  (return first). Archived assets cannot be edited, assigned or counted as
  active. No unarchive flow in Phase 1.
- Deactivating a category/model with referencing active assets is rejected
  (`CONFLICT`).

## Assignment Business Rules

- Exactly one open assignment per asset (conditional claim + unique
  pointer + P2034 retry → losers get `CONFLICT`).
- Assignee must be a member of the same organization; names/emails are
  snapshotted from the verified roster (client supplies only IDs).
- Location must be active and org-scoped; department (if given) must be
  active and linked to the location.
- `expectedReturnAt ≥ assignedAt`; `returnedAt` defaults to now.

---

## Permission Matrix

| Permission | OWNER | ADMIN | ENGINEER | USER |
|---|---|---|---|---|
| asset.read | ✓ | ✓ | ✓ | ✓ |
| asset.create | ✓ | ✓ | — | — |
| asset.update | ✓ | ✓ | — | — |
| asset.archive | ✓ | ✓ | — | — |
| asset.assign | ✓ | ✓ | ✓ | — |
| asset.return | ✓ | ✓ | ✓ | — |
| asset.category.read | ✓ | ✓ | ✓ | ✓ |
| asset.category.manage | ✓ | ✓ | — | — |
| asset.model.read | ✓ | ✓ | ✓ | ✓ |
| asset.model.manage | ✓ | ✓ | — | — |
| asset.report.read | ✓ | ✓ | ✓ | — |
| asset.export | ✓ | ✓ | — | — |

Enforced in server-side use cases (`requirePermission`); UI gating
(role checks in views, nav filtering) is supplementary. Organization
context always derives from the verified session with the
`autoSelectDefault` fallback; client-supplied organization IDs are never
trusted. Cross-tenant reads resolve to `NOT_FOUND` (no enumeration).

Audit events: `ASSET_CREATED/UPDATED/ARCHIVED`,
`ASSET_CATEGORY_CREATED/UPDATED/STATUS_CHANGED`,
`ASSET_MODEL_CREATED/UPDATED/STATUS_CHANGED`,
`ASSET_ASSIGNED/RETURNED` (stdout trail + `AssetHistory` rows for
asset-level events).

---

## Dashboard Metrics (definitions)

- **Total Active**: non-archived assets (any status).
- **Available/Assigned/Maintenance/Retired**: non-archived assets per status.
- **Archived**: `archivedAt` set (never counted as active).
- **Warranty Expiring Soon**: active assets with expiry within 30 days
  (inclusive, UTC day boundaries). **Expired**: expiry before today.
- **Distributions**: active-asset counts grouped by category, current
  location and current department (zero-denominator safe — bars render
  from counts, no percentages).
- **Recently Registered**: 5 newest active assets. **Recent Assignments**:
  5 newest assignment rows with asset tags. **Upcoming Expirations**: 5
  soonest-expiring active warranties.

---

## Reports & Export

Eight presets (`inventory, available, assigned, category, location,
department, warranty, assignments`) reuse the registry/history queries —
no parallel query path. Preview is paginated; export refetches up to
`ASSET_EXPORT_MAX_ROWS` (5,000) and flags `truncated`.
CSV: UTF-8 BOM, `\r\n` rows, RFC-4180 quoting, formula-injection guard
(leading `= + - @ TAB CR` prefixed with `'`), safe filenames
(`aventra-assets-{report}-{YYYY-MM-DD}.csv`), delivered as a Blob download
from the `asset.export`-gated action. No PDF export.

---

## Route & Module Structure

`/assets` (registry), `/assets/dashboard`, `/assets/new`,
`/assets/[assetId]`, `/assets/[assetId]/edit`, `/assets/categories`
(tabs), `/assets/reports`. Server actions live in
`src/app/assets/actions.ts` with a local `getDeps` (auth + asset repo +
audit). Navigation gains an `Assets` group (Dashboard, Registry,
Categories & Models, Reports) filtered by asset permissions.

## Migration Instructions

Requires Postgres with `DATABASE_URL` (see `.env.example`).
`npx prisma validate` → `npx prisma migrate dev` (creates
`prisma/migrations/<timestamp>_add_asset_management_models/`) →
`npx prisma generate` (client output `src/generated/prisma`).
Review generated SQL before applying; this migration only creates tables.

## Test Strategy

- `asset-domain.test.ts`: warranty derivation, normalization, schema
  accept/reject incl. money/date/cross-field rules.
- `asset-use-cases.test.ts`: in-memory fakes covering CRUD, uniqueness
  propagation, archive guards, assign/return transitions, dashboard math,
  report presets, CSV guards, and the full role matrix (incl. unauth,
  stranger, null-org fallback, cross-tenant `NOT_FOUND`).
- `asset-infrastructure.test.ts`: live-Postgres (scratch org, removed
  afterwards) for constraint enforcement, concurrent-assign `CONFLICT`,
  cross-tenant isolation and real dashboard aggregation.
- `asset-presentation.test.ts`: static-markup coverage of registry,
  dashboard, taxonomy, form, detail, reports and nav visibility.
- Existing `rbac-policies`, `navigation` and `dashboard-shell` tests
  extended for the 12 new permissions and the Assets nav group.
