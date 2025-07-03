const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { scrypt, randomBytes, timingSafeEqual } = require('node:crypto');
const logger = require('./logger');

const publicDir = path.join(__dirname, '..', 'public');

function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(16).toString('hex');
    scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

function verifyPassword(stored, password) {
  return new Promise((resolve, reject) => {
    const [salt, key] = stored.split(':');
    if (!salt || !key) return resolve(false);
    scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      const hashed = Buffer.from(key, 'hex');
      resolve(timingSafeEqual(hashed, derivedKey));
    });
  });
}

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

function logRequest(req, res, start) {
  const duration = Date.now() - start;
  logger.log(`${req.method} ${req.url} ${res.statusCode} ${duration}ms`);
}

function createServer() {
  // In-memory user store
  const users = {};
  createServer.userStore = users;

  return http.createServer(async (req, res) => {
    const startTime = Date.now();
    res.on('finish', () => logRequest(req, res, startTime));
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'");
    const cookies = parseCookies(req.headers.cookie);

    if (req.method === 'POST' && req.url === '/register') {
      const { username, password } = await parseBody(req);
      if (!username || !password || users[username]) {
        res.writeHead(400);
        return res.end('Invalid registration');
      }
      const hashed = await hashPassword(password);
      users[username] = { password: hashed, programs: [] };
      res.writeHead(303, {
        'Location': '/onboarding.html',
        'Set-Cookie': `username=${username}; Path=/`
      });
      return res.end();
    }

    if (req.method === 'POST' && req.url === '/login') {
      const { username, password } = await parseBody(req);
      if (!username || !password || !users[username]) {
        res.writeHead(401);
        return res.end('Unauthorized');
      }
      const ok = await verifyPassword(users[username].password, password);
      if (!ok) {
        res.writeHead(401);
        return res.end('Unauthorized');
      }
      const dest = (users[username].programs && users[username].programs.length) ?
        '/dashboard.html' : '/onboarding.html';
      res.writeHead(303, {
        'Location': dest,
        'Set-Cookie': `username=${username}; Path=/`
      });
      return res.end();
    }

    if (req.method === 'POST' && req.url === '/create-program') {
      const username = cookies.username;
      if (!username || !users[username]) {
        res.writeHead(401);
        return res.end('Unauthorized');
      }
      const { programName, color, imageUrl } = await parseBody(req);
      if (!programName) {
        res.writeHead(400);
        return res.end('Invalid');
      }
      const program = { programName, color, imageUrl, role: 'admin' };
      users[username].programs.push(program);
      res.writeHead(201, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(program));
    }

    if (req.method === 'GET' && req.url === '/create-program.html') {
      const username = cookies.username;
      if (!username || !users[username]) {
        res.writeHead(302, { 'Location': '/login.html' });
        return res.end();
      }
    }

    if (req.method === 'GET' && req.url === '/api/programs') {
      const username = cookies.username;
      if (!username || !users[username]) {
        res.writeHead(401);
        return res.end('Unauthorized');
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        username,
        programs: users[username].programs
      }));
    }

    if (req.method === 'GET' && req.url === '/logs') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(logger.getLogs()));
    }

    let filePath;
    if (req.url === '/') {
      filePath = path.join(__dirname, '..', 'index.html');
    } else {
      filePath = path.normalize(path.join(publicDir, req.url.slice(1)));
    }
    const baseDir = path.join(__dirname, '..');

    if (!filePath.startsWith(baseDir)) {
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
    logger.log(`Server running on port ${port}`);
  });
}

module.exports = createServer;
