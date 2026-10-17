---
title: Configure the Express Data Application
summary: Understand configuration sources, adapter declarations, and application service registration.
category: Configuration
readingTime: 5 minutes
index: 200
---

# Configure the Express Data Application

`ExpressDataApplication` wraps theMOST configuration and registers the default data configuration strategy, model builder, and service-router support. Its constructor accepts either a configuration directory or a configuration source object.

```js
import path from 'node:path';
import { ExpressDataApplication } from '@themost/express';

const fromDirectory = new ExpressDataApplication(
  path.resolve(process.cwd(), 'config')
);

const fromSource = new ExpressDataApplication({
  settings: {
    app: { base: '/portal' },
    auth: { unattendedExecutionAccount: 'system' }
  }
});
```

The object form is useful for small overrides or tests. A file-based application can define settings, services, adapter types, and adapters in its configuration. Adapter implementation modules and drivers must be installed separately.

## Adapter configuration

The documented configuration schema describes adapter types by module and invariant name, then names adapter instances and selects a default. A simplified example is:

```json
{
  "adapterTypes": [
    {
      "name": "SQLite Data Adapter",
      "invariantName": "sqlite",
      "type": "@themost/sqlite"
    }
  ],
  "adapters": [
    {
      "name": "development",
      "invariantName": "sqlite",
      "default": true,
      "options": {
        "database": "./data/app.db"
      }
    }
  ]
}
```

Use options appropriate to the adapter package and environment. Do not place production credentials in committed configuration files.

## Register services

Services listed in the configuration are loaded during application construction. A `serviceType` can identify an import and exported constructor separated by `#`. An optional `strategyType` provides the implementation strategy for that service:

```json
{
  "services": [
    { "serviceType": "./services/audit#AuditService" },
    {
      "serviceType": "./services/catalog#CatalogService",
      "strategyType": "./services/catalog#CatalogStrategy"
    }
  ]
}
```

You can also register constructors in application code. `useService` constructs the service itself; `useStrategy` constructs and stores a strategy under the service constructor's name.

```js
import { ExpressDataApplication } from '@themost/express';

class HealthService {
  constructor(application) {
    this.application = application;
  }
}

const dataApplication = new ExpressDataApplication('./config');
dataApplication.useService(HealthService);
const health = dataApplication.getService(HealthService);
```

`hasService`, `getService`, `hasStrategy`, and `getStrategy` provide corresponding lookup operations. `getConfiguration()` returns the underlying configuration; `configuration` is also exposed as a property.

## Model builder

The application creates an `ODataConventionModelBuilder` from its configuration during initialization. `getBuilder()` returns the active `ODataModelBuilder`; `useModelBuilder()` initializes the convention builder again. Model metadata is what lets the built-in router map URL entity-set names to data models.

## Summary and recommendations

Keep configuration explicit: define the adapter type and default adapter instance, and register services through configuration or the application methods. Install and configure the actual data adapter separately, and keep secrets outside source-controlled files.
