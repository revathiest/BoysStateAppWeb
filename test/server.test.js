const http = require('node:http');
const { once } = require('node:events');
const assert = require('node:assert');

async function startServer(server) {
  server.listen(0);
  await once(server, 'listening');
  return server.address().port;
}

async function stopServer(server) {
  return new Promise((resolve) => server.close(resolve));
}

const test = require('node:test');

test('GET / returns index page', async () => {
  process.env.NODE_ENV = 'test';
  const app = require('../src/index');
  const appPort = await startServer(app);

  const res = await fetch(`http://127.0.0.1:${appPort}/`);
  const text = await res.text();

  assert.strictEqual(res.status, 200);
  assert.ok(text.includes('Boys State App Admin Portal'));

  await stopServer(app);
});
