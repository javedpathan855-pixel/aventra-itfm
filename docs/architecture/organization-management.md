# Aventra ITFM Organization Management Architecture

## Mission & Scope
The Organization Management Module provides comprehensive enterprise profile administration, multiple address management, Indian tax/corporate identification (GSTIN, PAN, CIN), branding/logo management, regional settings, and role-scoped team management within strict Clean Architecture boundaries and tenant isolation.

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
