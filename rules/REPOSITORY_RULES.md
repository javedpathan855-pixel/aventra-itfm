# Repository Rules

Repository is an abstraction/port layer, not a database implementation.

Example:
```text
repository/
├── contracts/
│   ├── user-repository.ts
│   └── session-repository.ts
├── models/
└── index.ts
```

Actual Prisma/ORM implementations belong in Infrastructure. Do not create interfaces merely for ceremony.
