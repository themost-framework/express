---
title: Batch Limits, Security and Errors
summary: Configure batch limits and inherited headers, understand the URL and header safeguards and interpret batch-level and per-request errors.
category: Batch
readingTime: 6 minutes
index: 1120
---

# Batch Limits, Security and Errors

The `batch()` middleware executes many requests on behalf of one caller, so it applies several safeguards before and while it runs them. This article describes the rules that protect your service and the errors a client can receive. For the basics, see [Send batch requests with $batch](batch-getting-started.md); for transactions, see [Atomicity groups and property references](batch-atomicity-groups-and-references.md).

## Configuration

The `min`, `max` and `headers` options are described in [Configure the batch middleware](batch-configuration.md). In short, `max` bounds the work one call can trigger, and `headers` is an allow-list of headers forwarded to sub-requests, which prevents internal or proxy headers from leaking. `authorization` and `cookie` are always forwarded.

## Security safeguards

### Same service only

Every sub-request must target the service that received the batch. After a URL is resolved against the service root, a request is rejected with `400 Bad Request` if it has a different origin or if its path is outside the service root. All of the following are rejected when `batch()` is mounted at `/api/`:

| `url` | Why |
|-------|-----|
| `http://example.com/api/users/me` | Different host |
| `//example.com/api/users/me` | Protocol-relative URL to a different host |
| `/other/users/me` | Outside `/api/` |
| `/api/../other/users/me` | Leaves the service root through `..` segments |
| `../other/users/me` | Leaves the service root through `..` segments |
| `/apiother/users/me` | Only shares a prefix with `/api` |

An absolute URL to the current host (for example `http://localhost:3000/api/users/me`) and a path with a dot segment that stays inside the root (`/api/./users/me`) are accepted. The check happens for the whole batch before any request runs, so a single bad URL rejects the batch and nothing is executed.

### One identity per batch

All sub-requests run with the data context of the outer request. For this reason a sub-request cannot switch identity:

- `authorization` and `cookie` are always copied from the outer request.
- A sub-request may repeat them, but only with exactly the same value. Any different value, in any letter case of the header name, rejects the whole batch with `400 Bad Request`.

Authenticate the route before `batch()` so that the context is already set when the sub-requests run.

### No nested batches

A sub-request that targets `$batch` is not executed as a batch. Its entry in `responses` has status `400` and the message `Nested batch requests are not supported`.

### No caching

The `$batch` response, including error responses such as `415`, is sent with `Cache-Control: no-store`, and conditional requests with `If-None-Match` are not answered from a cache. Cache headers returned by sub-requests are reported in their own `headers` entry but do not change the headers of the batch response.

## Batch-level errors

These errors reject the whole batch. They are forwarded to your Express error middleware, so their format depends on your error handler (see [Handle errors and parse request bodies](errors-and-request-parsing.md)).

| Condition | Status |
|-----------|--------|
| Content type is not `application/json` | `415` |
| Fewer than `min` or more than `max` requests | `400` |
| A request without a string `method` or `url` | `400` |
| A request that fails schema validation (for example a non-string `id` or an unknown property) | `400` |
| A URL outside the current service | `400` |
| A different `authorization` or `cookie` header in a request | `400` |
| `atomicityGroup` set on some requests but not on all | `400` |

A payload without a `requests` array is not handled by the batch middleware: the request continues to the next middleware of your application.

## Per-request errors

Failures of an individual request are returned inside `responses` while the outer response stays `200 OK`:

| Scenario | Entry `status` |
|----------|----------------|
| The handler passes an error to `next(error)` | The `status` or `statusCode` of the error, or `500` |
| No route matches | `404` |
| A `$$` reference cannot be resolved | `400` or `424` |
| A sibling of a failed atomicity group | `0` |

The `body` of an error entry contains the own properties of the error, such as `message`, plus a `name` with the constructor name of the error:

```json
{ "id": "2", "status": 500, "body": { "message": "This is a status error", "name": "Error" } }
```

The `stack` property is included only when the application environment (`app.get('env')`) is `development` or `test`. In `production` it is removed, so error entries do not disclose internals. Make sure `NODE_ENV` is set correctly in deployed environments.

## Inspect child requests in handlers

Handlers can detect that they are running inside a batch through properties added to the sub-request:

```js
app.get('/api/TestInfo', (req, res) => {
  if (req.batchReq) {
    // the sub-request definition (id, method, url, headers, ...)
    // req.parentReq is the outer $batch request
    // req.context is the same data context as the parent
  }
  res.json({ batch: !!req.batchReq });
});
```

## Summary and recommendations

- Keep `max` at a value your service can handle and authenticate before mounting `batch()`.
- Restrict the inherited `headers` to those your API needs; `authorization` and `cookie` are always forwarded.
- Expect `400` for URLs that leave the service, for mismatched credentials headers and for nested batches.
- Check every entry of `responses`, set `NODE_ENV` correctly so stacks are not exposed, and install an error handler after the routes for batch-level errors.

See [Batch reference](batch-reference.md) for the schemas, implementation details and limitations.
