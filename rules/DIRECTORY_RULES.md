# Directory Rules

Recommended shape:

```text
src/
├── app/
├── features/
│   └── <feature>/
│       ├── domain/
│       ├── application/
│       ├── repository/
│       ├── infrastructure/
│       └── presentation/
├── shared/
└── config/
```

Do not create every folder automatically. Create folders only when responsibility exists.
Feature-specific code stays inside its feature. `shared/` is only for genuinely cross-feature concerns.
Avoid `misc`, `stuff`, `temp`, and generic dumping folders.
