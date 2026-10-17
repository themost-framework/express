---
title: Format Data and Stream Responses
summary: Return JSON by default, optionally negotiate XML, and stream binary or readable data safely.
category: Responses
readingTime: 5 minutes
index: 800
---

# Format Data and Stream Responses

Built-in data endpoints format their results as JSON by default. The package also exports a `ResponseFormatter` application service that builds formatters for Express's `res.format()` content negotiation.

## Enable JSON and XML negotiation

Register the formatter service after creating the data application, then add an XML formatter if your application wants to support it:

```js
import {
  ExpressDataApplication,
  ResponseFormatter,
  XmlResponseFormatter
} from '@themost/express';

const dataApplication = new ExpressDataApplication('./config');
dataApplication.useService(ResponseFormatter);

const formatter = dataApplication.getService(ResponseFormatter);
formatter.formatters.set('application/xml', XmlResponseFormatter);
```

The service includes `default` and `application/json` mappings to `JsonResponseFormatter`; XML is not registered by default. A custom route can use it like this:

```js
app.get('/message', (req, res) => {
  const formatter = req.context.getApplication()
    .getService(ResponseFormatter);
  return res.format(formatter.format({ message: 'hello' }).for(req, res));
});
```

JSON formatter results use `res.json`. XML uses the XML serializer and returns `application/xml`. Both built-in formatters return status 204 when the value is `null` or `undefined`. Express's `res.format()` determines behavior from the request's `Accept` header.

## Stream a file or buffer

`StreamFormatter` is exported for a `Buffer` or readable stream. It sets a content type (the stream object's `contentType` or `application/octet-stream`), supports selected content metadata properties, and pipes the data to the response:

```js
import { StreamFormatter } from '@themost/express';

app.get('/download', (req, res, next) => {
  const stream = createReadableForDownload();
  stream.contentType = 'application/pdf';
  return new StreamFormatter(stream).execute(req, res, next);
});
```

`createReadableForDownload()` is application code: supply a Node readable stream and arrange for its errors to reach `next`. The formatter forwards stream errors to `next`, ends the response when the source ends, and returns 204 for null data. For HTTP downloads, set content disposition or other required headers deliberately.

## Summary and recommendations

JSON is the built-in default; enable XML explicitly by registering `XmlResponseFormatter`. Use content negotiation for representations and `StreamFormatter` for buffers/readable streams, with proper error propagation and download headers.
