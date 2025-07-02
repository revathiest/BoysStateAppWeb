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
  assert.ok(text.includes('Boys State App'));

  await stopServer(app);
});

test('register and create program', async () => {
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

  res = await fetch(`http://127.0.0.1:${port}/create-program`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookie
    },
    body: 'programName=TestProgram&color=%23ff0000&imageUrl=logo.png'
  });
  const created = await res.json();
  assert.strictEqual(res.status, 201);
  assert.strictEqual(created.role, 'admin');

  res = await fetch(`http://127.0.0.1:${port}/api/programs`, {
    headers: { 'Cookie': cookie }
  });
  const list = await res.json();
  assert.strictEqual(list.programs.length, 1);
  assert.strictEqual(list.programs[0].programName, 'TestProgram');

  await stopServer(app);
});

test('CSP header is set', async () => {
  process.env.NODE_ENV = 'test';
  const createServer = require('../src/index');
  const app = createServer();
  const port = await startServer(app);

  const res = await fetch(`http://127.0.0.1:${port}/login.html`);
  assert.strictEqual(
    res.headers.get('content-security-policy'),
    "default-src 'self'; script-src 'self'; style-src 'self'"
  );

  await stopServer(app);
});

test('passwords are hashed and requests are logged', async () => {
  process.env.NODE_ENV = 'test';
  const logs = [];
  const origLog = console.log;
  console.log = (msg) => logs.push(msg);

  const createServer = require('../src/index');
  const app = createServer();
  const port = await startServer(app);

  let res = await fetch(`http://127.0.0.1:${port}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'username=hashme&password=secret',
    redirect: 'manual'
  });
  assert.strictEqual(res.status, 303);
  const store = createServer.userStore;
  assert.notStrictEqual(store.hashme.password, 'secret');

  await fetch(`http://127.0.0.1:${port}/login.html`);

  console.log = origLog;
  assert.ok(logs.some(l => l.includes('GET /login.html')));

  await stopServer(app);
});
