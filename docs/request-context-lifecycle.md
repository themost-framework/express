---
title: Request Context and Lifecycle
summary: Learn how the request data context is created, how its user is linked to Express, and when it is finalized.
category: Requests and Data
readingTime: 5 minutes
index: 300
---

# Request Context and Lifecycle

The middleware returned by `dataApplication.middleware(app)` creates an `ExpressDataContext` for each ordinary request and exposes it through `req.context`. Later handlers can use that context to access configured models and the active application.

```js
app.use(dataApplication.middleware(app));

app.get('/products', async (req, res, next) => {
  try {
    const products = await req.context.model('Product').getItems();
    res.json(products);
  } catch (error) {
    next(error);
  }
});
```

Register data middleware before routes that use `req.context`. The context is associated with the application configuration; the request's `context.user` getter and setter read and write `req.user`. Updating the context user refreshes context state, allowing data operations to observe the current request identity.

## Finalization and cleanup

The application middleware listens for the response `close` event. It disposes `req.context.db` when that adapter provides `dispose()`, then finalizes the context. Built-in service responses also finalize the context before formatting the result. For streamed responses, finalization happens before the stream is written.

For custom middleware with explicit context ownership, the package exports `setContext` and `finalizeContext` from `@themost/express`. `setContext(application)` creates a context and registers cleanup on response finish/close. It finalizes an already assigned context before replacing it. Use it when you need that lifecycle explicitly; do not create multiple contexts for one request without a clear ownership boundary.

## Subrequests

When a request has a `parentReq` carrying an existing context, the application middleware reuses the parent context and shares its user rather than creating a separate context. The `setContext` helper also detects parent requests during finalization to avoid prematurely finalizing a context shared with the parent.

## Work outside HTTP requests

Use `createContext()` to create a context manually. The application also has an `execute(callable, callback)` method that creates a context, runs a callback-style operation, and finalizes the context before invoking the completion callback:

```js
dataApplication.execute((context, done) => {
  context.model('Product').getItems()
    .then(items => done(null, items))
    .catch(done);
}, (error, items) => {
  if (error) throw error;
  console.log(items.length);
});
```

The callback passed to `execute` is the lifecycle completion callback; ensure asynchronous work calls `done` exactly once.

## Summary and recommendations

Use the middleware-created `req.context` within HTTP handlers and let the framework finalize it. For manually created contexts, choose a single owner and always complete the callback-based operation so cleanup can run.
