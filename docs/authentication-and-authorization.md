---
title: Protect Data Routes with Authentication
summary: Place Passport or other authentication middleware before routes and use the authenticated request identity in data operations.
category: Security
readingTime: 5 minutes
index: 600
---

# Protect Data Routes with Authentication

`@themost/express` does not configure an authentication strategy for you. It works with Express authentication middleware: authenticate the request first, then mount the data router or protected routes.

With Passport, configure a strategy in your application and mount it without sessions for a token-based API:

```js
import passport from 'passport';
import { serviceRouter } from '@themost/express';

app.use(dataApplication.middleware(app));
app.use(
  '/api',
  passport.authenticate('bearer', { session: false }),
  serviceRouter
);
```

Register the strategy and any required Passport initialization according to your authentication setup. The repository's integration tests mount a bearer strategy in this order. `@themost/express` itself neither issues tokens nor validates credentials.

## Use the authenticated identity

The context user is connected to Express `req.user`. After your authentication middleware populates `req.user`, route and data-layer code can read `req.context.user`:

```js
app.get('/api/me', passport.authenticate('bearer', { session: false }),
  (req, res) => {
    return res.json({
      name: req.context.user?.name
    });
  }
);
```

The user object can include `name`, `authenticationType`, `authenticationToken`, `authenticationScope`, and `authenticationProviderKey`. Set these from trusted authentication results, not directly from client-supplied fields. Assigning `context.user` updates `req.user` and refreshes context state.

Authentication establishes identity; it does not by itself define authorization policy. Add checks for roles, scopes, ownership, and allowed operations in route middleware or your data-layer policies. For example, place a scope check between authentication and `serviceRouter` if the entire data API requires that scope.

## Unattended operations

`ExpressDataContext.unattended(callable, callback)` supports an unattended operation and reads its optional service account from `settings/auth/unattendedExecutionAccount`. When present, that configured account temporarily becomes the context user; an existing interactive user is preserved as `interactiveUser` and restored after the callback. Use only for trusted server-side work and ensure the callback completes.

## Summary and recommendations

Authentication is application-owned: configure Passport or another middleware, authenticate before protected handlers, and apply explicit authorization checks. Treat the context user as trusted only after authentication, and reserve unattended execution for controlled server-side tasks.
