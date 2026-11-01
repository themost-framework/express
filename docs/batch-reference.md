---
title: Batch Reference
summary: Reference for the $batch feature, covering supported features, request and response schemas, implementation details and limitations.
category: Batch
readingTime: 6 minutes
index: 1130
---

# Batch Reference

This article collects the reference details of the `$batch` feature of `@themost/express`: what is and is not supported, the shape of the request and response messages, how sub-requests are executed and which limitations apply. For task-oriented guidance, start with [Send batch requests with $batch](batch-getting-started.md).

The implementation is **JSON-based** and inspired by OData batch concepts such as atomicity groups (changesets). It is not the standard OData `multipart/mixed` batch format.

## Feature support

| Feature | Supported |
|---------|-----------|
| Multiple operations in one HTTP call | Yes |
| Sequential execution | Yes |
| Per-request error isolation (without atomicity groups) | Yes |
| Atomicity groups with database transactions | Yes |
| Body property references (`$$id.property`) | Yes |
| URL references (`$id`) | No |
| `dependsOn` field | No (defined in the schema, not enforced) |
| Parallel execution | No |
| OData multipart batch format | No |

Typical benefits are fewer round trips, all-or-nothing writes through [atomicity groups](batch-atomicity-groups-and-references.md) and dependent writes that reuse values returned by earlier requests.

## Endpoint summary

| Requirement | Value |
|-------------|-------|
| Route | `POST <mount path>/$batch` (see [Configure the batch middleware](batch-configuration.md)) |
| Content type | `application/json`; a charset parameter is allowed, other types return `415` |
| Number of requests | `2` to `25` by default, configurable |
| Response caching | The batch response always has `Cache-Control: no-store` |

## Request schema

The payload is an object with a `requests` array:

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

Each request is validated against a JSON Schema (`src/batch.schema.js`) after preprocessing (assigning a missing `id`, resolving the URL and merging headers). Validation rules:

- `id`, `method` and `url` are required.
- `id`, `method`, `url` and `atomicityGroup` are strings; `headers` is an object with string values; `dependsOn` is an array of unique strings; `body` can be of any type.
- Additional properties are not allowed.
- `url` must be an absolute URI (`http:`, `https:` or protocol-relative) at validation time. This is satisfied automatically because relative URLs are resolved first. See [Batch limits, security and errors](batch-security-and-errors.md) for the URLs that are rejected.
- `method` is only checked to be a string; the middleware does not restrict it to a list of HTTP methods.

The `BatchRequestMessage` type is exported by `src/batch.d.ts`. In that declaration `headers` is required and the `headers` option of `batch()` is typed as required, although the implementation treats both as optional.

## Response schema

```typescript
interface BatchResponseMessage {
  id: string;
  status: number;
  headers?: Record<string, string | string[] | number>;
  body?: unknown;
  atomicityGroup?: string;
}

interface BatchResult {
  responses: BatchResponseMessage[];
}
```

| Field | Description |
|-------|-------------|
| `id` | The `id` of the matching request. |
| `status` | The HTTP status of the sub-request. `0` means it was not executed or was rolled back. |
| `headers` | Response headers of the sub-request, when available. Error entries have no headers. |
| `body` | The response body, or error details for failed requests. |
| `atomicityGroup` | Present on the entries of a failed atomicity group. |

A batch that is accepted always returns `200`. Failures of individual requests change only their own entry. Details about bodies and error entries are in [Send batch requests with $batch](batch-getting-started.md) and [Batch limits, security and errors](batch-security-and-errors.md).

## Implementation details

### How sub-requests are executed

1. The outer `POST /$batch` request is parsed as JSON by your body parser.
2. Each sub-request is turned into a synthetic `IncomingMessage` and `ServerResponse` pair. The body is already parsed, so the child request is flagged to skip body parsing, and its `content-length` is recalculated.
3. The synthetic request exposes the `req.context` of the outer request.
4. The application passed to `batch()` handles the pair as if it were a real HTTP call, so routes, middleware and error handlers run normally.
5. The response is captured when the handler calls `res.json()`, `res.send()` or `res.end()`, or writes to the response, and then added to `responses`. Errors passed to `next(error)` and unmatched routes are converted to error entries.

### Child request properties

| Property | Description |
|----------|-------------|
| `req.batchReq` | The sub-request definition from the payload. It is also how handlers can tell that they run inside a batch. |
| `req.parentReq` | The outer `$batch` request. |
| `req.context` | The data context of the outer request. |

### Execution order

```
Without atomicity groups:
  request[0] -> request[1] -> ... -> request[n]

With atomicity groups:
  group A (transaction): request -> request -> ...
  group B (transaction): request -> request -> ...
```

All execution is sequential. There is no parallel execution within a batch.

## Limitations

| Feature | Notes |
|---------|-------|
| `$id` URL references | Use full paths, or `$$id.property` references in request bodies. |
| `dependsOn` | Defined in the schema but not enforced or used for ordering. |
| OData multipart/mixed format | Only `application/json` is accepted. |
| Nested batches | A request that targets `$batch` receives a `400` entry. |
| Parallel execution | All requests run one after another. |

## Related files

| File | Purpose |
|------|---------|
| `src/batch.js` | Middleware implementation |
| `src/batch.schema.js` | JSON Schema for request validation |
| `src/batch.d.ts` | TypeScript declarations |
| `spec/batch.spec.js` | Integration tests, a good source of working payloads |

## Summary and recommendations

Use this reference to check what the `$batch` feature supports before you design a payload: JSON only, sequential execution, transactions through atomicity groups, `$$` body references and no `$id` URL references. Send valid string ids, methods and URLs, and read the other batch articles for setup ([Configure the batch middleware](batch-configuration.md)), transactions ([Atomicity groups and property references](batch-atomicity-groups-and-references.md)) and safeguards ([Batch limits, security and errors](batch-security-and-errors.md)).

For the conceptual background of batch and changeset semantics, see the [OData v4 batch processing](http://docs.oasis-open.org/odata/odata/v4.0/os/part1-protocol/odata-v4.0-os-part1-protocol.html#_Toc372793748) specification.
