[![NPM version][npm-image]][npm-url]
[![Build Status][build-image]][build-url]
[![Dependency Status][deps-image]][deps-url]

# @pirxpilot/on-headers

This is a fork of [on-headers].
Execute a listener when a response is about to write headers.

## API

<!-- eslint-disable no-unused-vars -->

```js
var onHeaders = require('on-headers')
```

### onHeaders(res, listener)

This will add the listener `listener` to fire when headers are emitted for `res`.
The listener is passed the `response` object as it's context (`this`). Headers are
considered to be emitted only once, right before they are sent to the client.

When this is called multiple times on the same `res`, the `listener`s are fired
in the reverse order they were added.

## Examples

```js
var http = require('http')
var onHeaders = require('on-headers')

http
  .createServer(onRequest)
  .listen(3000)

function addPoweredBy () {
  // set if not set by end of request
  if (!this.getHeader('X-Powered-By')) {
    this.setHeader('X-Powered-By', 'Node.js')
  }
}

function onRequest (req, res) {
  onHeaders(res, addPoweredBy)

  res.setHeader('Content-Type', 'text/plain')
  res.end('hello!')
}
```

## License

[MIT](LICENSE)

[on-headers]: https://npmjs.org/package/on-headers

[npm-image]: https://img.shields.io/npm/v/@pirxpilot/on-headers
[npm-url]: https://npmjs.org/package/@pirxpilot/on-headers

[build-url]: https://github.com/pirxpilot/on-headers/actions/workflows/check.yaml
[build-image]: https://img.shields.io/github/actions/workflow/status/pirxpilot/on-headers/check.yaml?branch=main

[deps-image]: https://img.shields.io/librariesio/release/npm/@pirxpilot/on-headers
[deps-url]: https://libraries.io/npm/@pirxpilot%2Fon-headers
