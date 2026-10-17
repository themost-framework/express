---
title: Use Static OData Functions
summary: Expose a static model function through serviceRouter and use request context to return the current Person.
category: Routing
readingTime: 5 minutes
index: 430
---

# Use Static OData Functions

A static function is implemented as a static method on a model's `DataObject` class. In `@themost/express`, this is routed as an entity-set function: the URL includes an entity-set name, and the router supplies the request context to the method. This is useful for operations such as finding the current user's `Person` record without a specific person identifier in the URL.

## Define `Person.getMe()`

The `Person` model declares its function as follows:

```js
import { Party } from './Party';
import { EdmMapping } from '@themost/data';

class Person extends Party {
  @EdmMapping.func('Me', 'Person')
  static getMe(context) {
    return context.model('Person')
      .where('user/name')
      .equal(context.user.name)
      .getItem();
  }
}
```

`EdmMapping.func('Me', 'Person')` publishes the method under the exposed function name `Me` and declares a `Person` return type. Because `getMe()` is static, it is not invoked on a particular `Person` instance. The router passes the request's data context as the first method argument. The function then uses the authenticated user on that context to query the matching `Person`.

## Call the function

Mount `serviceRouter` after the data middleware so each request has a context:

```js
app.use(dataApplication.middleware(app));
app.use('/api', serviceRouter);
```

With the `Person` entity set exposed as `people`, call the function with a GET request:

```http
GET /api/people/me
```

The router resolves `people` to its entity set, finds the `Me` function declared on that entity type's collection, and invokes `Person.getMe(context)`. Use the exact exposed function name from the annotation; this example names it `Me`. If your model builder configures a different entity-set name for `Person`, use that name in the URL instead.

## Entity-set function, not an unbound function

Although `getMe()` is static and does not take an entity identifier in the URL, this route is not an unbound OData function in the protocol sense. `serviceRouter` dispatches it under an entity set using `GET /{entitySet}/{functionName}`. A conventional OData unbound function is associated with the service namespace rather than an entity set; do not assume that unbound-function URL syntax such as `/Me()` is supported by this router.

## Context and response behavior

The request context is injected by the router, so the method signature starts with `context`; it is not declared as an OData parameter. Additional declared function parameters, if present, are read from the query string and passed after the context. `getMe()` declares no such parameters.

The method returns the promise produced by `getItem()`, which resolves to a `Person` or no item. The router awaits that result and formats a found `Person` as JSON by default. If the query returns no item, the response is **204 No Content**. Since this function depends on `context.user.name`, protect the service route with authentication and ensure the authentication middleware runs before `serviceRouter`.

## Summary

Declare a static model function with `EdmMapping.func()` and call it through the entity-set route supported by `serviceRouter`. `Person.getMe()` demonstrates using the injected request context to return the authenticated user's person record; despite being static, the function is entity-set-routed rather than protocol-unbound.
