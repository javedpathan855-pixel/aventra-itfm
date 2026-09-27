# Aventra ITFM Organization Management Architecture

## Mission & Scope
The Organization Management Module provides comprehensive enterprise profile administration, multiple address management, Indian tax/corporate identification (GSTIN, PAN, CIN), branding/logo management, regional settings, operational locations, departments with location assignments, and role-scoped team management within strict Clean Architecture boundaries and tenant isolation.

---

## Clean Architecture Structure

```text
src/features/organization/
├── domain/
│   ├── constants/             # Enums, statuses, address types, formats, limits
│   ├── entities/              # Profile, Address, Settings, Completion models
│   ├── schemas/               # Zod validation schemas with transformations
│   └── services/              # Pure domain services (tax validator, profile completion)
├── repository/                # OrganizationRepository port interface (contracts only)
├── infrastructure/
│   ├── prisma/                # Prisma repository implementation ($transaction scoped)
│   └── storage/               # Secure base64 logo validator & storage service
└── presentation/
    └── components/            # Tabs, cards, dialogs, form views (Aventra ITFM Design System)
```

---

## Data Model & Prisma Schema

### 1. Extended `Organization` Model
- `legalName`: Optional registered corporate entity name.
- `description`: Company overview / profile description.
- `establishedDate`: Date of organization incorporation / establishment.
- `status`: Lifecycle state (`active`, `suspended`, `archived`).
- `gstin`: 15-character Indian Goods and Services Tax Identification Number.
- `pan`: 10-character Permanent Account Number.
- `cin`: 21-character Corporate Identification Number.
- `businessIdentifier`: Additional international or national enterprise identifier.

### 2. `OrganizationAddress` Model
Supports multiple addresses per tenant:
- `type`: `registered` | `corporate` | `billing` | `operational` | `branch` | `other`.
- `label`: Human-readable label (e.g. "Mumbai Tech Center").
- `addressLine1`, `addressLine2`, `landmark`, `city`, `district`, `state`, `stateCode`, `country`, `postalCode`.
- `isDefault`: Boolean indicator. Transitions are handled atomically in database transactions.

### 3. `OrganizationSettings` Model
- `displayName`: Short presentation name.
- `timezone`: IANA timezone identifier (default `Asia/Kolkata`).
- `locale`: BCP 47 locale (default `en-IN`).
- `dateFormat`: Date display pattern (default `DD/MM/YYYY`).
- `timeFormat`: Time format (`12h` or `24h`).
- `currency`: Base operating currency (default `INR`).

### 4. `Location` Model
Operational sites belonging to exactly one organization (distinct from
`OrganizationAddress`, which records legal/registered addresses):
- `name`, unique-per-organization `code` (stored trimmed uppercase).
- Optional `description`, `email`, `phone`, full address fields, `timezone`.
- `isDefault`: at most one per organization; transitions run atomically.
  Deactivating the default clears default status explicitly — no silent
  replacement is ever chosen.
- `isActive`: soft deactivation preserves the row and all assignments.
- New assignments require an active location; existing assignments survive
  deactivation and are restored by reactivation.

### 5. `Department` Model
Organizational units belonging to exactly one organization:
- `name`, unique-per-organization `code` (stored trimmed uppercase),
  optional `description`.
- `isActive`: soft deactivation preserves the row and all assignments.
- Departments may exist with zero assigned locations.

### 6. `LocationDepartment` Model
Many-to-many join between locations and departments of the same
organization (`organizationId` denormalized for tenant isolation):
- `@@unique([locationId, departmentId])` rejects duplicate assignments.
- Removing a row never deletes either side. Cross-organization pairs are
  rejected at the application boundary before any write.

---

## Locations & Departments — Routes & Operations

- Routes: `/organization/locations`, `/organization/locations/[locationId]`,
  `/organization/departments`, `/organization/departments/[departmentId]`
  (server components under the existing organization layout; create/edit
  via dialogs following the address-dialog pattern).
- Server actions in `src/app/organization/actions.ts` wire the same
  `getDeps()` composition boundary; mutations revalidate
  `/organization/locations`, `/organization/departments`, and `/organization`.
- Listing is server-side: search (name/code/city), active/inactive and
  default filters, sorting, and pagination run in Prisma queries scoped by
  `organizationId`, with tenant-scoped counts.
- Permissions: `location.read/create/update/assign` and
  `department.read/create/update/assign`. `OWNER` and `ADMIN` manage fully;
  `ENGINEER` and `USER` hold read-only access. Navigation entries are
  permission-filtered; every operation re-authorizes server-side.

---

## Shared Select Component & Form Controls

- All single-select interactions in the Organization module use the shared
  `Select` (`src/shared/components/ui/select.tsx`): list filters (status,
  sort), address type, business type, settings (currency, timezone with
  search, date/time formats), and member role selection. Native `<select>`
  elements and checkbox/multi-select assignment interfaces are intentionally
  left untouched where they are not single-selects.
- `Select` is presentation-only (controlled/uncontrolled, single selection,
  optional search, sm/md/lg sizes, error/helper text, full keyboard support
  via a combobox/listbox pattern). It carries no business logic: values flow
  as plain strings into the existing React Hook Form + Zod pipelines, so
  server actions receive byte-identical payloads to the native controls.
- Component tests (`renderToStaticMarkup` + pure interaction helpers) live
  beside it; integration coverage renders the real list views, dialogs, and
  settings tab to assert wiring, defaults, and role gating.

---

## Tenant Isolation & Security
- **No Client-Supplied Organization IDs**: Organization identity is resolved exclusively through verified `AuthorizationContext` on the server.
- **Server-Side RBAC Enforcement**:
  - `organization.read`: Required to view organization profile and configuration (`OWNER`, `ADMIN`).
  - `organization.update`: Required to modify profiles, legal information, addresses, logos, and regional settings (`OWNER`, `ADMIN`).
  - `member.*`: Required for team invitations, role changes, and removals.
  - Non-members and unauthorized roles receive strict `FORBIDDEN` rejections.
- **Image Upload Security**:
  - Accepts PNG, JPEG, and WebP data payloads only.
  - Strict 2MB size cap (`MAX_LOGO_SIZE_BYTES`).
  - SVGs, executable formats, scripts, and HTML are rejected at both client and server storage layers.
- **Audit Logging**: Sensitive changes record audit entries:
  - `ORGANIZATION_PROFILE_UPDATED`
  - `ORGANIZATION_LEGAL_UPDATED`
  - `ORGANIZATION_ADDRESS_CHANGED`
  - `ORGANIZATION_SETTINGS_UPDATED`
  - `ORGANIZATION_LOGO_CHANGED`
  - `LOCATION_CREATED`, `LOCATION_UPDATED`, `LOCATION_ACTIVATED`,
    `LOCATION_DEACTIVATED`, `LOCATION_DEFAULT_CHANGED`
  - `DEPARTMENT_CREATED`, `DEPARTMENT_UPDATED`, `DEPARTMENT_ACTIVATED`,
    `DEPARTMENT_DEACTIVATED`
  - `LOCATION_DEPARTMENT_ASSIGNED`, `LOCATION_DEPARTMENT_UNASSIGNED`

---

## Profile Readiness & Completion
Calculated deterministically using weighted categories (100% total):
- **Basic Info (25%)**: Name, business type, and description.
- **Contact Info (20%)**: Official contact email and phone.
- **Official Address (25%)**: At least one saved registered/corporate address.
- **Legal & Tax Details (15%)**: Valid GSTIN or PAN identifier.
- **Corporate Branding (15%)**: Corporate logo uploaded.

---

## Verification & Commands
- **Unit and Integration Tests**:
  ```bash
  npm test
  ```
- **Linting**:
  ```bash
  npm run lint
  ```
- **TypeScript Typecheck**:
  ```bash
  npx tsc --noEmit
  ```
- **Production Build**:
  ```bash
  npm run build
  ```
