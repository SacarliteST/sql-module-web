# Refactoring Notes

## Current Decision

The first refactoring pass introduced shared UI primitives, role home pages, a cleaner app layout, and a compact login page.

The `src/session` module was intentionally kept in place during this pass. Moving it into `features/auth` and `entities/user` is safe, but it touches route guards, login, token decoding, store exports, and role routing. Do it as a separate small refactoring step after the UI shell settles.

## Next Auth Structure

Target direction:

```text
src/features/auth/
  ui/
  model/
  lib/

src/entities/user/
  model/
  lib/
  ui/
```

Suggested next step:

1. Move `LoginPage` into `src/features/auth/ui`.
2. Move `SessionUser`, `UserRole`, and role helpers into `src/entities/user`.
3. Keep token provider and session store under `features/auth/model`.
4. Update exports gradually and run `npm run typecheck` after each move.
