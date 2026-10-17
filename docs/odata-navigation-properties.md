---
title: Define and Query OData Navigation Properties
summary: Configure model associations and read related collections through serviceRouter with OData query options.
category: Routing
readingTime: 6 minutes
index: 404
---

# Define and Query OData Navigation Properties

A model navigation property describes how a related model can be reached from an entity. In the test model configuration, `Person.orders` exposes the orders associated with a person. The built-in `serviceRouter` can read that property as a collection route and passes its query parameters to `@themost/data` for filtering and ordering.

## Configure the association

Add a navigation property to `Person.json`:

```json
{
  "name": "orders",
  "title": "Orders",
  "type": "Order",
  "mapping": {
    "associationType": "association",
    "childModel": "Order",
    "childField": "customer",
    "parentModel": "Person",
    "parentField": "id"
  }
}
```

This is an association, not a junction-table relation. `Person` is the parent model; each `Order` is a child whose `customer` field refers to the parent `Person.id`. The corresponding `Order` model defines `customer` with type `Person`. The mapping names both models and the fields that connect them so the data layer and navigation handler can resolve the relation.

The navigation property's name is `orders`, so use that name in a route. The configured/tested service URL uses the lowercase entity-set name `people`; use your application's actual entity-set name rather than assuming it is always the model name or a particular pluralization.

## Read a person's orders

Mount the router after the data middleware has established the request context:

```js
app.use(dataApplication.middleware(app));
app.use('/api', serviceRouter);
```

The ordinary entity-navigation route is:

```http
GET /api/people/42/orders
```

Its route shape is `/{entitySet}/{id}/{navigationProperty}`. In the test suite, a person is selected from `/api/people` and the resulting ID is used in `/api/people/{id}/orders`; the response is a collection of `Order` objects. When a related entity set is configured, the middleware maps the collection through that entity set before formatting it.

## Filter and order the related collection

For a collection navigation property, the middleware passes request query parameters to the related model's `filter()` method, then restricts the association to the current person's key. For example:

```http
GET /api/people/42/orders?$filter=discount%20gt%200&$orderby=orderDate%20desc
```

Here `$filter` and `$orderby` are query options consumed by `@themost/data`; the router does not implement their expression parsing itself. The data layer and model determine which expressions and fields are valid. The navigation handler supplies a default `$top` of 25 when no `$top` is provided. It also recognizes `$count` and the legacy `$inlinecount` flag to select the list-with-count path. Do not infer from these examples that every OData system query option or expression is supported on every model.

## Traversing from a static function

`serviceRouter` also registers a nested route shape, `/{entitySet}/{entitySetFunction}/{navigationProperty}`. A URL such as:

```http
GET /api/people/me/orders
```

is only applicable if `Me` is exposed as a static entity-set function on `Person`, returns a single `Person`, and the nested function-navigation path can resolve that result. In the current implementation, the function-navigation branch handles a single-result `DataQueryable`: it resolves the function's return model/entity set, gets one item, then invokes the ordinary navigation-property handler. For example, the function would need to return the queryable rather than calling `getItem()` itself:

```js
import { EdmMapping } from '@themost/data';

@EdmMapping.func('Me', 'Person')
static getMe(context) {
  return context.model('Person')
    .where('user/name')
    .equal(context.user.name);
}
```

The router can then obtain the function result and navigate its `orders` property. By contrast, the sample `Person.getMe()` implementation that calls `.getItem()` returns a promise for an item, not the `DataQueryable` expected by this nested navigation branch; the existence of that function does not establish that `/api/people/Me/orders` works. The existing tests verify an ordinary `/api/people/{id}/orders` navigation request and a separate `/api/users/me` function request, but do not test their combination.

Use the entity-set and function names actually exposed by the application's model builder. The test configuration uses the entity-set URL `people` and the `Person` function is annotated as `Me`. Confirm the names used by your application and avoid assuming that a display name such as `/People/Me/Orders` is the route URL.

## Summary

Define `Person.orders` as an association to `Order` through `Order.customer`, then read it with `GET /api/people/{id}/orders`. The router forwards navigation query parameters such as `$filter` and `$orderby` to `@themost/data`, so supported expressions depend on that data layer. Function-based navigation is a separate, conditional route: in this implementation it requires a compatible single-result `DataQueryable`, and should not be inferred from a static function that already resolves to a `Person` object.
