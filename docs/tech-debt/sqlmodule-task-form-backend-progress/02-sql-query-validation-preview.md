# Пункт 2. SQL validate/preview workflow

Дата реализации: 2026-07-26.

Статус: `Готово`.

## Архитектурное решение

Добавлен stateless endpoint:

```http
POST /api/v1/sql-queries/validate
```

Выбран маршрут без `{id}`, потому что preview должен работать до создания `SqlQuery`.
Один контракт подходит для:

- проверки нового запроса перед сохранением;
- проверки изменённого текста существующего запроса;
- кнопки «Проверить» в форме преподавателя.

Endpoint ничего не сохраняет и не изменяет.

## Запрос

```json
{
  "targetDbId": "guid",
  "queryText": "SELECT id, name FROM employees"
}
```

## Успешный ответ

```json
{
  "isValid": true,
  "columns": ["id", "name"],
  "sampleRows": [
    ["1", "Ivan"],
    ["2", "Anna"]
  ],
  "rowCount": 2,
  "executionTimeMs": 37,
  "validatedAt": "2026-07-26T12:00:00Z"
}
```

Строки возвращаются массивами в порядке `columns`. Это соответствует внутреннему
`QueryResultSet` и позволяет одинаково обрабатывать повторяющиеся имена колонок.

## Правила выполнения

- учебная база материализуется штатным `ITaskMaterializer`;
- запрос выполняется в read-only sandbox;
- timeout берётся из `Sandbox:DefaultQueryTimeoutSeconds`;
- preview ограничивается `Sandbox:MaxRows`;
- SQL-ошибка возвращается как `422 Unprocessable Entity`;
- результат и timestamp не сохраняются в `SqlQuery`.

## Единый validation runner

Sandbox-выполнение вынесено в общий `ISqlQueryValidationRunner`.

Его используют:

- создание `SqlQuery`;
- обновление `SqlQuery`;
- stateless preview.

Поэтому обязательная проверка при create/update сохранена, а отдельный workflow
не может разойтись с ней по timeout, лимиту строк или обработке SQL-ошибок.

## PUT-контракт

`PUT /api/v1/sql-queries/{id}` по-прежнему возвращает `204 No Content`.

Обновлять его до `200 SqlQueryResponse` не потребовалось: frontend получает preview
до сохранения через отдельную операцию, а обязательная проверка повторяется при PUT.

## Frontend-контракт

Swagger обновлён, Orval-клиент перегенерирован штатной командой.

В generated API добавлен mutation hook:

```ts
useValidateSqlQuery
```

Generated-файлы вручную не редактировались.

## Внедрение во фронт

Фронт использует stateless preview через `useValidateSqlQuery`.

Добавлен общий компонент проверки эталонного SQL:

```text
src/features/sql-tasks/ui/SqlQueryValidationPreview.tsx
```

Компонент:

- принимает `targetDbId` и `queryText`;
- вызывает `POST /api/v1/sql-queries/validate`;
- показывает успешный preview в виде таблицы;
- отображает колонки в порядке `columns`;
- отображает строки как массивы значений в том же порядке;
- показывает количество строк, время выполнения и дату проверки;
- показывает SQL/business-ошибки через `title/detail/errors`;
- не показывает пользователю backend `code`;
- очищает старый preview при смене запроса или учебной базы.

Компонент подключён:

1. В модальном окне создания/редактирования задания под preview эталонного запроса.
2. На странице деталей задания в карточке `Эталонный SQL-запрос`.

Preview не считается сохранённым golden result. Поэтому публикация задания по-прежнему
полагается на backend guard из пункта 1.

## Автоматические проверки

- `dotnet build SQLModule.sln --no-restore` — успешно, 0 предупреждений, 0 ошибок.
- `dotnet test UnitTests/UnitTests.csproj --no-build` — успешно, 27 из 27 тестов.
- Целевые интеграционные `SqlQueryTests` — успешно, 13 из 13 тестов.
- Проверено успешное получение preview без сохранения.
- Проверено отклонение ошибочного SQL без сохранения.
- Проверено, что существующий `SqlQuery` не изменяется после preview.
- `npm run api:generate` — успешно.
- `npm run typecheck` — успешно.
- `npm run build` — успешно; остаётся существующее предупреждение Vite о размере основного chunk.

Frontend после внедрения:

- `npm.cmd run typecheck` — успешно.
- `npm.cmd run build` — успешно; остаётся существующее предупреждение Vite о размере основного chunk.
