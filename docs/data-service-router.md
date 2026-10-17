---
title: Use the Built In Data Service Router
summary: Mount the service router and understand its entity-set, entity, metadata, and operation routes.
category: Routing
readingTime: 6 minutes
index: 400
---

# Use the Built-In Data Service Router

The exported `serviceRouter` is an Express router backed by the active application's OData model builder and request context. Mount it beneath an API prefix after the data-context middleware:

```js
import { serviceRouter } from '@themost/express';

app.use(dataApplication.middleware(app));
app.use('/api', serviceRouter);
```

The built-in routes include:

| Request path beneath `/api` | Operation |
| --- | --- |
| `/` | Entity-set index |
| `/$metadata` | Metadata document |
| `/:entitySet` | Read, create/update (POST or PUT), or delete an entity set |
| `/:entitySet/:id` | Read, update (POST), or delete one entity |
| `/:entitySet/:id/:navigationProperty` | Read a navigation property |
| `/:entitySet/:entitySetFunction` | Invoke an entity-set function |
| `/:entitySet/:entitySetAction` | Invoke an entity-set action (POST) |
| `/:entitySet/:entitySetFunction/:entityFunction` | Invoke a function-related route |
| `/:entitySet/:entitySetFunction/:entityAction` | Invoke an action-related route (POST) |
| `/:entitySet/:entitySetFunction/:navigationProperty` | Read a function-related navigation property |
| `/:entitySet/:id/:entityAction` | Invoke an entity action (POST) |

The router also registers routes for entity functions and function-related navigation paths. Exact operations available depend on functions/actions and entity sets in the model metadata. `bindEntitySet()` resolves the route's `entitySet` parameter through the model builder; an unrecognized entity set is allowed to continue to later Express handlers.

## OData compatibility

`serviceRouter` is OData-oriented and uses the application's OData model builder. The root route returns an entity-set service document, and `/$metadata` returns the model's XML metadata document with an `OData-Version: 4.0` header. Responses for entity collections use the framework's mapped data shape (typically `{ value: [...] }`); when counting is requested, the list response can include `@odata.count` and `@odata.skip`.

This is not a claim of complete OData 4.0 protocol conformance. The router implements the routes and options described here, and delegates query parsing and execution to `@themost/data`. Entity-set requests pass query parameters to `filter()` and default `$top` to 25; `$count` is handled by the router, with `$inlinecount` also accepted for compatibility. Single-entity requests only pass `$select` and `$expand` to the model filter. Writes use this package's POST/PUT/DELETE handlers; for example, single-entity updates are handled with POST, and the router does not register PATCH. Check client interoperability against the operations your application uses rather than assuming every OData client feature is supported.

The default response path is JSON. XML metadata is served directly, but XML entity response formatting requires registering and configuring a response formatter; it should not be assumed that every OData JSON or XML representation is supported out of the box.

## Query options and response limits

Entity-set and navigation queries pass request query parameters to the data model's `filter` method. The list middleware supplies a default `$top` of 25 when no value overrides it. On entity-set requests, `$count` and the legacy `$inlinecount` flag select a list response with count information; without the count flag, the router retrieves items. Available filtering, projection, ordering, expansion, and other query behavior depends on `@themost/data` and the configured model. For public APIs, consider adding policy middleware to bound or validate client query options.

## Router extensions

To protect the whole API, mount authentication before the router. To add an endpoint within the service router, the application publishes a `serviceRouter` `BehaviorSubject` that application services can subscribe to. An extension can insert a custom router's stack at the start:

```js
import express from 'express';
import { ApplicationService } from '@themost/common';

class ServiceRouterExtension extends ApplicationService {
  constructor(application) {
    super(application);
    application.serviceRouter.subscribe(router => {
      const custom = express.Router();
      custom.get('/health', (req, res) => res.json({ status: 'ok' }));
      router.stack.unshift(...custom.stack);
    });
  }
}

dataApplication.useService(ServiceRouterExtension);
```

This technique depends on Express router stack ordering. Prefer mounting a separate Express router when an endpoint does not need to be part of the data router; avoid changing the stack after serving traffic.

## Summary and recommendations

Mount `serviceRouter` only after request context setup, and use model metadata to define the entities and operations it can expose. Treat it as an OData-oriented API with an OData 4.0 metadata endpoint, not as a promise of complete protocol conformance. Add authentication and query limits at the mount point, and extend its stack deliberately because order affects which handler matches first.
