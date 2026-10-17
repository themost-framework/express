---
title: Test an Express Data Application
summary: Exercise routes with Supertest and clean up the configured data application after tests.
category: Testing
readingTime: 5 minutes
index: 1000
---

# Test an Express Data Application

The repository tests use Jest and Supertest to exercise Express applications without opening a network port. Build the same middleware stack used in production, then send requests directly to the app:

```js
import express from 'express';
import request from 'supertest';
import { ExpressDataApplication, dateReviver, serviceRouter } from '@themost/express';

const app = express();
const dataApplication = new ExpressDataApplication('./spec/test/config');

app.use(express.json({ reviver: dateReviver }));
app.use(dataApplication.middleware(app));
app.use('/api', serviceRouter);

const response = await request(app)
  .get('/api')
  .set('Accept', 'application/json');

expect(response.status).toBe(200);
```

Use a dedicated test configuration and adapter so tests do not depend on production data. When a route requires authentication, register a test strategy and mount Passport before the target router, as in the package's service-router tests.

## Test custom routes and responses

For a custom handler, mount it after the data middleware and assert both status and response body. The package tests also demonstrate custom routers, router extensions, JSON formatting, XML formatting, and checking that the context can be accessed within a handler.

```js
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const health = await request(app).get('/health');
expect(health.status).toBe(200);
expect(health.body).toEqual({ status: 'ok' });
```

## Clean up after tests

Finalize the data application after a test suite finishes, particularly when its adapter keeps resources open. In repository tests this cleanup is performed in `afterAll` through a helper:

```js
afterAll(async () => {
  await finalizeTestDataApplication(dataApplication);
});
```

`finalizeTestDataApplication` above represents a project-specific cleanup helper, not a package export. If a test creates an individual context directly with `createContext()`, finalize that context when the test is done.

Run the repository's scripts with `npm test` for Jest or `npm run lint` for source linting.

## Summary and recommendations

Test the real Express middleware order with Supertest, isolate the test database configuration, and clean up application/context resources after each suite. Test authentication and representation negotiation explicitly when those features affect route behavior.
