const http = require('node:http');
const { once } = require('node:events');
const assert = require('node:assert');

async function startServer(app) {
  app.listen(0);
  await once(app, 'listening');
  return app.address().port;
}

async function stopServer(server) {
  return new Promise((resolve) => server.close(resolve));
}

const test = require('node:test');

test('GET / returns index page', async () => {
  process.env.NODE_ENV = 'test';
  const createServer = require('../src/index');
  const app = createServer();
  const appPort = await startServer(app);

  const res = await fetch(`http://127.0.0.1:${appPort}/`);
  const text = await res.text();

  assert.strictEqual(res.status, 200);
  assert.ok(text.includes('Boys State App Admin Portal'));

  await stopServer(app);
});

test('register and customize program', async () => {
  process.env.NODE_ENV = 'test';
  const createServer = require('../src/index');
  const app = createServer();
  const port = await startServer(app);

  let res = await fetch(`http://127.0.0.1:${port}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'username=test&password=secret',
    redirect: 'manual'
  });
  assert.strictEqual(res.status, 303);
  const cookie = res.headers.get('set-cookie');
  assert.ok(cookie.includes('username=test'));

  res = await fetch(`http://127.0.0.1:${port}/customize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookie
    },
    body: 'programName=TestProgram&color=%23ff0000&imageUrl=logo.png'
  });
  const text = await res.text();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(text, 'Program updated');

  await stopServer(app);
});
