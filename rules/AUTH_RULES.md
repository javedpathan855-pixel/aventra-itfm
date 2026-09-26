# Authentication & Authorization Rules

Authentication answers identity; authorization answers permission.

- Provider SDK integration belongs in Infrastructure.
- Authorization is always enforced server-side.
- UI hiding is not authorization.
- Protect privileged operations independently of UI.
- Use secure session/cookie configuration.
- Never log passwords, tokens, OTPs or secrets.
- Apply rate limiting and abuse protection to sensitive flows.
