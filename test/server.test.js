const { once } = require('node:events');

async function startServer(app) {
  app.listen(0);
  await once(app, 'listening');
  return app.address().port;
}

function stopServer(server) {
  return new Promise((resolve) => server.close(resolve));
}

test('GET / returns index page', async () => {
  process.env.NODE_ENV = 'test';
  const createServer = require('../src/index');
  const app = createServer();
  const port = await startServer(app);

  const res = await fetch(`http://127.0.0.1:${port}/`);
  const text = await res.text();

  expect(res.status).toBe(200);
  expect(text).toContain('Boys State App');

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
  expect(res.status).toBe(303);
  const cookie = res.headers.get('set-cookie');
  expect(cookie).toContain('username=test');

  res = await fetch(`http://127.0.0.1:${port}/create-program`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookie
    },
    body: 'programName=TestProgram&color=%23ff0000&imageUrl=logo.png'
  });
  const created = await res.json();
  expect(res.status).toBe(201);
  expect(created.role).toBe('admin');

  res = await fetch(`http://127.0.0.1:${port}/api/programs`, {
    headers: { 'Cookie': cookie }
  });
  const list = await res.json();
  expect(list.programs.length).toBe(1);
  expect(list.programs[0].programName).toBe('TestProgram');

  await stopServer(app);
});

test('CSP header is set', async () => {
  process.env.NODE_ENV = 'test';
  const createServer = require('../src/index');
  const app = createServer();
  const port = await startServer(app);

  const res = await fetch(`http://127.0.0.1:${port}/login.html`);
  expect(res.headers.get('content-security-policy')).toBe(
    "default-src 'self'; script-src 'self'; style-src 'self'"
  );

  await stopServer(app);
});

test('passwords are hashed and requests are logged', async () => {
  process.env.NODE_ENV = 'test';
  const createServer = require('../src/index');
  const app = createServer();
  const port = await startServer(app);

  let res = await fetch(`http://127.0.0.1:${port}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'username=loginuser&password=secret',
    redirect: 'manual'
  });
  expect(res.status).toBe(303);

  res = await fetch(`http://127.0.0.1:${port}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'username=loginuser&password=secret',
    redirect: 'manual'
  });
  const loginCookie = res.headers.get('set-cookie');
  expect(res.status).toBe(303);
  expect(res.headers.get('location')).toBe('/onboarding.html');
  expect(loginCookie).toContain('username=loginuser');

  await fetch(`http://127.0.0.1:${port}/create-program`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': loginCookie
    },
    body: 'programName=Prog&color=%2300ff00&imageUrl=logo.png'
  });

  res = await fetch(`http://127.0.0.1:${port}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'username=loginuser&password=secret',
    redirect: 'manual'
  });
  expect(res.status).toBe(303);
  expect(res.headers.get('location')).toBe('/dashboard.html');
  const logRes = await fetch(`http://127.0.0.1:${port}/logs`);
  const logEntries = await logRes.json();
  expect(logEntries.some(l => l.includes('/login'))).toBe(true);

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
  expect(res.status).toBe(401);

  res = await fetch(`http://127.0.0.1:${port}/api/programs`);
  expect(res.status).toBe(401);

  res = await fetch(`http://127.0.0.1:${port}/create-program.html`, { redirect: 'manual' });
  expect(res.status).toBe(302);
  expect(res.headers.get('location')).toBe('/login.html');

  await stopServer(app);
});

test('CSP header is set on index', async () => {
  process.env.NODE_ENV = 'test';
  const createServer = require('../src/index');
  const app = createServer();
  const port = await startServer(app);

  const res = await fetch(`http://127.0.0.1:${port}/`);
  expect(res.headers.get('content-security-policy')).toBe(
    "default-src 'self'; script-src 'self'; style-src 'self'"
  );

  await stopServer(app);
});

test('invalid registration is rejected', async () => {
  process.env.NODE_ENV = 'test';
  const createServer = require('../src/index');
  const app = createServer();
  const port = await startServer(app);

  const res = await fetch(`http://127.0.0.1:${port}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'username=&password=',
  });
  expect(res.status).toBe(400);

  await stopServer(app);
});

test('login fails with wrong password', async () => {
  process.env.NODE_ENV = 'test';
  const createServer = require('../src/index');
  const app = createServer();
  const port = await startServer(app);

  await fetch(`http://127.0.0.1:${port}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'username=baduser&password=secret',
    redirect: 'manual'
  });

  const res = await fetch(`http://127.0.0.1:${port}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'username=baduser&password=wrong',
  });
  expect(res.status).toBe(401);

  await stopServer(app);
});

test('login fails for unknown user', async () => {
  process.env.NODE_ENV = 'test';
  const createServer = require('../src/index');
  const app = createServer();
  const port = await startServer(app);

  const res = await fetch(`http://127.0.0.1:${port}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'username=nouser&password=whatever',
  });
  expect(res.status).toBe(401);

  await stopServer(app);
});

test('missing program name returns 400', async () => {
  process.env.NODE_ENV = 'test';
  const createServer = require('../src/index');
  const app = createServer();
  const port = await startServer(app);

  await fetch(`http://127.0.0.1:${port}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'username=puser&password=secret',
    redirect: 'manual'
  });
  const cookieRes = await fetch(`http://127.0.0.1:${port}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'username=puser&password=secret',
    redirect: 'manual'
  });
  const cookie = cookieRes.headers.get('set-cookie');

  const res = await fetch(`http://127.0.0.1:${port}/create-program`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookie
    },
    body: 'programName=&color=%23fff&imageUrl=img.png'
  });
  expect(res.status).toBe(400);

  await stopServer(app);
});

test('GET unknown file returns 404', async () => {
  process.env.NODE_ENV = 'test';
  const createServer = require('../src/index');
  const app = createServer();
  const port = await startServer(app);

  const res = await fetch(`http://127.0.0.1:${port}/nosuchfile.html`);
  expect(res.status).toBe(404);

  await stopServer(app);
});

test('console output is sent to logger', () => {
  process.env.NODE_ENV = 'test';
  const logger = require('../src/logger');
  const origFetch = global.fetch;
  global.fetch = jest.fn().mockResolvedValue({});
  process.env.API_URL = 'http://example.com';
  const start = logger.getLogs().length;
  const circular = {};
  circular.self = circular;
  console.log('log-one');
  console.error('error-one');
  console.log(circular);
  process.emit('unhandledRejection', new Error('oops'));
  process.emit('uncaughtException', new Error('boom'));
  const logs = logger.getLogs().slice(start).join('\n');
  expect(logs).toContain('log-one');
  expect(logs).toContain('error-one');
  expect(logs).toContain('Unhandled rejection');
  expect(logs).toContain('Uncaught exception');
  expect(global.fetch).toHaveBeenCalled();
  global.fetch = origFetch;
  delete process.env.API_URL;
});

test('logger uses API_URL from config.js when env missing', () => {
  process.env.NODE_ENV = 'test';
  delete process.env.API_URL;
  const fs = require('node:fs');
  const path = require('node:path');
  const cfgPath = path.join(__dirname, '../public/js/config.js');
  const origCfg = fs.readFileSync(cfgPath, 'utf8');
  fs.writeFileSync(cfgPath, 'window.API_URL = "http://cfg.example";');
  jest.resetModules();
  require('../src/index');
  const logger = require('../src/logger');
  const origFetch = global.fetch;
  global.fetch = jest.fn().mockResolvedValue({});
  logger.log('cfg-test');
  expect(process.env.API_URL).toBe('http://cfg.example');
  expect(global.fetch).toHaveBeenCalled();
  global.fetch = origFetch;
  fs.writeFileSync(cfgPath, origCfg);
});
