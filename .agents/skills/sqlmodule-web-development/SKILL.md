---
name: sqlmodule-web-development
description: Develop SQL Module Web teacher, student, admin, schema-authoring, task-bank, and platform-handoff features using generated APIs and the existing Feature-Sliced-lite UI system.
---

# SQL Module Web development

Read `AGENTS.md` first. Use `README.md` for commands and runtime config, `CONCEPT.md` for mode and security boundaries, and `ROADMAP.md` only for prioritization. Treat old prompts and tech-debt records as historical unless the task names them.

## Place code deliberately

- `app`: router, providers, layouts and runtime configuration.
- `pages`: route composition.
- `features`: teacher/student/admin workflows and mutations.
- `entities`: reusable SQL task, topic, schema, attempt and DBMS models.
- `shared`: generic UI, HTTP, utilities and types.
- `src/api/identity` and `src/api/sqlmodule`: generated Orval code; never edit manually.

Reuse `Page`, `PageHeader`, `PageBreadcrumbs`, `AppCard`, `EmptyState`, `ConfirmModal` and `FormActions` before creating new patterns. Keep the interface a compact working tool, preserve role guards, and use Monaco for SQL editing rather than a custom textarea when editor behavior is in scope.

## Session and security boundary

Distinguish standalone tokens from platform handoff tokens. A platform student session is task-scoped; hiding navigation is UX, not authorization. Do not persist access tokens insecurely, leak reference SQL/raw DB errors, or navigate in a way that destroys the handoff session. Preserve validated return paths and runtime `basePath` behavior.

When backend Swagger changes, update the specification and run Orval through `unsandboxed-codegen` outside the sandbox. Change handwritten adapters and UI consumers, not generated TypeScript.

Follow `$focused-feature-flow`; prefer focused tests and one justified final build over repeated full checks.
