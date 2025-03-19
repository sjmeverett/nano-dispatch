# nano-dispatcher

A universal, lightweight dispatcher.

Basically like a router, but for anything you want.

## Install

```
npm install nano-dispatcher
```

## Quick start

```js
import Dispatcher from 'nano-dispatcher';

const dispatcher = new Dispatcher();

dispatcher.on('foo').do(function foo() {

});

dispatcher.on('bar').do(function bar() {

});

const handler = dispatcher.find('foo');
handler();
```

## More details

This library is similar to routers you may be familar with, such as `koa-router`
or `express`. However, instead of being limited to HTTP methods and paths, you
can use basically anything for the pattern to match.

To register a _handler_ for a given _pattern_, use the `on` and `do` methods:

```js
dispatcher.on(...pattern).do(handler);
```

Patterns are arrays (default `unknown[]`). When you want to look up the handler(s)
that match a given _target_, use the `find` method:

```js
const handler = dispatcher.find(...target);
// this returns a callable function
await handler();
```

The result returned from `find` will be a function that calls all matching handlers,
middleware, etc; or, `undefined` if nothing matches.

Note that all handlers are awaited regardless of return type, so the handler function
is always async.

In order to compare a `target` against the list of `patterns` registered, the
dispatcher uses a `matcher` function, which you pass into the constructor. The
default matcher simply compares the arrays (unless the pattern segment is null,
in which case it is deemed to match anything):

```js
export const equalMatcher = (pattern, target) => {
  if (pattern.length !== target.length) {
    throw new Error(
      "pattern and target have different numbers of segments",
    );
  }

  for (let i = 0; i < target.length; i++) {
    if (pattern[i] !== null && pattern[i] !== target[i]) {
      return false;
    }
  }

  return true;
};
```

If you don't specify a matcher, it uses `equalMatcher` by default.

```js
import Dispatcher from 'nano-dispatch';
import equalMatcher from 'nano-dispatch/matchers/equalMatcher';

// the following are equivalent
const dispatcher = new Dispatcher();
const dispatcher2 = new Dispatcher(equalMatcher);
```

The `Dispatcher` class takes the following type arguments:

- `Pattern` — the type that `on` accepts
- `Target` — the type that `find` accepts
- `Input` — the arguments type for handlers
- `Output` — the return type for handlers

You could set up simple HTTP routing like so:

```js
type HttpPattern = [method: string | null, path: string | null];
type HttpPath = [method: string, path: string];

const dispatcher = new Dispatcher<HttpPattern, HttpPath, Request, Response>();

dispatcher.on('get', '/').do((request) => {
  // handler stuff
});

dispatcher.on('post', '/data').do((request) => {
  // more handler stuff
});

disptacher.on('get', null).do((request) => {
  // a catch-all for get routes
});

const handler = dispatcher.find(request.method, request.path);
const response = await handler(request);
```

If more than one route matches, they are run in order. `do` also accepts
multiple handlers so you can add middleware easily. Regardless of `TOutput`,
handlers can return `null` or `undefined` -- processing stops once a handler
actually returns a value.

For example:

``` js
dispatcher.on(null).do(() => {
  console.log('a');
});

dispatcher.on('/').on(
  () => {
    console.log('b');
  },
  () => {
    console.log('c');
    return 'test';
  }
);

dispatcher.on(null).do(() => {
  console.log('d');
  return 'fall through'
});

const handler = dispatcher.find('/');
const result = await handler();
```

In this example, 'a', 'b', and 'c' are printed, but because the handler that
prints 'c' returns a value, processing does not continue to the 'd' handler —
thus, `result` has the value `"test"`.

### Error handling

You can register error handlers with the `catch` method:

```js
dispatcher.catch((request) => {
  // this handler is run when an Error is thrown or a promise is rejected
});
```

Similar to regular handlers, processing stops when the first `catch` handler
returns a result:

```js
dispatcher.on('/').do((request) => {
  console.log('a');
  throw new Error('error');
  return 'success';
});

dispatcher.catch((error, request) => {
  console.log(error.message);
  return 'error';
});

dispatcher.catch((error, request)) => {
  console.log('another catch');
  return 'hey';
});

const handler = dispatcher.find('/');
const result = await handler(req);
```

In this example, 'a' and 'error' are printed, and `result` is `"error"`. The 2nd
error handler is never run, because the first returns a result.

## URL routing

Here's an example for how you could write a more sophisticated matcher that supports URL params:

```js
type HttpPattern = [method: string | null, path: RegExp | null];
type HttpTarget = [method: string, path: string];
type HttpRequest = { method: string, path: string, params: Record<string, string> };

const urlMatcher = ([patternMethod, patternPath], [targetMethod, targetPath], request) => {
  // null matches everything
  // otherwise the methods have to match exactly (case-insensitive)
  if (
    patternMethod !== null &&
    targetMethod.toLowerCase() !== patternMethod.toLowerCase()
  ) {
    return false;
  } else if (patternPath === null) {
    return true;
  }

  const match = targetPath.match(patternPath);

  if (match === null) {
    return false;
  } else if (match.groups) {
    if (!request.params) request.params = {};

    for (const key in match.groups) {
      request.params[key] = match.groups[key];
    }
  }

  return true;
}

const dispatch = new Dispatcher<HttpPattern, HttpTarget, HttpRequest, string>(urlMatcher);

// equivalent to GET /:id/?
dispatch.on('get', /\/(?<id>[^/]+?)\/?/).do((request) => {
  // request.params.id will be set now!
});
```
