---
title: Expose OData Instance Functions
summary: Declare functions on a model data object and call them for one entity through the built-in service router.
category: Routing
readingTime: 5 minutes
index: 410
---

# Expose OData Instance Functions

An OData instance function is bound to one entity. In `@themost/express`, declare it on the model's `DataObject` class with `EdmMapping.func()`, then call it through `serviceRouter` using the entity-set name, entity identifier, and exposed function name.

## Declare a function on the model

The `User` example is mapped to the `User` entity type. It declares functions with exposed names that may differ from their JavaScript method names:

```js
const { DataObject, EdmMapping, EdmType } = require('@themost/data');
const fs = require('fs');
const path = require('path');

@EdmMapping.entityType('User')
class User extends DataObject {
  @EdmMapping.func('avatar', EdmType.EdmStream)
  getAvatar() {
    const stream = fs.createReadStream(
      path.resolve(__dirname, 'avatars/avatar1.png')
    );
    stream.contentType = 'image/png';
    return stream;
  }

  @EdmMapping.func('emptyPerson', 'Person')
  async getEmptyPerson() {
    return this.context.model('Person')
      .where('id').equal(0)
      .getItem();
  }
}
```

`@EdmMapping.entityType('User')` associates the class with the entity type. `@EdmMapping.func('avatar', EdmType.EdmStream)` publishes the JavaScript instance method as the `avatar` function and declares its return type as a stream. Since `getAvatar()` is an instance method, the router calls it on the selected `User` object. The `emptyPerson` example declares a `Person` return type and returns an asynchronous model query result.

The example also declares instance functions named `emptyContent` and `queryEmptyPerson`. A function returning a `DataQueryable` is executed by the router: for a single-entity return type, it retrieves one item. A `null` result is sent as **204 No Content**. A normal non-null result is returned as JSON by default (a configured response formatter may change its representation). For an `Edm.Stream` return type, the stream response path is used instead.

## Call it through `serviceRouter`

Mount the router after the data middleware so that the request has a data context:

```js
import { serviceRouter } from '@themost/express';

app.use(dataApplication.middleware(app));
app.use('/api', serviceRouter);
```

For an instance function, the route is:

```http
GET /api/{entitySet}/{id}/{functionName}
```

With the `User` entity set and the exposed function name `avatar`, a request looks like:

```http
GET /api/users/42/avatar
Accept: image/png
```

Use the entity's actual identifier in place of `42`. The example also exercises `GET /api/users/me/avatar`. This router's function route is path-based: use `/{id}/{functionName}` as shown rather than adding OData-style parentheses to the function name. The router looks up the entity first; if it does not exist, it responds with 404. The function name must be declared on the entity type and mapped to an instance method.

For stream results, `serviceRouter` delegates to its stream formatter. In the example, `contentType = 'image/png'` lets the response use the image media type; `/api/users/me/avatar` returns an `image/png` response. For non-stream values, the default response is JSON, except that a `null` or `undefined` result is represented by 204 without a response body.

## Function parameters and return values

Declare function parameters with `@EdmMapping.param(name, type, nullable)` alongside the function mapping. Instance-function arguments are read from the request query string by their declared names and passed to the method in metadata order; values are parsed before invocation. For example, a function parameter named `format` is supplied as `?format=png`. The instance-function handler does not perform a separate required-parameter check before invoking the method, so validate inputs in the method if it must reject a missing value.

The return type in `@EdmMapping.func()` determines how the router handles the result. It recognizes `Edm.Stream` for stream output, executes a returned `DataQueryable` according to the declared result type, and otherwise formats the method's returned value. For a single entity result, `$select` and `$expand` can be applied to a returned query; collection results use collection query options and are returned as a collection. A method may return a value directly or a promise—the router resolves the result before formatting it.

Keep instance and entity-set functions distinct. In `UserModel`, `getMe()` and `getActiveUser(context, name)` are `static`, so they are entity-set functions invoked as `/api/users/me` and `/api/users/active?name=...`; they are not bound to a particular user identifier. The instance method `getAvatar()` is bound to one user and uses `/api/users/{id}/avatar`.

## Summary

Declare an instance function on the model's `DataObject` class with `EdmMapping.func()`, then call it with `GET /{entitySet}/{id}/{functionName}` through `serviceRouter`. Match the annotation's return type to the method's result, provide declared arguments as query parameters, and validate any required inputs in the method.
