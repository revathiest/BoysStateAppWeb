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

test('login redirects based on program enrollment', async () => {
  process.env.NODE_ENV = 'test';
  const createServer = require('../src/index');
  const app = createServer();
  const port = await startServer(app);

  // Register user
  let res = await fetch(`http://127.0.0.1:${port}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'username=loginuser&password=secret',
    redirect: 'manual'
  });
  assert.strictEqual(res.status, 303);

  // Login with no programs should go to onboarding
  res = await fetch(`http://127.0.0.1:${port}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'username=loginuser&password=secret',
    redirect: 'manual'
  });
  const loginCookie = res.headers.get('set-cookie');
  assert.strictEqual(res.status, 303);
  assert.strictEqual(res.headers.get('location'), '/onboarding.html');
  assert.ok(loginCookie.includes('username=loginuser'));

  // Create a program for the user
  await fetch(`http://127.0.0.1:${port}/create-program`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': loginCookie
    },
    body: 'programName=Prog&color=%2300ff00&imageUrl=logo.png'
  });

  // Login again should redirect to dashboard
  res = await fetch(`http://127.0.0.1:${port}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'username=loginuser&password=secret',
    redirect: 'manual'
  });
  assert.strictEqual(res.status, 303);
  assert.strictEqual(res.headers.get('location'), '/dashboard.html');

  await stopServer(app);
});

test('unauthorized access is blocked', async () => {
  process.env.NODE_ENV = 'test';
  const createServer = require('../src/index');
  const app = createServer();
  const port = await startServer(app);

  let res = await fetch(`http://127.0.0.1:${port}/create-program`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'programName=Nope&color=%23ff0000&imageUrl=img.png'
  });
  assert.strictEqual(res.status, 401);

  res = await fetch(`http://127.0.0.1:${port}/api/programs`);
  assert.strictEqual(res.status, 401);

  res = await fetch(`http://127.0.0.1:${port}/create-program.html`, { redirect: 'manual' });
  assert.strictEqual(res.status, 302);
  assert.strictEqual(res.headers.get('location'), '/login.html');

  await stopServer(app);
});

test('CSP header is set on index', async () => {
  process.env.NODE_ENV = 'test';
  const createServer = require('../src/index');
  const app = createServer();
  const port = await startServer(app);

  const res = await fetch(`http://127.0.0.1:${port}/`);
  assert.strictEqual(
    res.headers.get('content-security-policy'),
    "default-src 'self'; script-src 'self'; style-src 'self'"
  );

  await stopServer(app);
});
