---
title: Build Custom Routes with Data Context
summary: Use req.context in ordinary Express routes for queries and writes that do not fit the built-in router.
category: Data Access
readingTime: 5 minutes
index: 500
---

# Build Custom Routes with Data Context

The data middleware makes a configured data context available to ordinary Express route handlers. Use it when an endpoint needs a custom response or workflow rather than the built-in entity-set routes. A custom route can query the same models, but it does not automatically implement OData URL conventions, query-option parsing, metadata, or response envelopes; use `serviceRouter` when you want its OData-oriented behavior.

```js
import express from 'express';
import { HttpNotFoundError } from '@themost/common';

const products = express.Router();

products.get('/:id', async (req, res, next) => {
  try {
    const item = await req.context.model('Product')
      .where('id').equal(req.params.id)
      .getItem();

    if (item == null) {
      return next(new HttpNotFoundError());
    }
    return res.json(item);
  } catch (error) {
    return next(error);
  }
});

products.post('/', async (req, res, next) => {
  try {
    if (req.body === undefined) {
      return res.status(400).send();
    }
    await req.context.model('Product').save(req.body);
    return res.json(req.body);
  } catch (error) {
    return next(error);
  }
});

app.use('/products', products);
```

Register a JSON body parser before this router if the endpoint accepts JSON. The model name supplied to `context.model()` must match a model available in the application's configuration. Queries and writes return promises; forward rejected errors with `next(error)` so Express's error handling can process them.

## Context and identity

Use `req.context.user` when data-layer code needs the authenticated request user; it is linked to Express's `req.user`. Authentication middleware must run before the handler that depends on the identity. Avoid accepting a user identity from an untrusted request body as a substitute for authentication.

## Manual context use

Outside an HTTP handler, create a context with `dataApplication.createContext()` or use `dataApplication.execute()` to run callback-style work with automatic finalization. Do not retain an HTTP request context for later/background work; create a separate context for work that outlives the response.

## Summary and recommendations

Custom Express routes can use the same configured models through `req.context`. Keep the model operations in the context, validate input at the route boundary, forward errors through Express, and allow the request lifecycle to finalize its context.
