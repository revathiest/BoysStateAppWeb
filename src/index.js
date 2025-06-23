const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.join(__dirname, '..', 'public');

function parseBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
    });
    req.on('end', () => {
      resolve(Object.fromEntries(new URLSearchParams(data)));
    });
  });
}

function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};
  return Object.fromEntries(cookieHeader.split(';').map(c => {
    const [k, v] = c.trim().split('=');
    return [k, v];
  }));
}

function createServer() {
  const users = {};

  return http.createServer(async (req, res) => {
    const cookies = parseCookies(req.headers.cookie);

    if (req.method === 'POST' && req.url === '/register') {
      const { username, password } = await parseBody(req);
      if (!username || !password || users[username]) {
        res.writeHead(400);
        return res.end('Invalid registration');
      }
      users[username] = { password, program: null };
      res.writeHead(303, {
        'Location': '/customize.html',
        'Set-Cookie': `username=${username}; Path=/`
      });
      return res.end();
    }

    if (req.method === 'POST' && req.url === '/login') {
      const { username, password } = await parseBody(req);
      if (!username || !password || !users[username] || users[username].password !== password) {
        res.writeHead(401);
        return res.end('Unauthorized');
      }
      res.writeHead(303, {
        'Location': '/customize.html',
        'Set-Cookie': `username=${username}; Path=/`
      });
      return res.end();
    }

    if (req.method === 'POST' && req.url === '/customize') {
      const username = cookies.username;
      if (!username || !users[username]) {
        res.writeHead(401);
        return res.end('Unauthorized');
      }
      const { programName, color, imageUrl } = await parseBody(req);
      users[username].program = { programName, color, imageUrl };
      res.writeHead(200);
      return res.end('Program updated');
    }

    if (req.method === 'GET' && req.url === '/customize.html') {
      const username = cookies.username;
      if (!username || !users[username]) {
        res.writeHead(302, { 'Location': '/login.html' });
        return res.end();
      }
    }

    let filePath = req.url === '/' ? 'index.html' : req.url.slice(1);
    filePath = path.normalize(path.join(publicDir, filePath));

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
}

if (require.main === module) {
  const port = process.env.PORT || 8080;
  createServer().listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

module.exports = createServer;
