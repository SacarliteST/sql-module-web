# Handoff для агентов: SQLModule Phase 2b

## 1. Назначение документа

Это главная точка входа для агента, которому передаётся одна задача фазы 2b.
Документ содержит минимально необходимый контекст, порядок чтения, правила
параллельной работы и формат результата.

Агент не должен восстанавливать требования из истории чата и не должен
самостоятельно расширять границы фазы. Если конкретная задача противоречит
общему ТЗ или актуальному Swagger, работу нужно остановить на анализе и явно
описать расхождение.

## 2. Репозитории и ответственность

Корень проекта:

```text
C:\Users\vladislav.bokovoi\SQLTren
```

Задействованные репозитории:

```text
Frontend/sql-module-web   — React UI SQLModule
Backend/SqlModule         — API и доменная логика SQLModule
Education                 — платформа, сессии и получение итоговой оценки
Backend/IdentityService   — аутентификация и handoff
Frontend/platform-web     — UI платформы
```

Для frontend-задач фазы 2b рабочий репозиторий — только
`Frontend/sql-module-web`. Изменения в backend, Education, IdentityService и
platform-web выполняются только по явно назначенной отдельной задаче.

Текущая интеграционная ветка SQLModule frontend и backend:

```text
Phase-2b
```

Перед началом нельзя автоматически переключать ветку, делать reset, checkout
файлов, stash или clean. Сначала проверить реальное состояние рабочего дерева.

## 3. Обязательный порядок чтения

Агент читает документы полностью в следующем порядке:

1. `C:\Users\vladislav.bokovoi\SQLTren\AGENTS.md`
2. `C:\Users\vladislav.bokovoi\SQLTren\PLATFORM.md`
3. `C:\Users\vladislav.bokovoi\SQLTren\Frontend\sql-module-web\AGENTS.md`
4. `C:\Users\vladislav.bokovoi\SQLTren\Frontend\sql-module-web\README.md`
5. `C:\Users\vladislav.bokovoi\SQLTren\Frontend\sql-module-web\docs\SECOND_ITERATION_TASK_VALIDATION_CONCEPT.md`
6. `C:\Users\vladislav.bokovoi\SQLTren\Frontend\sql-module-web\docs\PHASE_2B_TECHNICAL_REQUIREMENTS.md`
7. `C:\Users\vladislav.bokovoi\SQLTren\Frontend\sql-module-web\docs\backend-requirements\2026-09-14-phase-2b-frontend-contracts.md`
8. `C:\Users\vladislav.bokovoi\SQLTren\Frontend\sql-module-web\docs\PHASE_2B_FRONTEND_KANBAN.md`
9. Запись или формулировку конкретной назначенной задачи.

После этого агент сверяет требования с текущим `sqlModule.swagger.json` и
generated-моделями. Swagger является источником фактически доступного API, но
не отменяет найденное расхождение с согласованным ТЗ: такое расхождение нужно
зафиксировать.

## 4. Краткий продуктовый контекст

SQLModule имеет два основных пользовательских контура:

- преподаватель создаёт учебные базы, данные, SQL-задания, эталон и правила
  проверки;
- студент решает опубликованные задания и просматривает результаты попыток.

Модуль запускается:

- самостоятельно, с собственной авторизацией и standalone progress;
- из Education через handoff и module session.

Phase 2b заменяет бинарную проверку результата составной оценкой от 0 до 100.
Преподаватель настраивает критерии, веса, проходной балл, лимит попыток и
видимость подсказок. Каждая попытка проверяется по immutable validation version.

## 5. Неизменяемые решения Phase 2b

1. `MainDatasetResult` обязателен ровно один раз.
2. Веса активных критериев — положительные целые числа, сумма равна 100.
3. `attemptScore` — сумма весов пройденных критериев.
4. `bestScore` — максимум учитываемых попыток текущего прохождения.
5. `isPassed = bestScore >= passingScore`.
6. Штраф за число попыток отсутствует.
7. `maxAttempts` SQLModule — единственный лимит SQL-отправок внутри прохождения.
8. Скрытая/теневая база и скрытые наборы данных в фазу не входят.
9. PostgreSQL и MySQL конструкции анализируются через AST после parser spike.
10. AST используется для оценки, но не является механизмом безопасности.
11. Эталон проверяется до публикации и должен набрать 100.
12. Опубликованная validation version неизменяема.
13. Student API раскрывает только разрешённые преподавателем группы подсказок.
14. SQL/syntax error студента расходует попытку.
15. Внутренний сбой AST/sandbox не расходует попытку.
16. Новая попытка не уменьшает `bestScore`.
17. Idempotency и ограничение конкурентных submit обеспечивает backend.
18. Standalone работает без Education и Kafka.
19. Platform-финализация передаёт в Education лучшую оценку от 0 до 100 ровно
    один раз.
20. При expiry результат фиксируется в первом cleanup-проходе до отвязки
    попыток: лучший балл либо 0, если попыток не было.

## 6. Базовая модель критериев

```text
ValidationCheckKind:
  MainDatasetResult
  RequiredConstruct
  ForbiddenConstruct
  RequiredTable
  ForbiddenTable

HintGroup:
  Result
  RequiredConstructs
  ForbiddenConstructs
  RequiredTables
  ForbiddenTables
```

Первоначальные SQL-конструкции:

```text
Join, InnerJoin, LeftJoin, RightJoin, FullJoin,
GroupBy, Having, Distinct, Subquery, Cte, WindowFunction
```

Реальный набор вариантов для формы получается из DBMS capabilities API.
Frontend не должен придумывать поддержку конструкции, которой нет в ответе
backend.

## 7. Архитектура frontend

Стек:

- React 19 и TypeScript;
- Vite;
- Mantine UI;
- React Router;
- TanStack Query;
- Zustand;
- React Hook Form и Zod;
- Orval generated clients;
- Monaco Editor для SQL;
- Feature-Sliced-lite без избыточного дробления.

Основные зоны:

```text
src/app          — router, providers, layout, runtime config
src/pages        — страницы контуров
src/features     — пользовательские сценарии
src/entities     — прикладные модели и форматирование
src/shared/http  — общий runtime fetch
src/shared/ui    — общие компоненты
src/session      — токены, роли, guards
src/api          — generated Orval clients
```

Перед добавлением компонента проверить `src/shared/ui`. Не менять общий дизайн
без задачи: интерфейс остаётся компактным рабочим инструментом на Mantine.

## 8. API и generated-код

Источники:

```text
sqlModule.swagger.json
identity.swagger.json
orval.config.ts
```

Generated-код находится в `src/api/identity` и `src/api/sqlmodule`. Его нельзя
редактировать вручную. При изменении Swagger использовать:

```powershell
npm.cmd run api:generate
npm.cmd run typecheck
npm.cmd run build
```

Генерация может массово изменить файлы. Поэтому один агент должен быть
единственным владельцем задачи `F2B-FE-002`; остальные не запускают Orval
параллельно и начинают работу только после доступности согласованного generated
среза.

API base URL берётся из `public/runtime-config.json`. Хардкод адресов в
компонентах запрещён.

## 9. Правила параллельной работы

### 9.1. Назначение задачи

Каждый агент получает ровно один ID из `PHASE_2B_FRONTEND_KANBAN.md`. Перед
работой он сообщает:

```text
Задача: F2B-FE-XXX
Файлы/зоны, которые планируется менять
Зависимости, которые считаются готовыми
```

Нельзя одновременно брать зависимую задачу, пока предыдущий контракт или
generated-клиент нестабилен.

### 9.2. Разделение файлов

Два агента не редактируют одновременно один файл. В частности, единственный
владелец назначается для:

- `sqlModule.swagger.json` и `src/api/sqlmodule/**`;
- router и общей навигации;
- общих attempt/task DTO adapters;
- самой Kanban-доски;
- package.json и lock-файла.

Если задача требует файл, уже занятый другим агентом, нужно передать ему точный
запрос на интеграционное изменение, а не редактировать файл параллельно.

### 9.3. Git

Предпочтительный вариант — отдельный git worktree и ветка от согласованного
чистого коммита:

```text
phase-2b/f2b-fe-XXX-short-name
```

Но worktree нельзя создавать из текущего грязного состояния. Сначала владелец
интеграционной ветки должен зафиксировать или иным способом распределить уже
существующие изменения.

Агенту запрещено:

- делать `git reset --hard`, `git clean` или checkout чужих файлов;
- stash-ить общее рабочее дерево без явного согласования;
- включать в коммит чужие изменения;
- выполнять merge/rebase/push без прямой команды;
- коммитить секреты и runtime credentials.

Коммит содержит одну задачу и короткое русское сообщение. Документация в
`docs/` игнорируется текущим `.gitignore`; нужные новые документы добавляются
осознанно через `git add -f <точный-файл>`, а не через широкое `git add -f .`.

### 9.4. Обновление доски

Только назначенный интегратор меняет статус задачи в общей доске, чтобы избежать
конфликтов. Исполнитель в отчёте предлагает переход статуса и перечисляет
фактические критерии готовности.

## 10. Как выполнять frontend-задачу

1. Проверить ветку и `git status`.
2. Прочитать обязательные документы.
3. Найти существующий пользовательский поток и переиспользуемые компоненты.
4. Сверить Swagger, generated hook и реальные DTO.
5. Зафиксировать минимальный список файлов задачи.
6. Реализовать только назначенный вертикальный срез.
7. Не маскировать недостающий backend локальным fake API, если заглушка не
   указана в задаче явно.
8. Проверить loading, empty, success и документированные error states.
9. Выполнить typecheck и production build.
10. Перед коммитом проверить diff и исключить unrelated-файлы.
11. Отдать интегратору отчёт по шаблону ниже.

Dev-сервер без необходимости не запускать. Всё поднятое агентом после проверки
обязательно остановить.

## 11. Минимальная матрица ошибок UI

```text
400 — malformed request/idempotency header
401 — требуется авторизация
403 — роль или доступ запрещены
404 — сущность, progress или session не найдены
409 — stale version, закрытое прохождение, лимит, idempotency mismatch
422 — неверные критерии, веса, capability или reference preview
503 — временный infrastructure failure; попытка не расходуется
```

Frontend не вычисляет подтверждённое число попыток и финальный score сам. После
мутации источником правды является backend response или повторный query.

## 12. Проверки

Обязательный минимум для обычной frontend-задачи:

```powershell
npm.cmd run typecheck
npm.cmd run build
```

Если менялись Swagger/generated API:

```powershell
npm.cmd run api:generate
npm.cmd run typecheck
npm.cmd run build
```

Автотесты не добавлять без отдельной задачи: для этого небольшого проекта они
отложены. Но ручные сценарии и непроверенные места перечислять обязательно.

## 13. Definition of Done отдельной задачи

- выполнены критерии конкретного ID на доске;
- нет ручных правок generated-кода;
- нет hardcoded API URL и backend enum сверх fallback отображения;
- student UI не раскрывает teacher-only данные;
- обработаны доступные состояния API;
- typecheck и build проходят;
- diff не содержит чужих изменений;
- доске предложен корректный новый статус;
- перечислены backend gaps и ручные проверки;
- поднятые процессы остановлены.

## 14. Формат отчёта агента

```markdown
Задача: F2B-FE-XXX
Статус: Done | Blocked | Partially done

Сделано:
- ...

Изменённые файлы:
- ...

Проверки:
- `npm.cmd run typecheck` — ...
- `npm.cmd run build` — ...

Ожидания от backend:
- отсутствуют | точный endpoint/DTO/status/code

Что проверить вручную:
- ...

Риски/ограничения:
- ...

Предлагаемое изменение Kanban:
- F2B-FE-XXX: In progress → Done

Коммит:
- hash и сообщение | коммит не создавался
```

## 15. Готовый промт для выдачи задачи агенту

```text
Работай над задачей F2B-FE-XXX в репозитории
C:\Users\vladislav.bokovoi\SQLTren\Frontend\sql-module-web.

Сначала полностью прочитай:
C:\Users\vladislav.bokovoi\SQLTren\Frontend\sql-module-web\docs\PHASE_2B_AGENT_HANDOFF.md
и все документы из указанного там обязательного порядка чтения.

Реализуй только F2B-FE-XXX из PHASE_2B_FRONTEND_KANBAN.md. Перед изменениями
проверь текущую ветку и грязное рабочее дерево. Не удаляй, не stash и не включай
в коммит чужие изменения. Не редактируй generated Orval-файлы вручную. Не
трогай backend и другие репозитории. Если фактический Swagger не позволяет
закончить задачу, не создавай выдуманный контракт: дай точное ТЗ на недостающий
backend endpoint/DTO/error code.

После реализации выполни typecheck и production build. Dev-сервер запускай
только при необходимости и обязательно останови. Коммит создавай только если
это отдельно разрешено; сообщение — короткое и на русском. В конце верни отчёт
строго по шаблону из handoff-документа.
```

## 16. Текущее предупреждение для следующего агента

На момент создания handoff ветки frontend и backend `Phase-2b` имеют
незакоммиченные изменения. В frontend уже появился большой generated-срез
Phase 2b, а в backend после базового коммита продолжается реализация runtime и
финализации. Поэтому значения `git status` и Swagger нужно перепроверить перед
каждой задачей; этот раздел не является заменой такой проверки.
