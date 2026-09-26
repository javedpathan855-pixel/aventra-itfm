import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Clean Architecture boundaries (AGENTS.md): dependency direction is
  // enforced by the linter so violations fail `npm run lint`.
  {
    files: ["src/features/**/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["next", "next/*"], message: "Domain must not depend on Next.js (AGENTS.md)." },
            { group: ["react", "react-dom", "react/*"], message: "Domain must not depend on React (AGENTS.md)." },
            { group: ["better-auth", "better-auth/*"], message: "Domain must not depend on providers (AGENTS.md)." },
            { group: ["@prisma/*", "@/generated/*", "**/generated/*"], message: "Domain must not depend on the ORM (AGENTS.md)." },
            { group: ["@/shared/infrastructure/*", "**/shared/infrastructure/*", "@/features/*/infrastructure/*", "**/features/*/infrastructure/*"], message: "Domain must not depend on infrastructure (AGENTS.md)." },
            { group: ["@/config/*", "**/config/*"], message: "Domain must not read environment configuration (AGENTS.md)." },
          ],
        },
      ],
    },
  },
  {
    files: ["src/features/**/application/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["react", "react-dom", "react/*"], message: "Application must not depend on React (AGENTS.md)." },
            { group: ["next", "next/*"], message: "Application must not depend on Next.js (AGENTS.md)." },
            { group: ["better-auth/react", "better-auth/*"], message: "Application must depend on ports, not provider SDKs (AGENTS.md)." },
            { group: ["@prisma/*", "@/generated/*", "**/generated/*"], message: "Application must not access the ORM directly (AGENTS.md)." },
            { group: ["@/shared/infrastructure/*", "**/shared/infrastructure/*", "@/features/*/infrastructure/*", "**/features/*/infrastructure/*"], message: "Application must depend on contracts, not infrastructure implementations (AGENTS.md)." },
          ],
        },
      ],
    },
  },
  {
    files: ["src/features/**/repository/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@prisma/*", "@/generated/*", "**/generated/*"], message: "Repository contracts must not contain ORM implementation (AGENTS.md)." },
            { group: ["better-auth", "better-auth/*"], message: "Repository contracts must not contain provider implementation (AGENTS.md)." },
            { group: ["next", "next/*", "react", "react-dom"], message: "Repository contracts must stay framework-independent (AGENTS.md)." },
          ],
        },
      ],
    },
  },
  {
    files: ["src/features/**/presentation/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@prisma/*", "@/generated/*", "**/generated/*"], message: "Presentation must not access the database (AGENTS.md)." },
            { group: ["next/headers", "next/headers/*"], message: "Presentation must not use server-only Next.js APIs (AGENTS.md)." },
            { group: ["@/shared/infrastructure/*", "**/shared/infrastructure/*"], message: "Presentation must not import server infrastructure (AGENTS.md)." },
            { group: ["@/config/*", "**/config/*"], message: "Presentation must not read server configuration (AGENTS.md)." },
            { group: ["@/features/*/infrastructure/auth/auth", "**/infrastructure/auth/auth", "@/features/*/infrastructure/auth/better-auth-provider", "**/infrastructure/auth/better-auth-provider"], message: "Presentation must use application use cases and the public auth client, not server adapters (AGENTS.md)." },
          ],
        },
      ],
    },
  },
  {
    files: ["src/app/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@prisma/*", "@/generated/*", "**/generated/*"], message: "App routes must not access the ORM directly — use application logic (AGENTS.md)." },
          ],
        },
      ],
    },
  },
  {
    files: ["src/shared/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@/features/*", "**/features/*"], message: "Shared must never import feature-specific code (AGENTS.md)." },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
