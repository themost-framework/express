---
title: Handle Errors and Parse Request Bodies
summary: Configure request parsing and pass handler failures through Express error middleware.
category: Middleware
readingTime: 5 minutes
index: 700
---

# Handle Errors and Parse Request Bodies

The package's route handlers use normal Express error propagation: asynchronous data errors are passed to `next(error)`. Install any application error middleware after the routes so it can receive those errors.

```js
app.use(express.json({ reviver: dateReviver }));
app.use(dataApplication.middleware(app));
app.use('/api', serviceRouter);

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }
  const status = error.status || error.statusCode || 500;
  return res.status(status).json({
    error: error.message || 'Internal Server Error'
  });
});
```

The response example is a simple application policy, not a built-in error format. In production, avoid returning internal exception details for unexpected server errors; log details on the server and return a suitably limited message.

## Parse bodies before routes

Use Express's parsers before routes that read request bodies. The package README demonstrates `express.json({ reviver: dateReviver })`; `dateReviver` converts date-time strings that match its pattern into `Date` instances. The service router requires a parsed body for write operations. Its entity-set POST/PUT and DELETE handlers forward a bad-request error when the body is missing; entity updates also validate the route key.

```js
app.use(express.json({ reviver: dateReviver }));
app.use(express.urlencoded({ extended: false }));
app.use(dataApplication.middleware(app));
```

The URL-encoded parser is an Express choice for form submissions, not a parser added by this package. Configure appropriate limits and accepted content types for your application.

## Route errors and not-found behavior

Custom handlers can forward a framework HTTP error, for example `next(new HttpNotFoundError())`, or return an explicit response such as `res.status(400).send()`. The data router can pass errors including missing model/entity-set cases to Express. A missing individual entity may instead continue to later middleware in the `getEntity` handler, so your final not-found response remains an application responsibility.

## Summary and recommendations

Install body parsers before the routes that consume them, forward asynchronous failures through `next(error)`, and put your error handler last. Define a consistent status and disclosure policy rather than exposing raw internal errors.
