# SQL Module: doработки бэка для деталей задания

> **Статус: закрыто 25.07.2026.**
> Реализован агрегированный endpoint `GET /api/v1/teacher/tasks/{taskId}/details`,
> статус публикации `SqlTask`, состав таблиц учебной базы и snapshot отображаемого
> имени студента в `Attempt`. Экран деталей переведён на новую read-модель.

## Контекст

Экран преподавателя `/teacher/topics/:topicId/tasks/:taskId` реализован по макету Stitch "Детали задания: Простой выбор всех полей".

Изначально фронт собирал экран из нескольких ручек:

- `GET /api/v1/sql-tasks/{id}` - данные задания;
- `GET /api/v1/topics/{id}` - название темы для хлебных крошек;
- `GET /api/v1/sql-queries/{id}` - эталонный SQL-запрос;
- `GET /api/v1/target-dbs/{id}` - учебная база;
- `GET /api/v1/dbms-dictionary/{id}` - СУБД;
- `GET /api/v1/attempts?TaskId=...` - последние попытки.

После доработки экран использует агрегированную read-модель `GET /api/v1/teacher/tasks/{taskId}/details`.

## Реализованные доработки

1. В `SqlTaskResponse` добавлен статус публикации задания:
   `Draft`, `Published`, `Archived`.

2. Карточка "Контекст выполнения" получает краткий состав учебной базы:
   имя таблицы и количество колонок.

3. В `Attempt` сохраняется snapshot `StudentName` из JWT claim `name`.
   Read-модель не зависит от доступности IdentityService и не выполняет N+1-запросы.

4. Агрегированная read-модель возвращает задание, тему, SQL-запрос, базу,
   СУБД, состав таблиц, счётчик попыток и пять последних попыток.

## Реализованная ручка

```http
GET /api/v1/teacher/tasks/{taskId}/details
```

Минимальный ответ:

```json
{
  "taskId": "guid",
  "topicId": "guid",
  "topicName": "Основы SQL",
  "taskName": "Простой выбор всех полей",
  "description": "Выведите все поля из таблицы сотрудников.",
  "difficultyLevel": 1,
  "publicationStatus": "Published",
  "updatedAt": "2026-07-18T00:00:00Z",
  "sqlQuery": {
    "sqlQueryId": "guid",
    "sqlText": "SELECT * FROM employees;",
    "isRequiredColumnOrder": true,
    "isRequiredRowOrder": false
  },
  "targetDb": {
    "targetDbId": "guid",
    "dbName": "UniversityDB",
    "dbmsName": "PostgreSQL",
    "tables": [
      { "tableName": "employees", "columnsCount": 6 }
    ]
  },
  "attemptsCount": 28,
  "lastAttempts": [
    {
      "attemptId": "guid",
      "studentId": "guid",
      "studentName": "Иван Петров",
      "isCorrect": true,
      "durationMs": 120,
      "finishedAt": "2026-07-18T10:30:00Z"
    }
  ]
}
```

## Принятые решения

- Новые задания создаются в статусе `Draft`, если статус не передан явно.
- Обновление без `publicationStatus` сохраняет текущий статус.
- Старые задания мигрируются в `Draft`.
- Для старых попыток `studentName` заполняется строковым `userId`.
- Endpoint доступен ролям `Teacher` и `Admin`.
