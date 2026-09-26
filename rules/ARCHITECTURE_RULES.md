# Architecture Rules

## Layers
- Domain = business truth.
- Application = use-case orchestration.
- Repository = contracts/ports.
- Infrastructure = external technology implementations.
- Presentation = UI/user interaction.
- `app/` = Next.js routing/composition.

## Forbidden dependencies
- Domain -> Next.js/React/ORM/provider/infrastructure.
- Application -> React/UI/infrastructure implementations.
- Presentation -> database/ORM.
- Route handlers -> business workflows.

Keep dependencies pointing toward stable abstractions.
