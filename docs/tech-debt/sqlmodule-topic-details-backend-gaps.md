# SQL Module: доработки API для деталей темы

## Контекст

Добавлена страница деталей темы преподавателя:

```text
/teacher/topics/:topicId
```

Фронт использует текущие ручки:

- `GET /api/v1/topics/{id}`;
- `GET /api/v1/topics`;
- `GET /api/v1/sql-tasks`;
- `GET /api/v1/sql-queries`;
- `GET /api/v1/target-dbs`;
- `GET /api/v1/dbms-dictionaries`.

## Чего не хватает

1. `TopicResponse.description`.

В макете есть блок `Описание темы`, но текущий `TopicResponse` содержит только:

- `id`;
- `topicName`;
- `parentTopicId`;
- audit-поля.

Желательно добавить:

```json
{
  "description": "Изучение базового синтаксиса SELECT..."
}
```

2. Агрегированные счётчики для темы.

Сейчас фронт считает подтемы и задания локально по спискам. Для масштабирования лучше добавить в read model:

```json
{
  "childrenCount": 3,
  "descendantsCount": 8,
  "tasksCount": 12
}
```

3. Список дочерних тем с краткой статистикой.

Для левой колонки желательно иметь отдельный endpoint или расширенный read model:

```http
GET /api/v1/topics/{id}/children
```

Ответ строки:

```json
{
  "id": "uuid",
  "topicName": "Оператор SELECT",
  "tasksCount": 5,
  "updatedAt": "2026-07-12T10:00:00Z"
}
```

## Приоритет

Высокий: `description`, потому что поле уже заложено в макет окна.

Средний: агрегированные счётчики и children endpoint. Сейчас экран работает через локальную сборку данных, но это плохо масштабируется.
