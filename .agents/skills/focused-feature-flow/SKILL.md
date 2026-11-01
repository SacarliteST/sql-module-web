---
name: focused-feature-flow
description: Implement or revise a sql-module-web feature with narrow discovery and staged TypeScript, Vitest, Orval, and build checks, avoiding repeated full validation after minor edits.
---

# Focused feature flow

1. Read `AGENTS.md` and the concrete requirement. Read `CONCEPT.md`, `ROADMAP.md`, technical requirements or debt records only when the feature depends on them.
2. Check `git status`; define the affected role, runtime mode, API operation and expected UI states. Do not expand into backend or platform changes without explicit scope.
3. Find one analogous feature and shared UI pattern with `rg`. Stop exploring once route, session mode, query/mutation and error handling are understood.
4. Implement the coherent feature first, then add tests for user-visible behavior and actual regressions. Avoid broad speculative test matrices and private-implementation assertions.

## Validation ladder

- During editing: run a targeted Vitest file only when useful.
- Once the slice is coherent: run `npm.cmd run typecheck` and relevant tests.
- On failure: rerun only the failing test or typecheck while fixing.
- After the task is fully implemented: run `npm.cmd run typecheck`, `npm.cmd run test`, and `npm.cmd run build` exactly once as the final acceptance gate. Do not repeat the full suite after each edit.
- Then check only `git status` to avoid staging unrelated user work, stage the task-scoped files, and create the task commit without another broad analysis pass. This repository has no `dotnet format` stage.

Do not regenerate clients unless Swagger changed. Use `unsandboxed-codegen` outside the sandbox for Orval. Do not start the dev server, install packages, push, or edit another repository unless required. Stop anything started for verification and report unverified checks.
