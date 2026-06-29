# Задача: создать базовый каркас sql-module-web

## Контекст

Проект `sql-module-web` — фронтенд практического SQL-модуля платформы Scoodle.

Документы-источники:
- `CONCEPT.md` — архитектура, стек, режимы standalone/embedded
- `ROADMAP.md` — фазы разработки
- `ТЗ.md` — требования и Definition of Done

Текущий этап: **Фаза 0. Каркас**.

Нужно создать базовое React-приложение на Vite + TypeScript, сразу с учётом будущего встраивания в хост-систему.

## Главный архитектурный принцип

Приложение не должно быть жёстко привязано к `#root`, `/` или глобальному `window`-состоянию.

Должна быть единая точка монтирования:

```ts
mount(element: HTMLElement, config: AppConfig): void
```

`main.tsx` используется только для standalone-режима и вызывает `mount(...)`.

## Нужно сделать

1. Создать Vite + React + TypeScript каркас.

2. Подключить базовые зависимости:
   - React
   - React Router
   - Mantine
   - TanStack Query
   - Zustand

3. Создать структуру проекта:

```text
src/
  api/
    sqlmodule/
    identity/
  app/
    config/
    providers/
    router/
    layout/
    mount.tsx
  shared/
    http/
    ui/
    utils/
  session/
  features/
    dbms-catalog/
    schema/
    training/
  main.tsx
```

4. Описать тип `AppConfig`.

Минимально он должен включать:

```ts
type AppConfig = {
  sqlModuleApiUrl: string;
  identityApiUrl?: string;
  basePath?: string;
  mode: 'standalone' | 'embedded';
};
```

5. Реализовать `mount(element, config)`.

Она должна:
- создать React root;
- подключить провайдеры приложения;
- передать runtime config в приложение;
- использовать `basePath` для роутера.

6. Создать базовые providers:
- `MantineProvider`
- `QueryClientProvider`
- `BrowserRouter` с `basename`
- хранилище runtime config через Zustand или отдельный app-store

7. Сделать временный layout-заглушку.

В layout должны быть:
- название модуля: `SQLModule`
- текущий режим: `standalone` или `embedded`
- текущий base path
- простая навигация-заглушка:
  - `/`
  - `/teacher`
  - `/student`

8. Создать базовые маршруты:
- `/` — стартовая страница-заглушка
- `/teacher` — заглушка контура преподавателя
- `/student` — заглушка контура студента
- `*` — страница “не найдено”

9. Подготовить `.env.example`:

```env
VITE_SQLMODULE_API_URL=http://localhost:5000
VITE_IDENTITY_API_URL=http://localhost:5001
VITE_BASE_PATH=/
```

10. Добавить базовые npm-скрипты:
- `dev`
- `build`
- `preview`
- `typecheck`

## Пока НЕ делать

- Не делать экран логина.
- Не подключать реальные API-запросы.
- Не генерировать orval-клиент.
- Не реализовывать роли и guard-ы.
- Не делать реальные экраны Teacher/Student.
- Не добавлять Monaco, React Flow, таблицы и сложные UI-компоненты.

## Критерии готовности

- `npm run dev` запускает приложение.
- `npm run build` проходит успешно.
- `npm run typecheck` проходит успешно.
- Приложение открывается в standalone-режиме.
- Роутинг работает с `basePath`.
- В коде есть `mount(element, config)`.
- `main.tsx` не содержит бизнес-логики, а только читает env-конфиг и вызывает `mount`.
- Структура проекта соответствует концепции.
