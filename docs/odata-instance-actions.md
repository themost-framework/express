---
title: Use OData Instance Actions
summary: Define POST actions bound to one entity, send their body parameters, and handle JSON or stream results with @themost/express.
category: Routing
readingTime: 6 minutes
index: 420
---

# Use OData Instance Actions

An OData instance action performs an operation on one entity and is invoked with `POST`. In `@themost/express`, declare it on the model's `DataObject` class with `EdmMapping.action()`. The service router resolves the entity from the URL, then invokes the mapped instance method.

## Declare and bind an action

The `User` model demonstrates actions that return a stream, accept an uploaded file, and return no content:

```js
const fs = require('fs');
const path = require('path');
const { DataObject, EdmMapping, EdmType } = require('@themost/data');

function readStream(stream) {
  return new Promise((resolve, reject) => {
    const buffers = [];
    stream.on('data', buffer => buffers.push(buffer));
    stream.on('end', () => resolve(Buffer.concat(buffers)));
    stream.on('error', reject);
  });
}

@EdmMapping.entityType('User')
class User extends DataObject {
  @EdmMapping.action('anotherAvatar', EdmType.EdmStream)
  getAnotherAvatar() {
    const stream = fs.createReadStream(
      path.resolve(__dirname, 'avatars/avatar1.png')
    );
    stream.contentLocation = '/another/avatar/location';
    return stream;
  }

  @EdmMapping.param('attributes', 'Object', true, true)
  @EdmMapping.param('file', EdmType.EdmStream, false)
  @EdmMapping.action('uploadAvatar', 'Object')
  async uploadAvatar(file, attributes) {
    await readStream(file);
    return Object.assign({}, attributes, {
      dateCreated: new Date()
    });
  }

  @EdmMapping.param('message', EdmType.EdmString, false)
  @EdmMapping.action('emptyContent', 'Object')
  postEmptyContent(message) {
    return null;
  }
}
```

`EdmMapping.action(name, returnType)` publishes the method under the action name and declares its result type. For an instance method, the router calls the method on the selected `User`; it does not add a context argument to the method. The method can use the entity instance and its context as needed.

The instance-action route is:

```http
POST /api/{entitySet}/{id}/{actionName}
```

For example, the tests call `POST /api/users/me/emptyContent` and `POST /api/users/me/uploadAvatar`. The router resolves the entity represented by `{id}` before invoking the action and returns 404 if that entity cannot be found; the test setup uses `me` as its key segment. Mount `serviceRouter` after the data middleware so the request has a data context.

## Send action parameters in the request body

Action parameters are declared with `EdmMapping.param(name, type, nullable, fromBody)`. The router excludes the implicit binding parameter, then passes declared parameters to the method in metadata order:

- A normal parameter is read from `req.body` by its declared name.
- A parameter marked `fromBody` receives the entire request body, rather than `req.body[name]`. This is useful for an object-shaped payload. When it is the action's only parameter, the whole body is passed directly.
- A parameter of type `Edm.Stream` is handled as an uploaded file. Send the action request as `multipart/form-data`; the multipart field name must match the parameter name.

For `uploadAvatar`, the method signature is `(file, attributes)`. The `file` stream parameter is non-nullable and the `attributes` object is marked `fromBody`. A request can be sent with a multipart client like this:

```js
const response = await request(app)
  .post('/api/users/me/uploadAvatar')
  .field('alternateName', 'testing')
  .field('published', true)
  .attach('file', path.resolve(__dirname, 'avatars/avatar1.png'));
```

The service router uses its configured Multer settings (`settings/multer`) to process stream parameters. If a non-nullable stream parameter is missing, the request fails with 400; file-size and other Multer limits apply as configured. Scalar body parameters are read from the parsed body, so install the appropriate body parser before the router when accepting JSON requests. Unlike the instance-function handler, the action handler does not perform a general required-parameter check for every non-stream parameter: validate required scalar or object values in the action method.

## Return JSON or a stream

For a non-stream action, a returned object is formatted as JSON by default (an application response formatter may customize formatting). Returning `null` or `undefined` produces 204 No Content. The `emptyContent` action above demonstrates this, and the tests verify 204 for `POST /api/users/me/emptyContent`.

An action declared with return type `Edm.Stream` uses the stream response formatter. It sends `application/octet-stream` by default; set `contentType` on the returned stream to choose another media type. Stream properties such as `contentLocation`, `contentLanguage`, `contentDisposition`, `contentEncoding`, and `contentMD5` are written as response headers. The `anotherAvatar` test verifies the default octet-stream content type and the `Content-Location` header.

If an action returns a `DataQueryable`, the router resolves one item for a single-entity result or all items for a collection result. A collection is not paged by the action handler. For a nullable stream result, the stream formatter sends 204.

## Instance actions and entity-set actions

The URL identifies whether an action is bound to one entity. An instance action uses `POST /api/users/{id}/uploadAvatar` and invokes an instance method on that `User`. A static action applies to the entity set and uses `POST /api/users/uploadTestAvatar`, with no entity identifier. In `UserModel`, `uploadTestAvatar` is declared `static`; the router passes `req.context` as its first method argument, followed by its declared action parameters. Use a static action when the operation is not tied to a particular entity.

## Summary

Declare an instance action with `EdmMapping.action()` and call it with `POST` at the entity's route. Declare body and stream parameters explicitly, validate required non-file values in your method, and choose a return type that matches whether the action responds with JSON data or a stream.
