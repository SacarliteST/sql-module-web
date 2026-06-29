# Задача: подключить orval и сгенерировать API-клиенты

## Контекст

Проект `sql-module-web` уже имеет базовый каркас Фазы 0:
- Vite + React + TypeScript
- Mantine
- React Router
- TanStack Query
- Zustand
- `mount(element, config)`
- standalone `main.tsx`

Документы-источники:
- `CONCEPT.md`
- `ROADMAP.md`
- `ТЗ.md`
- `Promt0.Md`

Текущий этап: **Фаза 0.1. Генерация API-клиентов**.

Нужно подключить генератор клиентов **orval** и подготовить сгенерированный слой для двух сервисов:
- SQLModule API: `sqlModule.swagger.json`
- IdentityService API: `identity.swagger.json`

## Главный принцип

Сгенерированный API-слой не правится руками.

Всё, что находится внутри:

```text
src/api/sqlmodule/
src/api/identity/
```

считается generated-кодом.

Прикладные обёртки, бизнес-хуки, адаптеры ошибок и интеграция с сессией должны жить вне generated-слоя:

```text
src/features/
src/shared/
src/session/
```

## Нужно сделать

1. Установить dev-зависимость:

```powershell
npm install orval -D
```

2. Добавить npm-скрипт в `package.json`:

```json
"api:generate": "orval"
```

3. Создать `orval.config.ts` в корне проекта.

Конфиг должен иметь две цели генерации:

```text
sqlmodule -> ./sqlModule.swagger.json
identity  -> ./identity.swagger.json
```

4. Для SQLModule генерировать код в:

```text
src/api/sqlmodule/
```

5. Для IdentityService генерировать код в:

```text
src/api/identity/
```

6. Использовать режим генерации, удобный для большого API:

```ts
mode: 'tags-split'
```

7. Использовать клиент:

```ts
client: 'react-query'
```

8. Использовать HTTP-клиент:

```ts
httpClient: 'fetch'
```

9. Включить очистку директорий перед генерацией:

```ts
clean: true
```

10. Сгенерировать клиенты командой:

```powershell
npm run api:generate
```

11. Проверить:

```powershell
npm run typecheck
npm run build
```

## Пока НЕ делать

- Не использовать сгенерированные хуки в UI.
- Не делать экран логина.
- Не реализовывать `TokenProvider`.
- Не добавлять авторизационные заголовки.
- Не писать custom mutator.
- Не менять swagger-файлы вручную.
- Не править сгенерированный код руками.
- Не реализовывать реальные экраны Teacher/Student.

## Ожидаемая структура после генерации

Точная структура может отличаться в зависимости от тегов и operationId в OpenAPI, но в целом должно получиться:

```text
src/api/
  sqlmodule/
    ...
  identity/
    ...
```

Если orval создаёт файлы по тегам, это нормально.

## Важные замечания

- Если имена generated-хуков выглядят неудачно, не исправлять их руками.
- Если проблема в плохих `operationId` внутри Swagger, зафиксировать это как замечание для бэкенда/контракта.
- Если генерация падает из-за схемы OpenAPI, сохранить текст ошибки и определить, какой swagger-файл вызывает проблему.
- Если TypeScript падает только внутри generated-кода, сначала проверить настройки orval, а не редактировать generated-файлы.

## Критерии готовности

- В `package.json` есть скрипт `api:generate`.
- В проекте есть `orval.config.ts`.
- `npm run api:generate` успешно создаёт API-клиенты.
- `src/api/sqlmodule/` содержит generated-код SQLModule.
- `src/api/identity/` содержит generated-код IdentityService.
- `npm run typecheck` проходит успешно.
- `npm run build` проходит успешно.
- Существующий UI-заглушка из Фазы 0 продолжает работать.
