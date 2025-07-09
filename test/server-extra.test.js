const { once } = require('node:events');
const fs = require('node:fs');

async function startServer(app){
  app.listen(0); await once(app,'listening'); return app.address().port;
}
function stopServer(server){ return new Promise(res=>server.close(res)); }


test('readFile error returns 500', async () => {
  process.env.NODE_ENV='test';
  const readSpy = jest.spyOn(fs.promises,'readFile').mockRejectedValue(Object.assign(new Error('fail'),{code:'EACCES'}));
  const createServer = require('../src/index');
  const app = createServer();
  const port = await startServer(app);
  const res = await fetch(`http://127.0.0.1:${port}/index.html`);
  expect(res.status).toBe(500);
  readSpy.mockRestore();
  await stopServer(app);
});

test('api log start/end filters', async () => {
  process.env.NODE_ENV='test';
  const createServer = require('../src/index');
  const logger = require('../src/logger');
  const app = createServer();
  const port = await startServer(app);
  logger.log('old', {level:'info'});
  const future = new Date(Date.now()+100000).toISOString();
  const res = await fetch(`http://127.0.0.1:${port}/api/logs?start=${future}&end=${future}&page=1&pageSize=1`);
  const data = await res.json();
  expect(data.items.length).toBe(0);
  await stopServer(app);
});

test('duplicate registration returns 409', async () => {
  process.env.NODE_ENV='test';
  const createServer = require('../src/index');
  const app = createServer();
  const port = await startServer(app);
  await fetch(`http://127.0.0.1:${port}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'username=duser&password=a',
    redirect: 'manual'
  });
  const res = await fetch(`http://127.0.0.1:${port}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'username=duser&password=a',
    redirect: 'manual'
  });
  expect(res.status).toBe(409);
  await stopServer(app);
});

test('logs endpoint returns log list', async () => {
  process.env.NODE_ENV='test';
  const createServer = require('../src/index');
  const logger = require('../src/logger');
  const app = createServer();
  const port = await startServer(app);
  logger.log('entry',{level:'info',source:'server'});
  const res = await fetch(`http://127.0.0.1:${port}/logs`);
  const data = await res.json();
  expect(Array.isArray(data)).toBe(true);
  await stopServer(app);
});

test('api log source and search filters', async () => {
  process.env.NODE_ENV='test';
  const createServer = require('../src/index');
  const logger = require('../src/logger');
  const app = createServer();
  const port = await startServer(app);
  logger.log('match',{level:'info', source:'server'});
  const res = await fetch(`http://127.0.0.1:${port}/api/logs?source=server&search=match`);
  const data = await res.json();
  expect(data.items.length).toBeGreaterThan(0);
  await stopServer(app);
});
