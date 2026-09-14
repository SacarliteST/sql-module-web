# Концепция проверки SQL-заданий во второй итерации

Дата актуализации: 2026-09-12.

## 1. Цель

Во второй итерации SQLModule переходит от бинарного сравнения результата к
составной проверке решения. Преподаватель задаёт критерии, их веса, проходной
балл, лимит попыток и доступные студенту группы подсказок.

Каждая учитываемая попытка получает балл от 0 до 100 и детализацию критериев.
Итоговый результат — лучший балл среди попыток текущего прохождения. Количество
попыток не уменьшает оценку.

Одновременно перерабатывается выполнение SQL: вместо запуска отдельного Docker-
контейнера на каждую попытку backend использует ограниченный пул заранее
запущенных sandbox-контейнеров с изолированной подготовкой каждой аренды.

## 2. Границы итерации

В итерацию входят:

- результат на основной учебной базе;
- критерии и веса суммой 100;
- `passingScore`, `maxAttempts`, `attemptScore` и `bestScore`;
- обязательные и запрещённые SQL-конструкции и таблицы;
- многодиалектный AST-анализ;
- безопасные группы подсказок;
- ручная и автоматическая финализация;
- однократная идемпотентная передача лучшей оценки в Education;
- атомарный учёт попыток и защита от конкурентных отправок;
- тёплый пул sandbox-контейнеров;
- выполнение SQL реальным read-only пользователем СУБД;
- сохранение standalone-режима.

В итерацию **не входят**:

- скрытая или теневая база и генерация скрытых данных;
- `HiddenDatasetResult` и `HiddenDatasetVersion`;
- DML/DDL-задания;
- пользовательский код проверок;
- оценка производительности, качества или стиля SQL.

`HiddenDatasetResult` не добавляется в backend enum, Swagger или frontend-типы
как зарезервированное значение. Контракт расширяется только после появления
работающей реализации скрытого окружения.

## 3. Зафиксированные решения

1. Задание содержит ровно один обязательный `MainDatasetResult`.
2. Сумма весов всех активных критериев равна 100.
3. Критерий либо пройден полностью, либо приносит 0 баллов.
4. `passingScore` находится в диапазоне 1–100.
5. `maxAttempts` равен `null` или положительному числу в серверном диапазоне.
6. Новая попытка не уменьшает лучший результат.
7. Повтор с тем же `Idempotency-Key` не создаёт новую попытку.
8. SQL- или AST-ошибка студента расходует попытку.
9. Ошибка инфраструктуры попытку не расходует.
10. AST-критерий подтверждает наличие структуры, но не её влияние на результат.
11. AST не является механизмом безопасности.
12. Для координации попыток и финализации используется PostgreSQL; отдельный
    Redis не вводится.
13. Пул разделяется по разрешённым DBMS-профилям. Произвольный Docker image из
    пользовательского ввода не может создать новый пул.
14. Одноразовый sandbox executor сохраняется как выключаемый fallback.

## 4. Модель оценки

Пример конфигурации:

```json
{
  "passingScore": 70,
  "maxAttempts": 5,
  "visibleHintGroups": ["Result", "RequiredTables"],
  "checks": [
    { "kind": "MainDatasetResult", "weight": 70 },
    { "kind": "RequiredTable", "value": "orders", "weight": 15 },
    { "kind": "RequiredConstruct", "value": "GroupBy", "weight": 15 }
  ]
}
```

Backend независимо от frontend проверяет:

- `MainDatasetResult` присутствует ровно один раз;
- каждый вес — положительное целое число;
- сумма весов равна 100;
- тип критерия поддерживается диалектом базы;
- обязательное `value` заполнено и нормализовано;
- одинаковые критерии не дублируются;
- одно значение нельзя одновременно сделать обязательным и запрещённым.

Простое задание может содержать только `MainDatasetResult` с весом 100.

```text
attemptScore = сумма весов Passed-критериев
bestScore = max(attemptScore учитываемых попыток)
isPassed = bestScore >= passingScore
```

Ошибка выполнения SQL или синтаксическая ошибка в запросе студента проваливает
`MainDatasetResult` и расходует попытку. Структурные критерии дают баллы только
после успешного разбора AST. Сбой, timeout или внутренняя ошибка AST-анализатора
считаются infrastructure failure, не создают учитываемую попытку и не уменьшают
доступный лимит.

Пример ответа:

```json
{
  "attemptId": "uuid",
  "attemptNumber": 2,
  "score": 85,
  "bestScore": 85,
  "passingScore": 70,
  "isPassed": true,
  "attemptsUsed": 2,
  "attemptsRemaining": 3,
  "canSubmit": true,
  "canFinalize": true,
  "checks": [
    { "kind": "MainDatasetResult", "status": "Passed", "awardedScore": 70 },
    { "kind": "RequiredTable", "status": "Passed", "awardedScore": 15 }
  ],
  "hints": []
}
```

Student DTO не содержит эталонный SQL, ожидаемые строки, внутренний AST, setup
SQL, connection data и raw-ошибки.

## 5. Критерии способа решения

Поддерживаемые виды:

```text
MainDatasetResult
RequiredConstruct
ForbiddenConstruct
RequiredTable
ForbiddenTable
```

Первоначальный общий enum конструкций:

```text
Join
InnerJoin
LeftJoin
RightJoin
FullJoin
GroupBy
Having
Distinct
Subquery
Cte
WindowFunction
OrderBy
AggregateFunction
SelectStar
```

Диалект может не поддерживать отдельную конструкцию. Такая конфигурация
отклоняется при сохранении, а не во время попытки студента.

Frontend не хардкодит поддержку конструкций по СУБД. Backend возвращает
возможности выбранного DBMS-профиля: доступные виды критериев, конструкции,
ограничения значений и версию анализатора. Форма предлагает только возможности,
полученные из этого контракта, а backend повторно валидирует конфигурацию.

AST различает комментарии, строки, алиасы, вложенные запросы, CTE и quoted
identifiers. Но он не доказывает семантическое влияние узла. Например:

```sql
WITH unused AS (SELECT * FROM orders)
SELECT * FROM customers;
```

Запрос содержит CTE и `orders`, хотя они не влияют на результат. Поэтому
структурный критерий означает «запрос содержит конструкцию или ссылку», а
правильность подтверждает `MainDatasetResult`.

## 6. Многодиалектный AST

Домен не зависит от AST конкретной библиотеки:

```text
SQL студента
    ↓
анализатор по DbmsSystemName
    ├── PostgreSqlDialectAnalyzer
    ├── MySqlDialectAnalyzer
    └── следующие адаптеры
    ↓
нормализованный SqlStructure
    ↓
общие критерии
```

```csharp
public interface ISqlDialectAnalyzer
{
    string Dialect { get; }
    Result<SqlStructure> Analyze(string sql);
}

public sealed record SqlStructure(
    SqlStatementKind StatementKind,
    IReadOnlySet<SqlConstruct> Constructs,
    IReadOnlyList<SqlTableReference> Tables,
    IReadOnlySet<string> Functions,
    bool UsesSelectStar,
    int SubqueryCount);
```

Первый spike использует managed multi-dialect parser с AST и visitor API.
Библиотека скрыта за адаптером, поэтому анализатор одного диалекта можно заменить
без изменения домена и API.

На старте поддерживаются PostgreSQL и MySQL. Для каждого создаётся corpus:

- простой SELECT и разные JOIN;
- подзапросы, CTE и оконные функции;
- агрегаты, GROUP BY и HAVING;
- quoted и schema-qualified identifiers;
- диалектные варианты LIMIT;
- комментарии и строковые литералы;
- несколько statements и запрещённые DML/DDL.

Даже разобранный запрос всегда исполняется ограниченным пользователем sandbox.

## 7. Версия проверки задания

Published-задание выполняется по неизменяемому снимку:

```text
TaskValidationVersion
├── TaskId
├── Version
├── DbmsProfile
├── SchemaSnapshot
├── VisibleDatasetSnapshot
├── ReferenceQuerySnapshot
├── ExpectedResultSnapshot
├── ValidationConfigurationSnapshot
└── AnalyzerVersion
```

Номера `TargetDb.SchemaVersion` недостаточно: текущая база, строки и эталон могут
измениться. Версия проверки хранит канонический материал для повторной подготовки
sandbox.

- Draft использует редактируемую конфигурацию.
- Публикация создаёт immutable version.
- Attempt ссылается на конкретную version.
- Новая опубликованная конфигурация создаёт новую version.
- Старые попытки сохраняют прежние правила.
- Связь `SqlTask ↔ SqlQuery` 1:1 сохраняется.

## 8. Публикация задания

Перед публикацией backend:

1. проверяет критерии и сумму весов;
2. выбирает AST-анализатор по DBMS;
3. разбирает эталон как один read-only statement;
4. проверяет поддержку настроенных конструкций;
5. фиксирует schema/data snapshot;
6. выполняет эталон read-only пользователем;
7. проверяет timeout и comparison row limit;
8. сохраняет ожидаемый результат и immutable version;
9. переводит задание в Published.

Ошибка эталона является ошибкой настройки и не создаёт Attempt.

## 9. Учёт попыток и распределённая конкурентность

Для прохождения хранится агрегат:

```text
StudentTaskProgress
├── UserId
├── TaskId
├── ModuleSessionId?
├── ValidationVersionId
├── AttemptsUsed
├── BestScore
├── State
├── FinalScore?
├── FinalizedAt?
└── ConcurrencyVersion
```

Для platform-flow область определяется `ModuleSessionId`. Вечный standalone-
лимит на пару `UserId + TaskId` запрещён.

Распределённая блокировка не удерживается во время SQL:

```text
короткая транзакция PostgreSQL
→ заблокировать StudentTaskProgress
→ проверить состояние и лимит
→ зарезервировать AttemptNumber
→ commit

AST + sandbox без бизнес-блокировки

короткая транзакция PostgreSQL
→ сохранить Attempt и CheckResults
→ увеличить AttemptsUsed
→ обновить BestScore
→ при необходимости начать финализацию
→ commit
```

Используется row-level lock либо optimistic concurrency с повтором. Уникальные
ограничения защищают номер попытки, idempotency scope и одну финализацию.

После infrastructure failure резервирование освобождается или помечается
неучитываемым. `AttemptsUsed` не увеличивается. SQL/AST-ошибка сохраняется как
учитываемая попытка с безопасной причиной.

## 10. Тёплый sandbox pool

Пул переиспользует процесс СУБД, но не состояние попытки:

```text
старт SqlModule
→ поднять MinSize контейнеров разрешённого профиля
→ Ready
→ выдать worker в аренду
→ создать изолированную database/schema
→ применить snapshot
→ выполнить SQL read-only пользователем
→ удалить изолированную область
→ вернуть worker в Ready
```

Состояния worker:

```text
Starting → Ready → Leased → Recycling → Ready
                    ↓
                 Unhealthy → Stopped/Replacement
```

Timeout, потеря соединения, ошибка очистки или отмена делают worker
`Unhealthy`. Он уничтожается и заменяется, а не возвращается в пул.

### 10.1. Разделение прав

```text
sandbox_admin
  создаёт database/schema, применяет DDL/INSERT и выполняет cleanup

sandbox_runner
  имеет только CONNECT/USAGE/SELECT
```

Обязательны server-side timeout, лимиты строк/подключений/CPU/памяти, закрытая
сеть, отсутствие Docker socket и host mounts внутри sandbox, безопасный
`search_path` и закрытие подключения после аренды.

### 10.2. Координация

Для одного SqlModule на одном Docker host выдача worker реализуется локальным
`Channel`/`SemaphoreSlim`. Бизнес-состояние всё равно блокируется в PostgreSQL.

Сразу вводится `ISandboxLeaseManager`. При нескольких экземплярах на одном host
его реализация использует PostgreSQL leases:

```text
WorkerId
HostId
OwnerInstanceId
LeaseToken
LeasedUntil
HeartbeatAt
```

Контейнер другого Docker host нельзя выдать удалённому экземпляру, поэтому каждый
host имеет свой пул, а распределёнными остаются прогресс и финализация.

### 10.3. Настройки и метрики

```json
{
  "SandboxPool": {
    "Enabled": true,
    "AcquireTimeoutSeconds": 10,
    "LeaseTimeoutSeconds": 30,
    "Profiles": {
      "postgres": { "MinSize": 1, "MaxSize": 2 },
      "mysql": { "MinSize": 0, "MaxSize": 1 }
    }
  }
}
```

Для VPS с 8 GB памяти стартовый предел — два PostgreSQL worker и один лениво
запускаемый MySQL worker. Значения уточняются нагрузочным smoke.

Метрики: `Ready/Leased/Unhealthy`, время ожидания, подготовка, выполнение,
timeout, пересоздания и отказы из-за исчерпания пула.

## 11. Подсказки

Группы:

```text
Result
RequiredConstructs
ForbiddenConstructs
RequiredTables
ForbiddenTables
```

Критерии выполняются независимо от видимости. Backend формирует сообщения по
whitelist-шаблонам. Student API не возвращает parser node, эталон, ожидаемые
строки и raw database error. Teacher API может показать полную диагностику
критериев и нормализованную структуру без инфраструктурных секретов.

## 12. Финализация и Education

Студент может вручную завершить platform-прохождение. При недостигнутом проходном
балле frontend требует подтверждение, а backend повторно проверяет состояние.

Автофинализация происходит при 100 баллах, последней попытке, expiry или закрытии
сессии Education.

Expiry первично обрабатывает SQLModule фоновым worker. Он атомарно начинает
финализацию и отправляет в Education лучший балл. Если учитываемых попыток не было,
финальная оценка равна 0. Повторный сигнал закрытия или expiry от Education
обрабатывается идемпотентно и не создаёт вторую финализацию.

```text
Active → Finalizing → CompletionPending → Completed
                           ↓
                    CompletionFailed → retry
```

Атомарно сохраняются `FinalScore = BestScore`, причина, время и единственная
outbox-запись. Ручной запрос, expiry-worker и параллельная последняя попытка не
могут создать несколько оценок. Сбой Education повторяет доставку той же записи,
но не пересчитывает результат.

Kafka получает событие каждой учитываемой попытки. Итоговая оценка отправляется
в Education только при финализации.

## 13. Standalone

Standalone использует те же version, AST, баллы и историю, но не создаёт
integration outbox, не зависит от Education/Kafka/ModuleSession и не выполняет
platform return.

Для standalone создаётся отдельное прохождение `StudentTaskProgress` с явным
началом. `maxAttempts` применяется так же, как в platform-flow. После ручной
финализации или исчерпания попыток отправка блокируется только в рамках текущего
прохождения.

Студент может выбрать «Начать заново». Frontend показывает подтверждение, backend
закрывает прежнее прохождение и создаёт новое по актуальной опубликованной
`TaskValidationVersion`. Старые попытки и итог прежнего прохождения сохраняются в
истории. Сброс не создаёт integration outbox и не влияет на Education.

## 14. Предварительные изменения модели и API

Новые сущности:

```text
TaskValidationConfiguration
ValidationCheck
TaskValidationVersion
StudentTaskProgress
AttemptCheckResult
AttemptReservation или эквивалент
ModuleSessionFinalization
SandboxWorkerLease — для распределённого пула
```

`Attempt` получает `ValidationVersionId`, `ProgressId`, `AttemptNumber`, `Score`
и `CountsTowardLimit`.

Конфигурация редактируется отдельно по `taskId`, без повторной отправки задания:

```text
PUT  /api/v1/sql-tasks/{taskId}/validation
POST /api/v1/sql-tasks/{taskId}/validation/preview
GET  /api/v1/dbms/{dbmsId}/validation-capabilities
POST /api/v1/student/tasks/{taskId}/progress
POST /api/v1/student/tasks/{taskId}/progress/restart
POST /api/v1/module-integration/sessions/current/finalize
```

Маршруты progress являются предварительными и уточняются в API-ТЗ. Повторный
`start/restart` должен быть идемпотентным. Точные DTO фиксируются отдельным ТЗ.
Request DTO следуют nullable-политике и возвращают единый `422 ProblemDetails`.

## 15. Порядок реализации

Каждый пункт поставляется отдельной задачей и коммитом:

1. Утвердить оставшиеся инфраструктурные решения и точные API-контракты.
2. Добавить validation configuration/version и миграции.
3. Реализовать scoring основной базы.
4. Добавить progress, резервирование и конкурентные тесты.
5. Ввести adapter API многодиалектного AST.
6. Провести PostgreSQL/MySQL parser spike на corpus запросов.
7. Реализовать структурные критерии и подсказки.
8. Реализовать локальный тёплый pool и fallback executor.
9. Разделить sandbox admin/runner и доказать read-only тестами.
10. Добавить lease abstraction и recovery worker.
11. Реализовать финализацию и итоговый outbox.
12. Изменить передачу оценки в Education.
13. Расширить teacher/student API, Swagger и Orval.
14. Реализовать frontend и пройти standalone/platform/load smoke.

Frontend начинает очередной срез после фиксации Swagger-контракта.

## 16. Критерии готовности

1. `MainDatasetResult` обязателен, сумма весов равна 100.
2. `passingScore` и `maxAttempts` валидируются с двух сторон.
3. PostgreSQL и MySQL разбираются выбранным анализатором.
4. Неподдерживаемый критерий нельзя сохранить для DBMS задания.
5. Попытка получает балл и безопасную детализацию.
6. Новая попытка не уменьшает `bestScore`.
7. Параллельные запросы не превышают лимит.
8. Идемпотентный повтор не создаёт попытку.
9. Infrastructure failure не расходует попытку.
10. Student видит только разрешённые подсказки.
11. Attempt ссылается на immutable validation version.
12. Ручная и автоматическая финализация идемпотентны.
13. Education получает ровно одну лучшую оценку.
14. Worker переиспользуется без переноса данных между попытками.
15. SQL выполняется пользователем без прав записи и DDL.
16. Повреждённый worker автоматически заменяется.
17. Standalone работает без Education и Kafka.
18. Секреты и raw-ошибки не появляются в API и логах.
19. `HiddenDatasetResult` отсутствует в Swagger и generated-типах.
20. AST-ошибка студента расходует попытку, сбой анализатора — нет.
21. SQLModule финализирует истёкшую сессию с лучшим баллом или 0 без попыток.
22. Standalone позволяет начать новое прохождение без удаления старой истории.
23. Frontend получает поддерживаемые критерии из DBMS capabilities API.

## 17. Открытые решения

До соответствующих этапов согласовать:

1. Какой managed AST parser принимается после spike.
2. Как версионируется analyzer при обновлении библиотеки.
3. Какой максимальный `maxAttempts` допускается.
4. Хранится ли materialized snapshot как JSON или нормализованные version-таблицы.
5. Нужен ли распределённый sandbox lease на одном VPS уже в первой реализации
   или достаточно интерфейса и локального координатора.

Теневая база является отдельной будущей фазой. Она должна расширить существующие
scoring, progress, AST и sandbox lease, а не потребовать их повторной переработки.
