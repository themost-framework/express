---
title: @themost/express
summary: The @themost/express package connects an Express application to @themost data services. It provides a request-scoped data context and an optional router for data models.
category: Folder
---

## Batch requests

- [Send batch requests with $batch](batch-getting-started.md) - mount the middleware, send several calls in one request and read the results.
- [Configure the batch middleware](batch-configuration.md) - mount path, `min`, `max` and `headers` options, and inherited headers.
- [Atomicity groups and property references](batch-atomicity-groups-and-references.md) - run requests in transactions and pass values between requests.
- [Batch limits, security and errors](batch-security-and-errors.md) - configure limits and headers and handle errors.
- [Batch reference](batch-reference.md) - supported features, schemas, implementation details and limitations.