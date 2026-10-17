---
title: Getting Started with @themost Express
summary: Install the Express 5 integration and attach a configured data application to your server.
category: Getting Started
readingTime: 4 minutes
index: 100
---

# Getting Started with theMOST Express

`@themost/express` connects an Express application to theMOST data services. It provides a request-scoped data context and an optional router for data models. Version 5 of this package targets Express 5.

## Install and initialize

Install the package alongside Express and the peer packages your application uses:

```sh
npm install express@^5 @themost/express @themost/common @themost/data @themost/query @themost/xml
```

Create an `ExpressDataApplication` with a configuration directory, register JSON parsing, then mount its middleware:

```js
import express from 'express';
import path from 'node:path';
import { ExpressDataApplication, dateReviver } from '@themost/express';

const app = express();
const dataApplication = new ExpressDataApplication(
  path.resolve(process.cwd(), 'config')
);

app.use(express.json({ reviver: dateReviver }));
app.use(dataApplication.middleware(app));

app.listen(3000);
```

The JSON parser is registered first so handlers can read `req.body`. The reviver is optional; it converts matching date-time strings to JavaScript `Date` values while JSON is parsed. The data middleware makes `req.context` available to later handlers.

The constructor accepts a configuration directory path or a configuration source object. This integration uses theMOST data configuration and model builder; add the model definitions and adapter settings your application requires in its configuration.

## Serve the data service router

Mount the exported router at the prefix you want to use for data endpoints:

```js
import { serviceRouter } from '@themost/express';

app.use('/api', serviceRouter);
```

The router uses the application's OData model metadata to serve OData-style entity-set and entity operations. It exposes an OData 4.0 metadata document, but its routes and query handling are the package's implementation rather than a guarantee of complete OData protocol conformance. See [the service router guide](00400-data-service-router.md) for supported behavior and constraints. Authentication can be placed in front of it; see [Protecting routes](00600-authentication-and-authorization.md).

## Compatibility

The package metadata declares Express `^5.2.1` as a peer dependency and Node.js `>=14.21.3`. The repository README lists the 5.x package line for Express 5; use a 4.x-compatible package line for an Express 4 application.

## Summary and next steps

Create one `ExpressDataApplication`, register body parsing before its middleware, and mount the data router only on the paths your application intends to expose. Next, configure adapters and services, then add authentication and application-specific routes.
