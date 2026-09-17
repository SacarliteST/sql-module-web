# F2B-FE-001 — аудит OpenAPI Phase 2b

Дата: 2026-09-16. Статус: повторно сверен с обновлённым backend-контрактом;
generated frontend-срез ещё содержит незакоммиченные изменения.

## Источники и результат сверки

- Backend: `Backend/SqlModule/swagger.json`.
- Frontend: `Frontend/sql-module-web/sqlModule.swagger.json`.
- SHA-256 обоих файлов после backend-правок: `82A9B79C08ADB14482184E08A920400B1089F17CBCBED79BC7BD979387E0071E`.
- Generated Orval-клиент содержит все 14 проверенных операций 2b. Он ещё не
  зафиксирован в git; штатная генерация уже проверена в `F2B-FE-002`.
- `npm.cmd run typecheck` и production build проходят.

## Матрица операций

| Срез | Операции | DTO/результат | Итог |
|---|---|---|---|
| DBMS capabilities | `GET /api/v1/dbms/{dbmsId}/validation-capabilities` | `DbmsValidationCapabilitiesResponse` | Есть: check kinds, constructs, hint groups, max attempts limit, analyzer version |
| Teacher authoring | `GET/PUT /api/v1/sql-tasks/{taskId}/validation` | `TaskValidationConfigurationRequest/Response` | Есть: nullable request, draft/published state, version token, веса, passing score, limit, hints |
| Preview | `POST /api/v1/sql-tasks/{taskId}/validation/preview` | `TaskValidationPreviewRequest/Response` | Есть: reference score, per-check diagnostic, violations; используется сохранённый эталон |
| Publish | `POST /api/v1/sql-tasks/{taskId}/validation/publish` | `PublishTaskValidationRequest`, `TaskValidationConfigurationResponse` | Есть: отдельная публикация и обязательный `Idempotency-Key` |
| Student task | `GET /api/v1/student/tasks/{taskId}` | `StudentTaskDetailsResponse.validation` | Есть: passing score, limit, progress, разрешённые hints |
| Standalone progress | `POST /api/v1/student/tasks/{taskId}/progress`, `/restart`, `/finalize` | `StudentTaskProgressResponse`, `ProgressFinalizationResponse` | Есть, все мутации с `Idempotency-Key` |
| Platform finalization | `POST /api/v1/module-integration/sessions/current/finalize` | `ProgressFinalizationResponse` | Есть, с `Idempotency-Key` |
| Attempt submit | `POST /api/v1/attempts` | `SubmitAttemptResponse` | Есть score, best score, attempt number, checks, hints, progress и version; 201 и 503 описаны |
| Student history | `GET /api/v1/student/attempts`, `GET /api/v1/student/attempts/{attemptId}` | list item и detail со `scoring` | Есть пагинация и безопасная detail-модель |
| Teacher history | `GET /api/v1/attempts`, `GET /api/v1/attempts/{id}` | list item и detail со `scoring` | Есть пагинация, полная detail-диагностика и фильтры progress/version/score/finalization |

## Enum и совместимость

В Swagger есть строковые `ValidationCheckKind`, `SqlConstruct`, `HintGroup`,
`ValidationCheckStatus`, `ProgressStatus`, `FinalizationReason` и
`ValidationConfigurationState`. Значения соответствуют концепту и общему ТЗ.

Старые поля `isCorrect`, `reason` и result snapshot сохранены в Attempt DTO;
новый `score`/`scoring` добавлен рядом. Во frontend нельзя трактовать
`isCorrect` как итоговый проходной результат 2b: пользоваться `score`,
`bestScore`, `passingScore` и `isPassed`.

## Student-safe граница

Структура `StudentTaskDetailsResponse` не содержит reference SQL, expected rows,
raw AST, setup SQL и connection data. `StudentTaskHintsResponse` содержит только
группы и разрешённые конструкции/таблицы. `StudentAttemptResponse` использует
`AttemptScoringResponse`; backend read service фильтрует checks по разрешённым
группам. Teacher detail получает полный breakdown. Это проверка схем и текущей
реализации, а не результат живого security-smoke — перед приёмкой нужно проверить
оба ответа под разными ролями.

## Расхождения и решения

| ID | Наблюдение | Влияние | Требуемое действие |
|---|---|---|---|
| `API-01` | Исправлено: `finalizationReason` nullable в Swagger, generated alias включает `null`. | Блокер снят. | Нет. |
| `API-02` | Исправлено: teacher list принимает `ProgressId`, `ValidationVersionId`, `ScoreFrom`, `ScoreTo`, `FinalizationReason`. | `F2B-FE-010` можно реализовать полностью. | Нет. |
| `API-03` | Исправлено: teacher list декларирует `401/403/500`. | Ошибки типизированы. | Нет. |
| `API-04` | Исправлено для новых Phase 2b response DTO: обязательные поля отмечены `required`, nullable поля остаются nullable. | Orval генерирует строгие свойства. | При UI-интеграции учитывать nullable legacy-поля. |
| `API-05` | Исправлено: student list item содержит `progressId` и `validationVersionId`. | Историю можно группировать без дополнительного detail-запроса. | Нет. |
| `API-06` | Teacher task details не содержит validation-конфигурацию. | Нужен отдельный GET при открытии редактора. | Frontend использует `GET .../validation`; backend менять не требуется. |

Повторный аудит не выявил блокирующих расхождений. Открыт только
документированный двухзапросный сценарий `API-06`.

## Матрица ошибок для UI

| Операция | Задекларированные ответы, помимо успеха | Ключевой сценарий |
|---|---|---|
| Capabilities | `401/403/404/422/500` | Нет DBMS или доступа |
| Validation GET | `401/403/404/500` | Нет задания/доступа |
| Validation PUT | `401/403/404/409/422/503/500` | Stale version, неверные веса/эталон, инфраструктура |
| Preview | `401/403/404/422/503/500` | Некорректный draft или анализатор недоступен |
| Publish | `401/403/404/409/422/503/500` | Конфликт версии, эталон не набирает 100 |
| Start/restart/finalize | `401/403/404/409/422` | Закрытое прохождение, конфликт повторного действия |
| Submit attempt | `400/401/403/404/409/422/503/500` | Неверный ключ, лимит, stale state, sandbox failure |
| Student history/detail | `401/403/404/422/500` в зависимости от операции | Только собственные попытки |
| Teacher history/detail | list: `401/403/422/500`; detail: `401/403/404/500` | Доступ и фильтры описаны |

## Следующий шаг

`F2B-FE-003`: использовать generated enum и capabilities конкретной СУБД как
источник вариантов UI. Generated-срез и Swagger лежат в грязном рабочем дереве;
не удалять и не перезаписывать их без проверки владельца изменений.
