import { defineConfig } from 'orval';
import type { OpenApiDocument } from '@orval/core';

const identityTagNames: Record<string, string> = {
  Аудит: 'audit',
  Аутентификация: 'auth',
  Метаданные: 'discovery',
  Пользователи: 'users',
  Состояние: 'health',
};

const normalizeIdentityTags = (spec: OpenApiDocument): OpenApiDocument => {
  const paths = spec.paths ?? {};

  Object.values(paths).forEach((pathItem) => {
    if (!pathItem || typeof pathItem !== 'object') {
      return;
    }

    Object.values(pathItem).forEach((operation) => {
      if (!operation || typeof operation !== 'object' || !('tags' in operation)) {
        return;
      }

      const tags = operation.tags;

      if (!Array.isArray(tags)) {
        return;
      }

      operation.tags = tags.map((tag) => identityTagNames[tag] ?? tag);
    });
  });

  return {
    ...spec,
    tags: spec.tags?.map((tag) => ({
      ...tag,
      name: identityTagNames[tag.name] ?? tag.name,
    })),
  };
};

export default defineConfig({
  sqlmodule: {
    input: {
      target: './sqlModule.swagger.json',
    },
    output: {
      mode: 'tags-split',
      target: './src/api/sqlmodule/index.ts',
      schemas: './src/api/sqlmodule/model',
      client: 'react-query',
      httpClient: 'fetch',
      clean: true,
      override: {
        mutator: {
          path: './src/shared/http/sqlmodule-fetch.ts',
          name: 'sqlmoduleFetch',
        },
      },
    },
  },
  identity: {
    input: {
      target: './identity.swagger.json',
      override: {
        transformer: normalizeIdentityTags,
      },
    },
    output: {
      mode: 'tags-split',
      target: './src/api/identity/index.ts',
      schemas: './src/api/identity/model',
      client: 'react-query',
      httpClient: 'fetch',
      clean: true,
      override: {
        mutator: {
          path: './src/shared/http/identity-fetch.ts',
          name: 'identityFetch',
        },
      },
    },
  },
});
