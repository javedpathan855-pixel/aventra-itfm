# Database Rules

- Database/ORM access belongs in Infrastructure.
- ORM-generated types must not become domain contracts.
- Never query the database from React components or pages.
- Keep persistence mapping explicit where domain models differ.
- Keep transactions around application use-case boundaries when multiple writes must be atomic.
- Review migrations before applying them.
