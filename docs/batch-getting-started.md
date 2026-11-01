---
title: Send Batch Requests with $batch
summary: Mount the batch middleware, send several API calls in one JSON request and read the combined response.
category: Batch
readingTime: 6 minutes
index: 1100
---

# Send Batch Requests with $batch

The `batch()` middleware of `@themost/express` lets a client send several API calls in a single HTTP request and receive one combined response. Each call is executed by your own Express application, so it goes through the same routes, middleware and authentication as a normal request.

The format is **JSON-based**. It borrows ideas from OData batch processing (such as atomicity groups) but it is not the OData `multipart/mixed` format. Supported features, schemas and limitations are listed in [Batch reference](batch-reference.md). This article is a hands-on introduction. Transactions and dependent writes are covered in [Atomicity groups and property references](batch-atomicity-groups-and-references.md), and limits, security rules and error handling in [Batch limits, security and errors](batch-security-and-errors.md).

## Mount the middleware

`batch(app, options)` returns an Express router that handles `POST /$batch`. Pass it the same application (or router) that serves your API, and mount it before the routes that should be reachable from a batch.

```js
import express from 'express';
import path from 'node:path';
import { ExpressDataApplication, batch, serviceRouter, dateReviver } from '@themost/express';

const app = express();
const dataApplication = new ExpressDataApplication(path.resolve(process.cwd(), 'config'));

app.use(express.json({ reviver: dateReviver }));
app.use(dataApplication.middleware(app));
// authenticate first so that every sub-request runs on behalf of the caller
app.use('/api/', authenticate, batch(app), serviceRouter);
```

The JSON body parser must be registered before `batch()`, because the middleware reads `req.body.requests`. The data middleware must also be registered before it when you use atomicity groups, because transactions are started through `req.context.db`.

Sub-requests are dispatched through the application passed to `batch()`, so routes registered elsewhere in that application, such as `app.get('/api/TestText', ...)`, are also reachable from a batch.

## Send the first batch

The endpoint accepts `application/json` only. A charset parameter such as `application/json; charset=utf-8` is allowed; any other content type returns `415 Unsupported Media Type`.

```http
POST /api/$batch
Content-Type: application/json
Authorization: Bearer <token>
```

```json
{
  "requests": [
    { "id": "1", "method": "GET", "url": "/api/users/me" },
    { "id": "2", "method": "GET", "url": "/api/users/?$filter=groups/name eq 'Administrators'" }
  ]
}
```

The response is always `200 OK` when the batch itself was accepted:

```json
{
  "responses": [
    { "id": "1", "status": 200, "headers": { "Content-Type": "application/json" }, "body": { "name": "alexis.rees@example.com" } },
    { "id": "2", "status": 200, "headers": { "Content-Type": "application/json" }, "body": { "value": [] } }
  ]
}
```

Requests are executed one after another, in the order you send them. Responses are returned in the same order and carry the `id` of the matching request.

## Describe a request

Each entry of `requests` supports these properties:

| Property | Required | Notes |
|----------|----------|-------|
| `id` | No | A string. When omitted it is assigned from the position in the array (`"1"`, `"2"`, ...). Use string ids; a non-string `id` fails schema validation. |
| `method` | Yes | The HTTP method of the call, for example `GET`, `POST`, `PUT`, `PATCH` or `DELETE`. |
| `url` | Yes | See [Resolve URLs](#resolve-urls). |
| `headers` | No | An object of string values, merged over the inherited headers. |
| `body` | No | The payload for write operations. |
| `atomicityGroup` | No | Runs the request inside a transaction. See [Atomicity groups and property references](batch-atomicity-groups-and-references.md). |
| `dependsOn` | No | Accepted by the schema, but not used for ordering or validation. |

Any other property makes the request fail validation with `400 Bad Request`, because the request schema does not allow additional properties.

## Resolve URLs

Relative URLs are converted to absolute URLs before they are routed:

| `url` | Resolved against | Result when `batch()` is mounted at `/api/` |
|-------|------------------|---------------------------------------------|
| `/api/users/me` | The host of the outer request | `http://<host>/api/users/me` |
| `users/me` | The service root (the mount path of `batch()`) | `http://<host>/api/users/me` |

Only the pathname and the query string are used when the call is dispatched. A fully qualified URL is accepted only when it points to the same origin and stays inside the service root. See [Batch limits, security and errors](batch-security-and-errors.md) for the rules.

## Read the results

Every entry in `responses` has an `id`, a `status` and, when available, `headers` and `body`.

- JSON responses (`res.json()`, or `res.send()` with an object) are returned as parsed JSON.
- Textual responses (`text/*`, JSON or XML content types, or no content type) are returned as strings.
- Other content types, such as `application/octet-stream`, are returned as base64 strings.
- A response without a body, such as `204 No Content`, has no `body` property.

A failing call does not fail the batch. Check each entry:

```js
const { responses } = await fetch('/api/$batch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({
    requests: [
      { method: 'GET', url: 'users/me' },
      { method: 'GET', url: 'users/me/status' }
    ]
  })
}).then((response) => response.json());

const failures = responses.filter((r) => r.status >= 400);
const skipped = responses.filter((r) => r.status === 0);
```

When a call fails without an atomicity group, the remaining calls still run. A request to a route that does not exist, for example, returns a `404` entry while the other entries keep their own status.

## Use headers in sub-requests

A sub-request inherits a fixed set of headers from the outer request: `authorization`, `content-type`, `accept`, `accept-language`, `accept-encoding` and `user-agent`. The `cookie` and `authorization` headers are always inherited. Headers defined in the sub-request take precedence over the inherited ones:

```json
{
  "requests": [
    { "id": "1", "method": "GET", "url": "/api/TestHeaders", "headers": { "Accept-Language": "el" } },
    { "id": "2", "method": "GET", "url": "/api/TestHeaders" }
  ]
}
```

If the outer request was sent with `Accept-Language: en`, the first call sees `el` and the second one sees `en`. Use the `headers` option of `batch()` to change the inherited set.

## Summary and recommendations

- Mount `batch(app)` after the body parser, the data middleware and authentication, and pass it the application that serves your routes.
- Send `application/json` with a `requests` array and read the `responses` array, which keeps the order of the requests.
- Always check the `status` of each entry; the outer `200` only means the batch was accepted.
- Prefer service-root relative URLs such as `users/me` so that requests do not depend on the mount path.

Next, learn how to run groups of writes as transactions in [Atomicity groups and property references](batch-atomicity-groups-and-references.md), review the safeguards in [Batch limits, security and errors](batch-security-and-errors.md), or consult [Batch reference](batch-reference.md).
