# Next.js Rules

- App Router is the default.
- Server Components are the default.
- Add `"use client"` only for actual client behavior.
- Keep pages/layouts/routes thin.
- Route handlers and Server Actions are adapters, not business layers.
- Keep secrets/server-only modules out of client bundles.
- Use framework APIs at the outer boundary.
