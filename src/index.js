const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.join(__dirname, '..', 'public');

const server = http.createServer(async (req, res) => {
  let filePath = req.url === '/' ? 'index.html' : req.url.slice(1);
  filePath = path.normalize(path.join(publicDir, filePath));

  // prevent directory traversal attacks
  if (!filePath.startsWith(publicDir)) {
    res.writeHead(400);
    return res.end('Bad Request');
  }

  try {
    const data = await fs.promises.readFile(filePath);
    const ext = path.extname(filePath);
    const type = ext === '.html' ? 'text/html' :
                 ext === '.css' ? 'text/css' :
                 ext === '.js' ? 'application/javascript' : 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type });
    res.end(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.writeHead(404);
      res.end('Not Found');
    } else {
      res.writeHead(500);
      res.end('Server Error');
    }
  }
});

if (process.env.NODE_ENV !== 'test') {
  const port = process.env.PORT || 8080;
  server.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

module.exports = server;
