# Runtime config

`runtime-config.json` is used by the standalone entry point.

These values can be changed without rebuilding the application:

```json
{
  "sqlModuleApiUrl": "http://localhost:5202",
  "identityApiUrl": "http://localhost:5001",
  "basePath": "/"
}
```

Embedded mode should pass the same values directly to `mount(element, config)`.
