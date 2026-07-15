# `$batch` — Batch Requests in `@themost/express`

This document describes the batch request feature provided by the `batch()` middleware in `@themost/express`. It lets clients send multiple API operations in a single HTTP request and receive a combined response.

The implementation is **JSON-based** and inspired by OData batch concepts (including atomicity groups / changesets), but it is **not** the standard OData multipart/mixed batch format.

---

## Table of Contents

1. [Overview](#overview)
2. [Setup](#setup)
3. [Endpoint](#endpoint)
4. [Request Format](#request-format)
5. [Response Format](#response-format)
6. [Basic Examples](#basic-examples)
7. [Atomicity Groups](#atomicity-groups)
8. [Property References (`$$`)](#property-references-)
9. [Error Handling](#error-handling)
10. [Configuration](#configuration)
11. [Request Schema](#request-schema)
12. [Implementation Details](#implementation-details)
13. [Limitations](#limitations)

---

## Overview

The `$batch` endpoint accepts a JSON payload containing an array of sub-requests. Each sub-request is executed against the same Express application router as a normal HTTP request.

| Feature | Supported |
|---------|-----------|
| Multiple operations in one HTTP call | Yes |
| Sequential execution | Yes |
| Per-request error isolation (without atomicity groups) | Yes |
| Atomicity groups with database transactions | Yes |
| Body property references (`$$id.property`) | Yes (inside atomicity groups) |
| URL references (`$id`) | No |
| `dependsOn` field | No (defined in schema, not enforced) |
| OData multipart batch format | No |

### Benefits

- **Fewer round trips** — combine related reads or writes in one call
- **Transactional writes** — use atomicity groups for all-or-nothing database operations
- **Dependent writes** — reference values from earlier requests in the same batch

---

## Setup

Register the `batch()` middleware **before** your application router so sub-requests are routed through the same handlers:

```javascript
import express from 'express';
import { ExpressDataApplication, batch, serviceRouter } from '@themost/express';

const app = express();
const dataApplication = new ExpressDataApplication(/* config path */);

app.use(express.json());
app.use(dataApplication.middleware(app));

// batch() must receive the same app/router that handles your API routes
app.use('/api/', authenticate, batch(app), serviceRouter);
```

The `batch()` function returns an Express `Router` that exposes the `POST /$batch` route.

---

## Endpoint

```
POST /api/$batch
Content-Type: application/json
```

| Requirement | Value |
|-------------|-------|
| HTTP method | `POST` |
| Content-Type | `application/json` (required; other types return `406 Not Acceptable`) |
| Minimum sub-requests | `2` (default, configurable) |
| Maximum sub-requests | `25` (default, configurable) |

Authentication and other headers from the outer request are forwarded to each sub-request (see [Configuration](#configuration)).

---

## Request Format

```json
{
  "requests": [
    {
      "id": "1",
      "method": "GET",
      "url": "/api/users/me"
    },
    {
      "id": "2",
      "method": "POST",
      "url": "/api/orders",
      "atomicityGroup": "create-order",
      "body": {
        "customer": "$$1.id",
        "orderedItem": {
          "name": "Example Product"
        }
      }
    }
  ]
}
```

### Sub-request fields

| Field | Required | Description |
|-------|----------|-------------|
| `id` | No | Unique identifier for the sub-request. Auto-assigned as `"1"`, `"2"`, … when omitted. |
| `method` | Yes | HTTP method: `GET`, `POST`, `PUT`, `PATCH`, or `DELETE`. |
| `url` | Yes | Target path. Paths starting with `/` are resolved against the host of the outer request. |
| `body` | No | Request body for `POST`, `PUT`, or `PATCH`. |
| `atomicityGroup` | No | Group name for transactional execution. See [Atomicity Groups](#atomicity-groups). |
| `dependsOn` | No | Present in the JSON schema but **not used** by the current implementation. |
| `headers` | No | Ignored — sub-request headers are copied from the outer request instead. |

### URL resolution

Relative URLs are converted to absolute URLs before routing:

```
/api/users/me  →  http://<host>/api/users/me
```

Only the pathname and query string are used when the sub-request is dispatched through Express.

---

## Response Format

A successful batch envelope is always returned with HTTP status `200`:

```json
{
  "responses": [
    {
      "id": "1",
      "status": 200,
      "headers": {
        "Content-Type": "application/json"
      },
      "body": {
        "name": "alexis.rees@example.com"
      }
    },
    {
      "id": "2",
      "status": 500,
      "body": {
        "message": "This is a status error",
        "name": "Error"
      }
    }
  ]
}
```

### Response entry fields

| Field | Description |
|-------|-------------|
| `id` | Matches the sub-request `id`. |
| `status` | HTTP status of the sub-request. `0` means the request was not executed (see [Atomicity Groups](#atomicity-groups)). |
| `headers` | Response headers from the sub-request (when available). |
| `body` | Response body or error details. |
| `atomicityGroup` | Present when the entry belongs to a failed atomicity group. |

Individual sub-request failures do **not** change the outer HTTP status — inspect each entry in `responses`.

---

## Basic Examples

### Multiple GET requests

**Request:**

```http
POST /api/$batch
Content-Type: application/json
```

```json
{
  "requests": [
    {
      "id": "1",
      "method": "GET",
      "url": "/api/users/me"
    },
    {
      "id": "2",
      "method": "GET",
      "url": "/api/users/?$filter=groups/name eq 'Administrators'"
    }
  ]
}
```

**Response:**

```json
{
  "responses": [
    {
      "id": "1",
      "status": 200,
      "body": { "name": "alexis.rees@example.com" }
    },
    {
      "id": "2",
      "status": 200,
      "body": { "value": [ /* ... */ ] }
    }
  ]
}
```

### Mixed success and failure (no atomicity group)

When one sub-request fails, the others still run:

```json
{
  "requests": [
    { "id": "1", "method": "GET", "url": "/api/users/me" },
    { "id": "2", "method": "GET", "url": "/api/users/me/status" }
  ]
}
```

Request `1` returns `200`; request `2` returns `500` with error details. No rollback occurs.

### Unknown endpoint

Unmatched routes return `404` for that sub-request:

```json
{
  "id": "1",
  "method": "GET",
  "url": "/api/NonExistingEndpoint",
  "status": 404
}
```

---

## Atomicity Groups

An **atomicity group** is a named set of sub-requests executed inside a single database transaction via `req.context.db.executeInTransactionAsync()`.

### Rules

1. If **any** sub-request includes `atomicityGroup`, **every** sub-request in the batch must include it — otherwise the batch returns `400 Bad Request`.
2. Sub-requests in the same group run **sequentially** inside one transaction.
3. Different groups run **sequentially**, each in its own transaction.
4. If one sub-request in a group fails, the transaction is **rolled back** and sibling requests in that group are marked with `status: 0` (not executed).
5. Sub-requests in other groups are unaffected.

### Example: rollback on failure

```json
{
  "requests": [
    {
      "id": "1",
      "method": "POST",
      "atomicityGroup": "create-user",
      "url": "/api/users",
      "body": {
        "name": "Test User",
        "alternateName": "test100@example.com"
      }
    },
    {
      "id": "2",
      "method": "GET",
      "atomicityGroup": "create-user",
      "url": "/api/NonExistingEndpoint"
    },
    {
      "id": "3",
      "method": "GET",
      "atomicityGroup": "get-user",
      "url": "/api/users?$filter=alternateName eq 'test100@example.com'"
    }
  ]
}
```

- Group `create-user` fails at request `2` → request `1` is rolled back.
- Group `get-user` runs independently → request `3` finds zero users, confirming the rollback.

### Example: commit on success

```json
{
  "requests": [
    {
      "id": "1",
      "method": "POST",
      "atomicityGroup": "create-customer",
      "url": "/api/people",
      "body": {
        "name": "Test Customer",
        "givenName": "Test",
        "familyName": "Customer"
      }
    },
    {
      "id": "2",
      "method": "POST",
      "atomicityGroup": "create-order",
      "url": "/api/orders",
      "body": {
        "orderedItem": { "name": "Apple MacBook Air" },
        "customer": { "givenName": "Test", "familyName": "Customer" }
      }
    }
  ]
}
```

Each group commits independently when all its requests succeed.

### Multiple groups in one batch

```json
{
  "requests": [
    { "id": "1", "method": "GET", "atomicityGroup": "group1", "url": "/api/users/me" },
    { "id": "2", "method": "GET", "atomicityGroup": "group1", "url": "/api/groups" },
    { "id": "3", "method": "GET", "atomicityGroup": "group2", "url": "/api/orders" }
  ]
}
```

All three requests succeed; each group runs in its own transaction.

---

## Property References (`$$`)

Inside atomicity groups, string values starting with `$$` in the request body are resolved from the response body of a previous sub-request.

### Syntax

```
$$<request-id>.<property-path>
```

The property path uses dot notation and is resolved with lodash `at()`:

| Reference | Meaning |
|-----------|---------|
| `$$1.id` | `id` from the response body of request `1` |
| `$$create-customer.givenName` | Nested property access |
| `$$1.value.0.id` | Array index via dot path |

### Example: create related entities

```json
{
  "requests": [
    {
      "id": "1",
      "method": "POST",
      "atomicityGroup": "create-order",
      "url": "/api/people",
      "body": {
        "name": "Test Customer",
        "givenName": "Test",
        "familyName": "Customer"
      }
    },
    {
      "id": "2",
      "method": "POST",
      "atomicityGroup": "create-order",
      "url": "/api/orders",
      "body": {
        "orderedItem": { "name": "Apple MacBook Air" },
        "customer": "$$1.id"
      }
    }
  ]
}
```

Before request `2` runs, `$$1.id` is replaced with the `id` returned by request `1`.

### Cross-group references

References can point to a request in a different atomicity group, as long as that group has already completed and its result is available in the batch results. Group execution order follows the order groups are processed.

### When references are resolved

`$$` substitution happens **only** for sub-requests inside atomicity groups, immediately before each sub-request executes. Batches without atomicity groups do not resolve `$$` references.

---

## Error Handling

### Batch-level errors

These cause the outer request to fail (non-`200` status):

| Condition | Status |
|-----------|--------|
| `Content-Type` is not `application/json` | `406 Not Acceptable` |
| Fewer than `min` or more than `max` sub-requests | `406 Not Acceptable` |
| Missing `method` or `url` on a sub-request | `400 Bad Request` |
| `atomicityGroup` present on some but not all sub-requests | `400 Bad Request` |
| Sub-request fails JSON schema validation | `400 Bad Request` |
| Unresolvable `$$` reference | `400 Bad Request` |

### Sub-request errors

Returned inside the `responses` array:

| Scenario | Sub-request `status` |
|----------|---------------------|
| Handler error | Error status (e.g. `500`) with error properties in `body` |
| Route not found | `404` |
| Atomicity group sibling after a failure | `0` (not executed) |
| Atomicity group member that caused the failure | Original error status |

Error bodies include enumerable error properties plus a `name` field with the error constructor name when available.

### Inspecting results

```javascript
const { responses } = await fetch('/api/$batch', { /* ... */ }).then(r => r.json());

const failures = responses.filter(r => r.status >= 400);
const skipped = responses.filter(r => r.status === 0);
const allOk = responses.every(r => r.status >= 200 && r.status < 300);
```

---

## Configuration

```javascript
import { batch } from '@themost/express';

app.use('/api/', batch(app, {
  min: 2,
  max: 25,
  headers: [
    'authorization',
    'content-type',
    'accept',
    'accept-language',
    'accept-encoding',
    'user-agent'
  ]
}));
```

| Option | Default | Description |
|--------|---------|-------------|
| `min` | `2` | Minimum number of sub-requests per batch. |
| `max` | `25` | Maximum number of sub-requests per batch. |
| `headers` | See above | Headers copied from the outer request to each sub-request. Only these headers are forwarded, to avoid leaking sensitive proxy or internal headers. |

---

## Request Schema

Sub-requests are validated against a JSON Schema (`src/batch.schema.js`):

```typescript
interface BatchRequestMessage {
  id: string;
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  atomicityGroup?: string;
  dependsOn?: string[];
}

interface BatchPayload {
  requests: BatchRequestMessage[];
}
```

Required fields after preprocessing: `id`, `method`, `url`.

---

## Implementation Details

### How sub-requests are executed

1. The outer `POST /$batch` request is parsed as JSON.
2. Each sub-request is turned into a synthetic `IncomingMessage` (`BatchIncomingMessage`) and `ServerResponse` (`BatchServerResponse`).
3. The synthetic request inherits `req.context` from the parent request.
4. The application router handles the synthetic request/response pair as if it were a real HTTP call.
5. Responses are captured via overridden `res.json()` when `req.batchReq` is set.

### Child request properties

Handlers can access batch metadata on sub-requests:

| Property | Description |
|----------|-------------|
| `req.batchReq` | The original sub-request definition from the batch payload. |
| `req.parentReq` | The outer `$batch` request. |
| `req.context` | Same data context as the parent request. |

### Execution order

```
Without atomicity groups:
  request[0] → request[1] → … → request[n]

With atomicity groups:
  group A (transaction): request → request → …
  group B (transaction): request → request → …
  …
```

All execution is sequential — there is no parallel execution within a batch.

---

## Limitations

The following are **not** supported by the current implementation:

| Feature | Notes |
|---------|-------|
| `$id` URL references | Use full paths or `$$id.property` in bodies instead. |
| `dependsOn` | Defined in the schema but not enforced or used for ordering. |
| OData multipart/mixed format | Only `application/json` is accepted. |
| Per-sub-request custom headers | Headers are always inherited from the outer request. |
| `$$` references outside atomicity groups | Property substitution only runs inside transactional groups. |
| HTTP `424 Failed Dependency` | Skipped group members use `status: 0`, not `424`. |
| Parallel sub-request execution | All sub-requests run one after another. |

---

## Related Files

| File | Purpose |
|------|---------|
| `src/batch.js` | Middleware implementation |
| `src/batch.schema.js` | JSON Schema for sub-request validation |
| `src/batch.d.ts` | TypeScript declarations |
| `spec/batch.spec.js` | Integration tests |

---

## See Also

- [OData v4 Batch Processing](http://docs.oasis-open.org/odata/odata/v4.0/os/part1-protocol/odata-v4.0-os-part1-protocol.html#_Toc372793748) — conceptual background for batch and changeset semantics
