import { defineConfig } from 'orval';

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
