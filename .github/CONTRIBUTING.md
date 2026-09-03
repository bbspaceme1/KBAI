# Contributing

## Branch Strategy

- `main` — production and integration branch, protected, require PR + CI pass.
- `feature/*` — new feature work.
- `fix/*` — bug fixes.
- `hotfix/*` — emergency production fixes.

## Pull Request Requirements

- [ ] CI/CD passes (lint + type check + build + tests)
- [ ] No merge conflicts
- [ ] Self-review completed
- [ ] Linked to an issue or ticket

## Workflow

1. Branch from `main`.
2. Open a PR against `main`.
3. Ensure PR title is descriptive and includes the type of change.

## Coding Standards

- Use `npm run format` before committing.
- Keep changes small and reviewable.
- Write tests for new behavior and bug fixes.
