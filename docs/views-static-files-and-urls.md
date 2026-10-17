---
title: Integrate Views, Static Files, and Application URLs
summary: Connect Express template engines to the data context and resolve application-relative URLs.
category: Web Applications
readingTime: 4 minutes
index: 900
---

# Integrate Views, Static Files, and Application URLs

Views and static files remain Express responsibilities, but `ExpressDataApplication` can discover Express view engines and provide URL resolution for applications mounted below a path.

## Connect a view engine

Configure an engine on Express before calling the data application's middleware and pass the Express app to `middleware(app)`:

```js
import express from 'express';
import { ExpressDataApplication } from '@themost/express';

const app = express();
app.set('view engine', 'ejs');
app.set('views', './views');

const dataApplication = new ExpressDataApplication('./config');
app.use(dataApplication.middleware(app));
```

The middleware reads the application's registered engines and exposes engine metadata through configuration. An `ExpressDataContext` has `engine(extension)`, which looks up the configured extension and throws if none is registered. It does not install a template package or configure Express's view directory.

## Resolve app-relative URLs

`dataApplication.resolveUrl()` converts strings beginning with `~/` to a path rooted at `settings/app/base`. The base defaults to `/`, and a missing trailing slash is added:

```js
const loginUrl = dataApplication.resolveUrl('~/login');
// With settings/app/base = "/portal": "/portal/login"

const external = dataApplication.resolveUrl('https://example.test/login');
// Unchanged
```

Use the `~/` convention for URLs that should follow the configured application mount path. Other values are returned unchanged.

## Serve static assets

For static content, use standard Express middleware; it is not a special `@themost/express` API:

```js
import path from 'node:path';

app.use('/assets', express.static(path.resolve(process.cwd(), 'public')));
```

Place static serving and application routes according to the path precedence you want, and restrict the static root to files intended for public access.

## Summary and recommendations

Configure Express view engines before passing the app to `dataApplication.middleware(app)`. Use `resolveUrl('~/...')` for paths that must respect the configured base, and rely on Express's static middleware for public assets.
