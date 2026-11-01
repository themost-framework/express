---
title: Build HTTP Controllers
summary: Group request handlers into controller classes, register routes with RouterService and serve them with controllerRouter.
category: Routing
readingTime: 7 minutes
index: 550
---

# Build HTTP Controllers

An HTTP controller is a class whose decorated methods handle requests. Controllers are provided by the `@themost/express/controllers` module. Controllers and their routes are registered in `RouterService`, an application service, and `controllerRouter()` dispatches matching requests to them. Every controller gets the request-scoped data context of the data middleware, so actions can query models just like a [custom route](custom-routes-and-data-access.md).

## Define a controller

```js
import {
  HttpController, httpController, httpGet, httpAction, httpParam, httpRoute
} from '@themost/express/controllers';

@httpController('products')
class ProductController extends HttpController {

  @httpGet()
  async index() {
    const items = await this.context.model('Product').asQueryable().take(25).getItems();
    return this.json(items);
  }

  @httpGet()
  @httpAction('top')
  @httpParam({ name: 'count', type: 'Integer', required: true, maxValue: 100 })
  async getTopProducts(count) {
    return this.context.model('Product').asQueryable().orderByDescending('price').take(count).getItems();
  }

  @httpGet()
  @httpRoute('/products/{id:int}')
  async item(id) {
    return this.context.model('Product').where('id').equal(id).getItem();
  }
}
```

Decorators use the legacy proposal syntax, so a JavaScript project needs `@babel/plugin-proposal-decorators` with `{ "legacy": true }`; a TypeScript project needs `experimentalDecorators`.

## Register controllers and routes

```js
import express from 'express';
import { ExpressDataApplication } from '@themost/express';
import { RouterService, controllerRouter } from '@themost/express/controllers';

const app = express();
const dataApplication = new ExpressDataApplication(configPath);
dataApplication.useService(RouterService);
dataApplication.getService(RouterService)
  .useController(ProductController)          // registers 'products' and its @httpRoute() routes
  .add({ path: '/:controller/:action' });    // generic route, resolved by controller name

app.use(express.json());
app.use(dataApplication.middleware(app));
app.use('/api', controllerRouter(dataApplication));
```

`controllerRouter()` registers `RouterService` itself when the application does not have it. Routes are tried in order; a request that matches no route, controller or action continues to the next Express handler.

A route configuration has a `path` and may set `controller` (a constructor or a registered controller name) and `action`. Path parameters are written as `:name` or `{name}`, and may be constrained with `{name:type}` or `{name:<regular expression>}`. Typed parameters are converted before they reach the action:

| Type | Example | Value |
|------|---------|-------|
| `int` | `/products/{id:int}` | `parseInt()` |
| `boolean` | `{active:boolean}` | `true` or `false` |
| `decimal`, `float` | `/round\\({value:decimal}\\)` | `parseFloat()` |
| `guid` | `{id:guid}` | string |
| `string` | `/send\\({message:string}\\)` with `'Hello'` | the unquoted string |
| `date` | `{value:date}` with `'2020-04-23'` or `datetime'...'` | `Date` |

## Action methods

An action must be decorated with an HTTP method decorator: `httpGet()`, `httpPost()`, `httpPut()`, `httpPatch()`, `httpDelete()`, `httpHead()`, `httpOptions()` or `httpAny()`. Undecorated methods are never exposed. The action name is the method name unless `httpAction(name)` or the `name` option of a method decorator sets one.

Action arguments are matched by name, first against route parameters, then the query string, then the parsed request body. `httpParamAlias(name, alias)` reads an argument from a differently named request parameter.

An action may return (or resolve to):

- an `HttpResult`, e.g. `this.json(data)`, `this.xml(data)`, `this.content(text)`, `this.redirect(url)`;
- `this.next()` (an `HttpNextResult`), which passes the request to the next Express handler;
- a string (sent as `text/html`), a `Buffer` (sent as binary), `null` (204) or any other value (sent as JSON);
- `undefined` after writing to `this.context.response` directly.

During an action `this.context` is the request data context, and `this.context.request` / `this.context.response` are the Express request and response. Errors thrown or rejected by an action are passed to the Express error handlers.

## Validation, authorization and consumers

- `httpParam({ name, type, required, pattern, minLength, maxLength, minValue, maxValue, message })` validates an argument with the `@themost/data` validators and rejects invalid requests with `400 Bad Request`. `type` is a data type name such as `Text` (default), `Integer` or `Email`. The method decorators accept the same rules in their `params` option.
- `httpAuthorize()` rejects requests of anonymous users with `401 Unauthorized`.
- `httpActionConsumer(name, consumer)` runs a custom function (or `HttpConsumer`) before the action. Consumers are called with the data context as their first argument and the resolved action arguments as their second, e.g. `(context, params) => Promise.resolve()`, and must return a promise; a rejection stops the request.
