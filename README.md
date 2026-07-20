# SQL Module Web

Фронтенд SQL-модуля для образовательной системы тестирования. Приложение разрабатывается как самостоятельная SPA на React, но с заделом на последующее встраивание в родительскую систему.

Модуль закрывает три пользовательских контура:

- **Администратор** - управление пользователями IdentityService, роли, блокировки, журнал аудита, базовый мониторинг сервисов.
- **Преподаватель** - работа с темами, учебными базами, заданиями и будущим конструктором схем.
- **Студент** - просмотр доступных тем, баз и заданий, в дальнейшем решение SQL-задач через редактор.

## Стек

- React 19
- TypeScript
- Vite
- Mantine UI
- React Router
- TanStack Query
- Zustand
- React Hook Form
- Zod
- Orval для генерации API-клиентов из OpenAPI

## Требования

- Node.js 20.19+ или 22.12+
- npm
- Запущенные backend-сервисы:
  - IdentityService
  - SQL Module API

На Windows, если PowerShell блокирует `npm.ps1`, используйте `npm.cmd`:

```powershell
npm.cmd run dev
```

## Быстрый запуск

1. Установить зависимости:

```bash
npm install
```

2. Проверить адреса backend-сервисов в `public/runtime-config.json`:

```json
{
  "sqlModuleApiUrl": "http://localhost:5000",
  "identityApiUrl": "http://localhost:5101",
  "basePath": "/"
}
```

3. Запустить frontend:

```bash
npm run dev
```

4. Открыть приложение:

```text
http://localhost:5173
```

## Runtime-настройки

Адреса сервисов задаются в `public/runtime-config.json`.

Ключи:

- `identityApiUrl` - адрес IdentityService.
- `sqlModuleApiUrl` - адрес SQL Module API.
- `basePath` - базовый путь приложения для standalone или embedded-режима.

Не хардкодьте адреса API внутри компонентов. Если нужно поменять окружение, меняйте runtime-конфиг.

## API-клиенты

Клиенты генерируются Orval из OpenAPI-описаний:

- `identity.swagger.json`
- `sqlModule.swagger.json`

Команда генерации:

```bash
npm run api:generate
```

Сгенерированные файлы лежат в:

- `src/api/identity`
- `src/api/sqlmodule`

Их нельзя редактировать вручную. Для изменения поведения запросов используйте общий HTTP-слой:

- `src/shared/http/identity-fetch.ts`
- `src/shared/http/sqlmodule-fetch.ts`
- `src/shared/http/create-runtime-fetch.ts`

## Основные команды

```bash
npm run dev
npm run typecheck
npm run build
npm run preview
npm run api:generate
```

Назначение:

- `dev` - локальный dev-сервер Vite.
- `typecheck` - проверка TypeScript без сборки.
- `build` - production-сборка.
- `preview` - локальный просмотр production-сборки.
- `api:generate` - генерация API-клиентов.

## Структура проекта

Проект развивается в сторону Feature-Sliced-lite:

```text
src/
  app/        # сборка приложения: router, providers, layout, config
  pages/      # страницы верхнего уровня
  features/   # пользовательские сценарии и бизнес-действия
  entities/   # доменные сущности и форматтеры
  shared/     # общие UI-компоненты, HTTP, утилиты
  session/    # сессия, токены, guards, login
  api/        # сгенерированные Orval API-клиенты
```

Важные зоны:

- `src/app/router/AppRouter.tsx` - маршруты приложения.
- `src/app/layout/AppLayout.tsx` - общий layout и навигация.
- `src/shared/ui` - переиспользуемые UI-компоненты.
- `src/session` - авторизация, роли и защита маршрутов.
- `src/pages/admin-*` - контур администратора.
- `src/pages/teacher-*` - контур преподавателя.
- `src/pages/student-*` - контур студента.

## Роли и доступ

Поддерживаемые роли:

- `Admin`
- `Teacher`
- `Student`

После входа пользователь перенаправляется в свой контур. Навигация и маршруты должны оставаться ограниченными по роли: администратор не должен видеть контуры преподавателя и студента, преподаватель - админку, студент - служебные экраны.

## Документация проекта

- `CONCEPT.md` - концепция SQL-модуля.
- `ROADMAP.md` - дорожная карта.
- `DESIGN.md` - дизайн-ориентиры.
- `AGENTS.md` - правила агентской разработки.
- `docs/testing-system-ui-style.md` - стиль интерфейса родительской системы.
- `docs/refactoring-notes.md` - архитектурные заметки по рефакторингу.
- `docs/tech-debt` - технический долг и доработки backend/API.
- `promts/` - рабочая папка промтов, исключена из git.

## Правила разработки

- Не добавлять Bootstrap.
- Использовать Mantine и локальные стили.
- Не редактировать сгенерированные API-клиенты вручную.
- Не хардкодить URL backend-сервисов в компонентах.
- Перед созданием общего UI-паттерна проверять `src/shared/ui`.
- Делать изменения маленькими итерациями.
- После значимых правок запускать:

```bash
npm run typecheck
npm run build
```

Если менялись Swagger-файлы или `orval.config.ts`, сначала выполнить:

```bash
npm run api:generate
```

## Текущее состояние

Сейчас реализованы:

- standalone-авторизация через IdentityService;
- распределение по ролям;
- базовый layout с верхней навигацией;
- контур администратора;
- список пользователей, карточка пользователя и журнал аудита через Identity API;
- начальные страницы преподавателя и студента;
- подключение SQL Module API-клиента для дальнейшей разработки учебных сущностей.

Дальнейшая работа идет поэтапно: сначала проектирование окна/сценария, затем промт, затем небольшая реализация с проверкой сборки.
