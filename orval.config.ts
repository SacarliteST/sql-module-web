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
    },
  },
});
