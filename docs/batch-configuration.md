---
title: Configure the Batch Middleware
summary: Mount batch() at the right path and tune the min, max and headers options, including how inherited headers work.
category: Batch
readingTime: 5 minutes
index: 1105
---

# Configure the Batch Middleware

`batch(routerOrApplication, options)` returns an Express router with a single route, `POST /$batch`. This article explains where to mount it and how its three options (`min`, `max` and `headers`) change its behavior. For a first example, see [Send batch requests with $batch](batch-getting-started.md). Safeguards such as URL and credential checks are described in [Batch limits, security and errors](batch-security-and-errors.md).

## Mount the middleware and choose the endpoint path

The first argument must be the application (or router) that serves the routes your sub-requests target. Each sub-request is dispatched with its `handle()` method, so routes registered anywhere in that application are reachable.

```js
app.use(express.json());
app.use(dataApplication.middleware(app));
app.use('/api/', authenticate, batch(app), serviceRouter);
```

The endpoint is the mount path followed by `$batch`:

| Mount | Endpoint |
|-------|----------|
| `app.use('/api/', batch(app))` | `POST /api/$batch` |
| `app.use('/v2', batch(app))` | `POST /v2/$batch` |
| `app.use(batch(app))` | `POST /$batch` |

The mount path is also the **service root**. Relative sub-request URLs such as `users/me` are resolved against it, and a sub-request may not leave it. When `batch()` is mounted at the application root, the service root is `/` and every path of the host is reachable.

Mount order matters:

- `express.json()` must come first, because the middleware reads `req.body.requests`.
- `dataApplication.middleware(app)` must come first when you use atomicity groups, because transactions use `req.context.db`.
- Authentication must come first, because sub-requests run on behalf of the outer request's user.
- `batch()` must come before the router that handles the same paths, so `$batch` is not treated as a regular route. Only `POST` requests with a `requests` array are handled; anything else continues to the next middleware.

## Options

All options are optional. Pass an object as the second argument:

```js
app.use('/api/', authenticate, batch(app, {
  min: 1,
  max: 10,
  headers: ['authorization', 'accept', 'accept-language']
}));
```

| Option | Type | Default |
|--------|------|---------|
| `min` | number | `2` |
| `max` | number | `25` |
| `headers` | array of strings | `authorization`, `content-type`, `accept`, `accept-language`, `accept-encoding`, `user-agent` |

A value that is not of the expected type is ignored and the default is used. For example, `min: '1'` falls back to `2`, and `headers: 'accept'` falls back to the default list.

### `min` and `max`

They set the inclusive range of allowed requests per batch. A batch outside the range is rejected with `400 Bad Request` before anything is executed. With the default `min` of `2`, a batch of one request is rejected; use `min: 1` to allow it.

```js
// allow between 1 and 10 requests
batch(app, { min: 1, max: 10 });
```

Requests run one after another, so a larger `max` means a longer HTTP call. Pick a value that fits your server timeouts.

### `headers`

The list of header names copied from the outer request to every sub-request. Names are matched case-insensitively (they are lower-cased when the middleware is created), and every entry must be a string. Providing a list **replaces** the default list, it is not merged with it:

```js
// forward only the accept header (plus authorization and cookie, see below)
batch(app, { headers: ['accept'] });
```

## How inherited headers work

For each sub-request the middleware builds the headers in three steps:

1. **Inherit.** From the headers of the outer request it keeps the ones listed in the `headers` option, plus `authorization` and `cookie`, which are always kept. Headers that are not listed (for example `x-forwarded-for` or internal proxy headers) are not forwarded.
2. **Override.** Headers defined in the sub-request's own `headers` object are added on top. Their names are lower-cased, and they win over inherited headers.
3. **Content length.** `content-length` is recalculated from the sub-request `body`, or removed when there is no body.

Header values in a sub-request must be strings, as required by the request schema.

```json
{
  "requests": [
    { "id": "1", "method": "GET", "url": "TestHeaders", "headers": { "Accept-Language": "el" } },
    { "id": "2", "method": "GET", "url": "TestHeaders" }
  ]
}
```

When the outer request has `Accept-Language: en`, request `1` runs with `el` and request `2` with `en`.

`authorization` and `cookie` are restricted: a sub-request may repeat them only with the same value as the outer request. Any other value rejects the whole batch with `400 Bad Request`, and a sub-request cannot add them when the outer request does not have them. Removing `authorization` from the `headers` option does not stop it from being forwarded.

Because `content-type` is in the default list, sub-requests inherit the outer `application/json` content type. If you replace the list without it, sub-requests send no content type of their own unless they define one.

## Summary and recommendations

- Mount `batch(app, options)` after body parsing, the data middleware and authentication, and before your service router; the endpoint is `<mount path>/$batch`.
- Use `min` and `max` to bound the work a single call can trigger.
- Treat `headers` as an allow-list. It replaces the default list, and `authorization` and `cookie` are always forwarded.
- Let sub-requests override headers such as `Accept-Language` per request, but never credentials.

See [Batch reference](batch-reference.md) for the schemas, and [Batch limits, security and errors](batch-security-and-errors.md) for the safeguards that apply to every batch.
