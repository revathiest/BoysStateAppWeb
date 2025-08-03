const { once } = require('node:events');

async function startServer(app) {
  app.listen(0);
  await once(app, 'listening');
  return app.address().port;
}

function stopServer(server) {
  return new Promise((resolve) => server.close(resolve));
}

test('zip-info endpoint returns matching states', async () => {
  process.env.NODE_ENV = 'test';
  const createServer = require('../src/index');
  const app = createServer();
  const port = await startServer(app);

  let res = await fetch(`http://127.0.0.1:${port}/api/zip-info?city=Springfield`);
  let data = await res.json();
  expect(data.cities).toContain('SPRINGFIELD');
  expect(data.states).toEqual(expect.arrayContaining(['IL', 'MO']));

  res = await fetch(`http://127.0.0.1:${port}/api/zip-info?zip=78401`);
  data = await res.json();
  expect(data.states).toEqual(['TX']);
  expect(data.cities).toEqual(['CORPUS CHRISTI']);

  await stopServer(app);
});
