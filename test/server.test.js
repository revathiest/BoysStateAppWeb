const http = require('node:http');
const { once } = require('node:events');
const assert = require('node:assert');

const apiServer = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
  }
});

async function startServer(server) {
  server.listen(0);
  await once(server, 'listening');
  return server.address().port;
}

async function stopServer(server) {
  return new Promise((resolve) => server.close(resolve));
}

const test = require('node:test');

test('GET / returns API health data', async () => {
  const apiPort = await startServer(apiServer);
  process.env.API_URL = `http://127.0.0.1:${apiPort}`;
  process.env.NODE_ENV = 'test';
  const app = require('../src/index');
  const appPort = await startServer(app);

  const res = await fetch(`http://127.0.0.1:${appPort}/`);
  const text = await res.text();

  assert.strictEqual(res.status, 200);
  assert.ok(text.includes('ok'));

  await stopServer(app);
  await stopServer(apiServer);
});
