const { describe, it } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const onHeaders = require('..');
const request = require('supertest');

describe('onHeaders(res, listener)', () => {
  it('should fire after setHeader', async () => {
    const server = createServer(echoListener);

    await request(server)
      .get('/')
      .expect('X-Outgoing-Echo', 'test')
      .expect(200);
  });

  it('should fire before write', async () => {
    const server = createServer(echoListener, handler);

    function handler(_req, res) {
      res.setHeader('X-Outgoing', 'test');
      res.write('1');
    }

    await request(server)
      .get('/')
      .expect('X-Outgoing-Echo', 'test')
      .expect(200, '1');
  });

  it('should fire with no headers', async () => {
    const server = createServer(listener, handler);

    function handler() {}

    function listener() {
      this.setHeader('X-Headers', getAllHeaderNames(this).join(','));
    }

    await request(server).get('/').expect('X-Headers', '').expect(200);
  });

  it('should fire only once', async () => {
    let count = 0;
    const server = createServer(listener, handler);

    function handler(_req, res) {
      res.writeHead(200);

      try {
        res.writeHead(200);
      } catch {}
    }

    function listener() {
      count++;
    }

    await request(server).get('/').expect(200);
    assert.strictEqual(count, 1);
  });

  it('should fire in reverse order', async () => {
    const server = createServer(echoListener, handler);

    function handler(_req, res) {
      onHeaders(res, appendHeader(1));
      onHeaders(res, appendHeader(2));
      onHeaders(res, appendHeader(3));
      res.setHeader('X-Outgoing', 'test');
    }

    await request(server)
      .get('/')
      .expect('X-Outgoing-Echo', 'test,3,2,1')
      .expect(200);
  });

  describe('arguments', () => {
    describe('res', () => {
      it('should be required', () => {
        assert.throws(onHeaders.bind(), /res.*required/);
      });
    });

    describe('listener', () => {
      it('should be required', async () => {
        const server = createServer();

        await request(server)
          .get('/')
          .expect(500, /listener.*function/);
      });

      it('should only accept function', async () => {
        const server = createServer(42);

        await request(server)
          .get('/')
          .expect(500, /listener.*function/);
      });
    });
  });

  describe('setHeader', () => {
    it('should be available in listener', async () => {
      const server = createServer(echoListener);

      await request(server)
        .get('/')
        .expect('X-Outgoing-Echo', 'test')
        .expect(200);
    });
  });

  describe('writeHead(status)', () => {
    it('should make status available in listener', async () => {
      const server = createServer(listener, handler);

      function handler(_req, res) {
        res.writeHead(201);
      }

      function listener() {
        this.setHeader('X-Status', this.statusCode);
      }

      await request(server).get('/').expect('X-Status', '201').expect(201);
    });

    it('should allow manipulation of status in listener', async () => {
      const server = createServer(listener, handler);

      function handler(_req, res) {
        res.writeHead(201);
      }

      function listener() {
        this.setHeader('X-Status', this.statusCode);
        this.statusCode = 202;
      }

      await request(server).get('/').expect('X-Status', '201').expect(202);
    });

    it('should pass-through core error', async () => {
      const server = createServer(appendHeader(1), handler);

      function handler(_req, res) {
        res.writeHead(); // error
      }

      await request(server).get('/').expect(500);
    });

    it('should retain return value', async () => {
      const server = http.createServer(({ url }, res) => {
        if (url === '/attach') {
          onHeaders(res, appendHeader(1));
        }

        res.end(typeof res.writeHead(200));
      });

      const { text } = await request(server).get('/').expect(200);
      await request(server).get('/attach').expect(200, text);
    });
  });

  describe('writeHead(status, reason)', () => {
    it('should be available in listener', async () => {
      const server = createServer(echoListener, handler);

      function handler(_req, res) {
        res.setHeader('X-Outgoing', 'test');
        res.writeHead(200, 'OK');
      }

      await request(server)
        .get('/')
        .expect('X-Outgoing-Echo', 'test')
        .expect(200);
    });
  });

  describe('writeHead(status, reason, obj)', () => {
    it('should be available in listener', async () => {
      const server = createServer(echoListener, handler);

      function handler(_req, res) {
        res.writeHead(200, 'OK', { 'X-Outgoing': 'test' });
      }

      await request(server)
        .get('/')
        .expect('X-Outgoing-Echo', 'test')
        .expect(200);
    });
  });

  describe('writeHead(status, obj)', () => {
    it('should be available in listener', async () => {
      const server = createServer(listener, handler);

      function handler(_req, res) {
        res.writeHead(201, { 'X-Outgoing': 'test' });
      }

      function listener() {
        this.setHeader('X-Status', this.statusCode);
        this.setHeader('X-Outgoing-Echo', this.getHeader('X-Outgoing'));
      }

      await request(server)
        .get('/')
        .expect('X-Status', '201')
        .expect('X-Outgoing-Echo', 'test')
        .expect(201);
    });

    it('should handle falsy keys', async () => {
      const server = createServer(listener, handler);

      function handler(_req, res) {
        res.writeHead(201, { 'X-Outgoing': 'test', '': 'test' });
      }

      function listener() {
        this.setHeader('X-Status', this.statusCode);
        this.setHeader('X-Outgoing-Echo', this.getHeader('X-Outgoing'));
      }

      await request(server)
        .get('/')
        .expect('X-Status', '201')
        .expect('X-Outgoing-Echo', 'test')
        .expect(201);
    });
  });

  describe('writeHead(status, arr)', () => {
    it('tuples', async () => {
      const server = createServer(listener, handler);

      function handler(_req, res) {
        res.writeHead(201, [['X-Outgoing', 'test']]);
      }

      function listener() {
        this.setHeader('X-Status', this.statusCode);
        this.setHeader('X-Outgoing-Echo', this.getHeader('X-Outgoing'));
      }

      await request(server)
        .get('/')
        .expect('X-Status', '201')
        .expect('X-Outgoing-Echo', 'test')
        .expect(201);
    });
  });

  it('raw headers', async () => {
    const server = createServer(listener, handler);

    function handler(_req, res) {
      res.writeHead(201, ['X-Outgoing', 'test']);
    }

    function listener() {
      this.setHeader('X-Status', this.statusCode);
      this.setHeader('X-Outgoing-Echo', this.getHeader('X-Outgoing'));
    }

    await request(server)
      .get('/')
      .expect('X-Status', '201')
      .expect('X-Outgoing-Echo', 'test')
      .expect(201);
  });
});

function createServer(listener, handler) {
  const fn = handler || echoHandler;

  return http.createServer((_req, res) => {
    try {
      onHeaders(res, listener);
      fn(_req, res);
      res.statusCode = 200;
    } catch (err) {
      res.statusCode = 500;
      res.write(err.message);
    } finally {
      res.end();
    }
  });
}

function appendHeader(num) {
  return function onHeaders() {
    this.setHeader('X-Outgoing', `${this.getHeader('X-Outgoing')},${num}`);
  };
}

function echoHandler(_req, res) {
  res.setHeader('X-Outgoing', 'test');
}

function echoListener() {
  this.setHeader('X-Outgoing-Echo', this.getHeader('X-Outgoing'));
}

function getAllHeaderNames(res) {
  return typeof res.getHeaderNames !== 'function'
    ? Object.keys(this._headers || {})
    : res.getHeaderNames();
}
