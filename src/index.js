const http = require('node:http');

const API_URL = process.env.API_URL || 'http://localhost:3000';

const server = http.createServer(async (req, res) => {
  if (req.url === '/') {
    try {
      const apiRes = await fetch(`${API_URL}/health`);
      const body = await apiRes.text();
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<html><body><h1>API Health</h1><pre>${body}</pre></body></html>`);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(`<html><body><h1>Error connecting to API</h1><pre>${err.message}</pre></body></html>`);
    }
  } else {
    res.writeHead(404);
    res.end();
  }
});

if (process.env.NODE_ENV !== 'test') {
  const port = process.env.PORT || 8080;
  server.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

module.exports = server;
