/*!
 * on-headers
 * Copyright(c) 2014 Douglas Christopher Wilson
 * MIT Licensed
 */

module.exports = onHeaders;

/**
 * Execute a listener when a response is about to write headers.
 *
 * @param {object} res
 * @return {function} listener
 */

function onHeaders(res, listener) {
  if (!res) {
    throw new TypeError('argument res is required');
  }

  if (typeof listener !== 'function') {
    throw new TypeError('argument listener must be a function');
  }

  res.writeHead = createWriteHead(res.writeHead, listener);
}

/**
 * Create a replacement writeHead method.
 *
 * @param {function} prevWriteHead
 * @param {function} listener
 */
function createWriteHead(prevWriteHead, listener) {
  let fired = false;

  return function writeHead(...args) {
    const outArgs = [];
    if (typeof args[0] === 'number') {
      const statusCode = args.shift();
      this.statusCode = statusCode;
      outArgs.push(statusCode);
      if (typeof args[0] === 'string') {
        const statusMessage = args.shift();
        this.statusMessage = statusMessage;
        outArgs.push(statusMessage);
      }
    }
    if (args.length > 0) {
      setWriteHeadHeaders(this, ...args);
    }

    // fire listener
    if (!fired) {
      fired = true;
      listener.call(this);
      if (outArgs.length > 0) {
        outArgs[0] = this.statusCode;
        if (outArgs.length > 1) {
          outArgs[1] = this.statusMessage;
        }
      }
    }

    return prevWriteHead.apply(this, outArgs);
  };
}

/**
 * Set headers and other properties on the response object.
 *
 * @param {number} statusCode
 */
function setWriteHeadHeaders(res, headers) {
  if (Array.isArray(headers)) {
    for (const header of headers) {
      res.setHeader(header[0], header[1]);
    }
  } else if (headers) {
    for (const [k, v] of Object.entries(headers)) {
      if (k) res.setHeader(k, v);
    }
  }
}
