---
title: Atomicity Groups and Property References
summary: Run groups of batch requests in database transactions and pass values from one request to the next.
category: Batch
readingTime: 7 minutes
index: 1110
---

# Atomicity Groups and Property References

A batch without atomicity groups runs each request on its own: a failure affects only that request. When several writes must succeed or fail together, give them an **atomicity group**. When a later write needs a value created by an earlier one, use a **property reference**. This article explains both features of the `batch()` middleware. For setup and the request format, see [Send batch requests with $batch](batch-getting-started.md).

## How atomicity groups work

Requests that share the same `atomicityGroup` value are executed sequentially inside one database transaction, started with `req.context.db.executeInTransactionAsync()`. All sub-requests share the data context of the outer request, so they take part in that transaction.

```json
{
  "requests": [
    {
      "id": "1",
      "method": "POST",
      "atomicityGroup": "create-user",
      "url": "/api/users",
      "body": { "name": "Test User", "alternateName": "test100@example.com" }
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

Request `2` fails with a `404`, so the `create-user` transaction is rolled back and the user created by request `1` is discarded. Group `get-user` runs afterwards in its own transaction and finds no user, which proves the rollback.

### Commit on success and multiple groups

Each group commits independently when all of its requests succeed. In this example two groups succeed, each in its own transaction:

```json
{
  "requests": [
    {
      "id": "1",
      "method": "POST",
      "atomicityGroup": "create-customer",
      "url": "/api/people",
      "body": { "name": "Test Customer", "givenName": "Test", "familyName": "Customer" }
    },
    {
      "id": "2",
      "method": "POST",
      "atomicityGroup": "create-order",
      "url": "/api/orders",
      "body": {
        "orderedItem": { "name": "Apple MacBook Air (13.3-inch, 2013 Version)" },
        "customer": { "givenName": "Test", "familyName": "Customer" }
      }
    }
  ]
}
```

A group may contain several requests, for example read-only requests such as `GET /api/users/me` and `GET /api/groups` in `group1`, and `GET /api/orders` in `group2`. All of them return their normal responses when nothing fails.

### Rules

1. If any request has an `atomicityGroup`, **every** request must have one. Otherwise the whole batch is rejected with `400 Bad Request`.
2. Requests of one group run in the order they appear, inside one transaction.
3. Groups run one after another, each in its own transaction. A group that fails does not affect the others.
4. A group commits when all of its requests succeed.

The group name is a string. Groups run in the order their names are first seen, with one JavaScript detail: group names that look like integers (for example `"1"` or `"2"`) are ordered numerically before other names. Use descriptive names such as `create-customer` if the order of the groups matters.

### What counts as a failure

A request fails, and rolls back its group, when the route handler passes an error to `next(error)`, throws, or when no route handles the request (a `404`). A handler that sends an error status itself, for example `res.status(409).json({ ... })`, completes normally: the response is reported with its status, and the transaction is **not** rolled back. Forward errors with `next(new HttpBadRequestError())` or a similar framework error from `@themost/common` when you want a rollback.

### Failed group results

When a group fails, every entry of that group in `responses` is rewritten:

| Entry | `status` | `body` and `headers` | `atomicityGroup` |
|-------|----------|----------------------|------------------|
| The request that failed | The error status, for example `404` or `500` | Error details in `body` | Present |
| Other requests of the group | `0` | Removed | Present |

A `status` of `0` means the request was not executed or its changes were rolled back. Requests of other groups keep their own results. The outer response is still `200 OK`.

```js
const rolledBack = responses.filter((r) => r.status === 0);
const cause = responses.find((r) => r.atomicityGroup && r.status >= 400);
```

## Property references

A string value that starts with `$$` anywhere in a request `body` is replaced with a value from the response body of an earlier request:

```
$$<request-id>.<property-path>
```

The property path uses dot notation and is resolved with lodash `at()`.

| Reference | Value |
|-----------|-------|
| `$$1.id` | The `id` property of the response body of request `1` |
| `$$create-customer.address.city` | A nested property of the request whose `id` is `create-customer` |
| `$$1.value.0.id` | The `id` of the first item of the `value` array |

The substitution happens just before the referencing request is executed, so the value is the one actually returned by the earlier request. It works with or without atomicity groups.

### Create related records in one transaction

```json
{
  "requests": [
    {
      "id": "1",
      "method": "POST",
      "atomicityGroup": "create-order",
      "url": "/api/people",
      "body": { "name": "Test Customer", "givenName": "Test", "familyName": "Customer" }
    },
    {
      "id": "2",
      "method": "POST",
      "atomicityGroup": "create-order",
      "url": "/api/orders",
      "body": {
        "orderedItem": { "name": "Apple MacBook Air (13.3-inch, 2013 Version)" },
        "customer": "$$1.id"
      }
    }
  ]
}
```

Request `2` receives the `id` of the person created by request `1`. If the order cannot be created, the person is rolled back too.

A reference may also point to a request in a different group, provided that group has already run. Order your groups accordingly.

### Invalid references

References are checked when the referencing request is about to run:

| Situation | Status of the referencing request |
|-----------|-----------------------------------|
| The `id` does not exist in the batch | `400 Bad Request` |
| The referenced request has not been executed yet (it comes later in the batch) | `400 Bad Request` |
| The referenced request failed (non-`2xx` status) | `424 Failed Dependency` |

Without atomicity groups, the error fails only the referencing request and the batch continues. Inside an atomicity group, the error rolls back the whole group: the referencing request reports the error and its siblings report `status: 0`.

A reference to a property that does not exist in the earlier response resolves to `undefined`, which is omitted from the JSON body of the sub-request. Verify that the earlier endpoint returns the property you reference.

## Summary and recommendations

- Add `atomicityGroup` to all requests, or to none, and group the writes that must succeed or fail together.
- Rely on `status: 0` to find requests that were skipped or rolled back, and on the entry that carries the error status to find the cause.
- Forward failures with `next(error)` in your handlers when you want the transaction to roll back.
- Use `$$<id>.<path>` to feed values from earlier responses into later bodies, and place the referenced request first.
- Use short, explicit request ids when you use references.

For the schemas and limitations see [Batch reference](batch-reference.md). For the limits and validation rules that can reject a batch before it runs, read [Batch limits, security and errors](batch-security-and-errors.md).
