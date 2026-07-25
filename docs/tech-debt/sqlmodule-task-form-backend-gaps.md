# SQL Module: backend gaps for task form

## Context

The teacher contour now has a universal modal for creating and editing SQL tasks.

The modal is opened from:

- topic details page: create task inside the selected topic;
- topics page: create task for the selected topic;
- task details page: edit an existing task.

Current backend endpoints already used by the UI:

```http
POST /api/v1/sql-tasks
PUT /api/v1/sql-tasks/{id}
GET /api/v1/sql-tasks
GET /api/v1/teacher/tasks/{taskId}/details
```

The UI intentionally removed navigation to `/teacher/topics/{topicId}/tasks/new`.
Creation must happen through the modal, because route segment `new` conflicts with `{taskId:Guid}` on the backend and causes:

```text
Failed to bind parameter "Guid taskId" from "new".
```

## Current UI behavior

### Create mode

The form sends:

```json
{
  "topicId": "guid",
  "sqlQueryId": "guid",
  "taskName": "Простой выбор всех полей",
  "taskText": "Выведите все поля из таблицы employees.",
  "difficultyLevel": 1,
  "publicationStatus": 0
}
```

The frontend can create a task only if it already has:

- selected topic;
- selected existing reference SQL query;
- task title;
- task text;
- difficulty;
- publication status.

### Edit mode

The form sends only fields supported by the current `UpdateSqlTaskRequest`:

```json
{
  "taskName": "Простой выбор всех полей",
  "taskText": "Выведите все поля из таблицы employees.",
  "difficultyLevel": 1,
  "publicationStatus": 1
}
```

Because the update contract does not accept `topicId` and `sqlQueryId`, the UI shows topic and reference SQL query as read-only context.

## Gap 1. Editing task links

`UpdateSqlTaskRequest` does not allow changing:

- `topicId`;
- `sqlQueryId`.

This is safe, but the business rule is not explicit. The backend should decide and document one of the following policies.

### Recommended policy

Allow changing `topicId` and `sqlQueryId` only while the task is a draft and has no student attempts.

Suggested rule:

- draft task without attempts: links can be changed;
- published task: links cannot be changed;
- any task with attempts: links cannot be changed;
- archived/deleted task, if such status appears later: links cannot be changed.

This protects attempt history and keeps teacher UX flexible during preparation.

### Alternative policy

Forbid changing links after creation completely.

If this is the chosen rule, the backend should return a clear business error when clients try to change those fields, and Swagger should describe that topic/query links are immutable.

## Gap 2. Reference SQL query workflow

The design has a `Создать новый запрос` action in the task modal, but the frontend cannot implement it cleanly without a separate SQL query workflow.

Required backend capabilities:

```http
GET /api/v1/sql-queries
GET /api/v1/sql-queries/{id}
POST /api/v1/sql-queries
PUT /api/v1/sql-queries/{id}
```

Suggested create/update payload:

```json
{
  "name": "Выбор всех сотрудников",
  "databaseId": "guid",
  "dbmsProvider": "PostgreSQL",
  "queryText": "SELECT * FROM employees;",
  "description": "Эталонный запрос для базового SELECT"
}
```

Suggested response:

```json
{
  "id": "guid",
  "name": "Выбор всех сотрудников",
  "databaseId": "guid",
  "databaseName": "UniversityDB",
  "dbmsProvider": "PostgreSQL",
  "queryText": "SELECT * FROM employees;",
  "description": "Эталонный запрос для базового SELECT",
  "isValidated": true,
  "updatedAt": "2026-07-26T12:00:00Z"
}
```

The frontend needs the selected query returned immediately after create/update, so it can put `sqlQueryId` into the task form without reloading the whole page.

## Gap 3. SQL validation before publication

The task can currently be switched to a published status from the form. That is risky if the reference query was never executed or is incompatible with the selected training database.

Required backend capability:

```http
POST /api/v1/sql-queries/{id}/validate
```

Suggested validation behavior:

- run the reference SQL query against the selected training database;
- reject dangerous/non-readonly statements if task queries must be read-only;
- apply timeout;
- apply row limit for preview;
- return detected columns;
- return sample rows;
- return execution duration;
- store validation result or validation timestamp if the query is valid.

Suggested success response:

```json
{
  "isValid": true,
  "columns": ["id", "name", "department_id"],
  "sampleRows": [
    {
      "id": 1,
      "name": "Ivan Petrov",
      "department_id": 10
    }
  ],
  "executionTimeMs": 42,
  "validatedAt": "2026-07-26T12:00:00Z"
}
```

Suggested failure response should use the shared ProblemDetails style:

```json
{
  "title": "SQL-запрос не прошёл проверку",
  "detail": "Таблица employees не найдена в базе UniversityDB.",
  "code": "SqlQueryValidationFailed",
  "errors": {
    "queryText": ["Таблица employees не найдена."]
  }
}
```

Frontend display rules:

- show `title` as notification heading;
- show `detail` as the main message;
- for `422`, show field messages from `errors`;
- do not show `code` to the user.

## Gap 4. Publication rules

Publishing a task should be a business action, not just a raw status change.

Recommended endpoint:

```http
POST /api/v1/sql-tasks/{id}/publish
```

The backend should check:

- task has title;
- task has text;
- task has topic;
- task has reference SQL query;
- reference SQL query was validated against the selected training database;
- selected training database is active/available;
- task does not violate rules around attempts or archived entities.

Suggested business errors:

- `TaskReferenceQueryMissing`;
- `TaskReferenceQueryNotValidated`;
- `TaskTrainingDatabaseUnavailable`;
- `TaskAlreadyPublished`;
- `TaskHasAttempts`;
- `TaskTopicArchived`.

The frontend should use these codes only for programmatic decisions, not for direct display.

## Gap 5. Form options read model

For task creation the UI needs lists for:

- available topics;
- available training databases;
- available SQL queries;
- DBMS provider information for each database/query.

At small scale separate existing list endpoints are enough. If the data grows, a dedicated form options endpoint would simplify the frontend and reduce several requests into one.

Suggested endpoint:

```http
GET /api/v1/teacher/tasks/form-options?topicId={topicId}
```

Suggested response:

```json
{
  "topics": [
    {
      "id": "guid",
      "name": "Основы SQL",
      "isAvailableForTaskCreation": true
    }
  ],
  "databases": [
    {
      "id": "guid",
      "name": "UniversityDB",
      "dbmsProvider": "PostgreSQL",
      "isActive": true
    }
  ],
  "sqlQueries": [
    {
      "id": "guid",
      "name": "Выбор всех сотрудников",
      "databaseId": "guid",
      "databaseName": "UniversityDB",
      "dbmsProvider": "PostgreSQL",
      "isValidated": true
    }
  ]
}
```

## Gap 6. Task details read model

The task details screen needs enough data to render both tabs without guessing.

Current frontend needs:

- task id;
- topic id;
- topic name;
- task title;
- task text;
- difficulty;
- publication status;
- reference SQL query id;
- reference SQL query text;
- training database id;
- training database name;
- DBMS provider;
- attempt count;
- last update date.

If any of these values cannot be returned, the UI has to show placeholders like `Тема не указана` or disable actions.

Suggested endpoint shape:

```http
GET /api/v1/teacher/tasks/{taskId}/details
```

Suggested response:

```json
{
  "id": "guid",
  "topicId": "guid",
  "topicName": "Основы SQL",
  "taskName": "Простой выбор всех полей",
  "taskText": "Выведите все поля из таблицы employees.",
  "difficultyLevel": 1,
  "publicationStatus": "Published",
  "sqlQuery": {
    "id": "guid",
    "name": "Выбор всех сотрудников",
    "queryText": "SELECT * FROM employees;",
    "isValidated": true
  },
  "database": {
    "id": "guid",
    "name": "UniversityDB",
    "dbmsProvider": "PostgreSQL"
  },
  "attemptCount": 28,
  "updatedAt": "2026-07-26T12:00:00Z"
}
```

## Minimal MVP backend scope

To unblock the next frontend iteration, enough to implement:

1. Reference SQL query create/update endpoints.
2. Reference SQL query validation endpoint.
3. Either allow changing `sqlQueryId` for draft tasks without attempts, or explicitly document that the link is immutable.
4. Structured business errors using `title`, `detail`, `code`, and `errors`.
5. Publication guard: published task must have a valid reference SQL query.

Everything else can be improved later without blocking the basic teacher workflow.

## Frontend follow-up after backend changes

After Swagger is updated:

1. Run Orval generation.
2. Replace disabled `Создать новый запрос` placeholder with nested modal/workflow.
3. Add validation action for reference query.
4. Disable publishing until validation passes.
5. Keep Russian labels only at display boundaries; enum values from backend stay unchanged in application logic.
