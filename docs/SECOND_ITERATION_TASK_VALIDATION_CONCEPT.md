# Концепция проверки SQL-заданий во второй итерации

Дата актуализации: 2026-09-12.

## 1. Цель

Вторая итерация разделяется на две последовательно поставляемые фазы. Фаза 2a
оптимизирует выполнение SQL через тёплый sandbox pool без изменения публичных
API-контрактов. Фаза 2b переводит SQLModule от бинарного сравнения результата к
составной проверке решения: преподаватель задаёт критерии, их веса, проходной
балл, лимит попыток и доступные студенту группы подсказок.

Каждая учитываемая попытка получает балл от 0 до 100 и детализацию критериев.
Итоговый результат — лучший балл среди попыток текущего прохождения. Количество
попыток не уменьшает оценку.

Фаза 2b начинается только после отдельного развёртывания и подтверждения
стабильности фазы 2a в production-like среде.

## 2. Границы итерации

### 2.1. Фаза 2a — тёплый sandbox pool

Фаза является эксплуатационной оптимизацией и не меняет API, DTO и пользовательское
поведение. В неё входят:

- ограниченный пул заранее запущенных sandbox-контейнеров;
- изолированная подготовка и очистка каждой аренды;
- выполнение SQL реальным read-only пользователем СУБД;
- локальная координация аренды на одном Docker host;
- метрики пула, восстановление повреждённых worker и одноразовый fallback executor;
- отдельный deploy и нагрузочный smoke до начала фазы 2b.

### 2.2. Фаза 2b — составной scoring

Фаза меняет модель `Attempt`, API и frontend. В неё входят:

- результат на основной учебной базе;
- критерии и веса суммой 100;
- `passingScore`, `maxAttempts`, `attemptScore` и `bestScore`;
- обязательные и запрещённые SQL-конструкции и таблицы;
- многодиалектный AST-анализ;
- безопасные группы подсказок;
- ручная и автоматическая финализация;
- однократная идемпотентная передача лучшей оценки в Education;
- атомарный учёт попыток и защита от конкурентных отправок;
- сохранение standalone-режима.

В итерацию **не входят**:

- скрытая или теневая база и генерация скрытых данных;
- `HiddenDatasetResult` и `HiddenDatasetVersion`;
- DML/DDL-задания;
- пользовательский код проверок;
- оценка производительности, качества или стиля SQL.

Распределённые sandbox leases, несколько Docker host и общее масштабирование
ресурсов не входят ни в 2a, ни в 2b. Они проектируются отдельной фазой после
появления реальной эксплуатационной необходимости.

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
15. Фаза 2a не меняет публичный контракт и поставляется отдельно от scoring.
16. На одном Docker host lease координируется локально; PostgreSQL lease-таблица
    до появления второго host не создаётся.
17. Пока окружение является демонстрационной витриной без реальных студентов,
    допустимы перезаливка базы и прямое изменение enum-контрактов через Swagger.
    После подключения реальных студентов это послабление прекращается.

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

## 9. Учёт попыток и конкурентность

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

`TriesCount` в Education больше не является счётчиком SQL-отправок. Education
проверяет только наличие незавершённой и непросроченной модульной сессии: такую
сессию можно открыть повторно в режиме resume, завершённая или просроченная
сессия доступна только для просмотра итога. Единственный источник лимита SQL-
попыток внутри прохождения — `maxAttempts` SQLModule.

Существующий канал временного окна `TimeLimitMinutes → ExpiresAt` в
`UpsertModuleSessionRequest` используется без изменения контракта.

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

`ISandboxLeaseManager` вводится как абстракция, но в фазах 2a/2b имеет только
локальную реализацию. Персистентная PostgreSQL-таблица lease, heartbeat и
распределённая выдача появляются только вместе со вторым Docker host.

Контейнер другого Docker host нельзя выдать удалённому экземпляру. Архитектура
нескольких host, правила маршрутизации и общий ресурсный sizing рассматриваются
отдельно и не блокируют текущие фазы.

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

Expiry обнаруживается и финализируется в первом проходе
`ModuleSessionCleanupProcessor`. Processor до отвязки попыток атомарно фиксирует
`FinalScore = BestScore` и создаёт единственную outbox-запись для Education.
Если попыток не было, начальный `BestScore = 0`, поэтому применяется тот же расчёт
без отдельной ветки, а `isPassed = false`.

Финализацию нельзя откладывать до retention-очистки: после обнуления
`Attempt.ModuleSessionId` восстановить лучший результат сессии невозможно. Текущее
поведение, при котором истёкшая сессия помечается `Expired`, затем удаляется, а
оценка не отправляется, считается реальным дефектом и исправляется в фазе 2b.
Повторный сигнал закрытия или expiry от Education обрабатывается идемпотентно.

```text
Active → Finalizing → CompletionPending → Completed
                           ↓
                    CompletionFailed → retry
```

Атомарно сохраняются `FinalScore = BestScore`, причина, время и единственная
outbox-запись. Ручной запрос, expiry-worker и параллельная последняя попытка не
могут создать несколько оценок. Сбой Education повторяет доставку той же записи,
но не пересчитывает результат.

Kafka получает событие каждой учитываемой попытки. Это событие питает журнал
попыток SQLModule и полную диагностику в Teacher API, а не является спекулятивной
телеметрией. Итоговая оценка отправляется в Education только при финализации.

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
```

`ISandboxLeaseManager` в фазе 2a является runtime-абстракцией и не создаёт
персистентную доменную сущность или таблицу.

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

### Фаза 2a

1. Ввести `ISandboxLeaseManager` и локальный координатор.
2. Реализовать тёплый pool и одноразовый fallback executor.
3. Разделить sandbox admin/runner и доказать read-only тестами.
4. Добавить health recovery, настройки и метрики.
5. Развернуть 2a отдельно и пройти standalone/platform/load smoke без изменения
   API-контрактов.

### Фаза 2b

1. Зафиксировать точные API-контракты и enum критериев в Swagger.
2. Добавить validation configuration/version и миграции либо выполнить
   допустимую для демонстрационной среды перезаливку базы.
3. Реализовать scoring основной базы.
4. Добавить progress, резервирование и конкурентные тесты.
5. Ввести adapter API многодиалектного AST.
6. Провести PostgreSQL/MySQL parser spike на corpus запросов.
7. Реализовать структурные критерии и подсказки.
8. Исправить expiry-финализацию в первом cleanup-проходе.
9. Реализовать ручную финализацию и итоговый outbox.
10. Изменить передачу оценки в Education и семантику `TriesCount`.
11. Расширить teacher/student API, Swagger и Orval.
12. Реализовать frontend и пройти standalone/platform smoke.

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
24. Фаза 2a проходит отдельный deploy/load smoke без изменения Attempt API.
25. `maxAttempts` является единственным лимитом SQL-отправок внутри сессии.
26. Expiry финализируется до отвязки попыток в первом cleanup-проходе.
27. Kafka-события попыток доступны журналу и диагностике преподавателя.

## 17. Открытые решения

До соответствующих этапов согласовать:

1. Какой managed AST parser принимается после spike.
2. Как версионируется analyzer при обновлении библиотеки.
3. Какой максимальный `maxAttempts` допускается.
4. Хранится ли materialized snapshot как JSON или нормализованные version-таблицы.
5. Какие метрики и пороги считаются достаточным подтверждением стабильности 2a
   перед началом 2b.

До появления второго Docker host используется интерфейс и локальный координатор;
распределённый lease не является открытым решением текущей итерации.

Пока система остаётся демонстрационной витриной, восстановление старых Attempt и
отдельная миграционная стратегия не блокируют разработку: база может быть
перезалита. Перед подключением реальных студентов требуется отдельный пересмотр
политики совместимости, миграций и восстановления данных.

Теневая база является отдельной будущей фазой. Она должна расширить существующие
scoring, progress, AST и sandbox lease, а не потребовать их повторной переработки.
