const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { scrypt, randomBytes, timingSafeEqual } = require('node:crypto');

// Load environment variables early so the logger can use them
(function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  try {
    const envData = fs.readFileSync(envPath, 'utf8');
    envData.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) return;
      const [key, ...rest] = trimmed.split('=');
      if (process.env[key] === undefined) {
        process.env[key] = rest.join('=');
      }
    });
  } catch {
    // Ignore missing .env file
  }
  if (!process.env.API_URL) {
    try {
      const cfgPath = path.join(__dirname, '..', 'public', 'js', 'config.js');
      const cfg = fs.readFileSync(cfgPath, 'utf8');
      const match = cfg.match(/window\.API_URL\s*=\s*"([^"]+)"/);
      if (match) {
        process.env.API_URL = match[1];
      }
    } catch {
      // Ignore missing config file
    }
  }
})();

const logger = require('./logger');

const publicDir = path.join(__dirname, '..', 'public');

// Load zip/city/state data from JSON generated from the XLS source.
// The conversion should produce an array of {zip, city, state} records
// and be stored at docs/zipData.json. If the file is missing, lookups
// will simply return no matches.
let cityToStates = {};
let zipToStates = {};
let zipToCities = {};
let cityList = [];
try {
  const zPath = path.join(__dirname, '..', 'docs', 'zipData.json');
  const raw = fs.readFileSync(zPath, 'utf8');
  const rows = JSON.parse(raw);
  rows.forEach(({ city, state, zip }) => {
    const c = city.toUpperCase();
    if (!cityToStates[c]) cityToStates[c] = [];
    if (!cityToStates[c].includes(state)) cityToStates[c].push(state);
    if (!zipToStates[zip]) zipToStates[zip] = [];
    if (!zipToStates[zip].includes(state)) zipToStates[zip].push(state);
    if (!zipToCities[zip]) zipToCities[zip] = [];
    if (!zipToCities[zip].includes(c)) zipToCities[zip].push(c);
  });
  cityList = Object.keys(cityToStates);
} catch {
  cityToStates = {};
  zipToStates = {};
  zipToCities = {};
  cityList = [];
}

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

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  }
}

function logRequest(req, res, start) {
  const duration = Date.now() - start;
  const user = req.user || 'anonymous';
  logger.log(`${req.method} ${req.url} by ${user} ${res.statusCode} ${duration}ms`);
}

function createServer() {
  // In-memory user store
  const users = {};
  createServer.userStore = users;

  return http.createServer(async (req, res) => {
    const startTime = Date.now();
    res.on('finish', () => logRequest(req, res, startTime));
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'");
    setCorsHeaders(req, res);
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      return res.end();
    }
    const cookies = parseCookies(req.headers.cookie);
    req.user = cookies.username;

    if (req.method === 'GET' && req.url.startsWith('/api/zip-info')) {
      const urlObj = new URL(req.url, `http://${req.headers.host}`);
      const cityQuery = urlObj.searchParams.get('city');
      const zipQuery = urlObj.searchParams.get('zip');
      const result = {};
      if (cityQuery) {
        const prefix = cityQuery.toUpperCase();
        const matches = cityList.filter(c => c.startsWith(prefix));
        result.cities = matches.slice(0, 10);
        if (matches.length) {
          const stateSet = new Set();
          matches.forEach(c => cityToStates[c].forEach(s => stateSet.add(s)));
          result.states = Array.from(stateSet);
        }
      }
      if (zipQuery) {
        result.states = zipToStates[zipQuery] || [];
        result.cities = zipToCities[zipQuery] || [];
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(result));
    }

    if (req.method === 'POST' && req.url === '/register') {
      const { username, password } = await parseBody(req);
      req.user = username;
      if (!username || !password) {
        logger.log('Failed registration: missing fields', { level: 'warn', source: 'auth', username });
        res.writeHead(400);
        res.end('Missing username or password');
        return;
      }
      if (users[username]) {
        logger.log(`Failed registration: duplicate username ${username}`, { level: 'warn', source: 'auth' });
        res.writeHead(409);
        res.end('Username already exists');
        return;
      }
      const hashed = await hashPassword(password);
      users[username] = { password: hashed, programs: [] };
      logger.log(`User registered: ${username}`, { source: 'auth' });
      res.writeHead(303, {
        'Location': '/onboarding.html',
        'Set-Cookie': `username=${username}; Path=/`
      });
      return res.end();
    }

    if (req.method === 'POST' && req.url === '/login') {
      const { username, password } = await parseBody(req);
      req.user = username;
      if (!users[username]) {
        logger.log(`Failed login: user not found (${username})`, { level: 'warn', source: 'auth' });
        res.writeHead(401);
        res.end('Unauthorized');
        return;
      }
      const ok = await verifyPassword(users[username].password, password);
      if (!ok) {
        logger.log(`Failed login: incorrect password (${username})`, { level: 'warn', source: 'auth' });
        res.writeHead(401);
        res.end('Unauthorized');
        return;
      }
      logger.log(`Successful login for ${username}`, { source: 'auth' });
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
      req.user = username;
      if (!username || !users[username]) {
        logger.log('Unauthorized program creation attempt by unknown user', { level: 'warn', source: 'program' });
        res.writeHead(401);
        res.end('Unauthorized');
        return;
      }
      const { programName, color, imageUrl } = await parseBody(req);
      if (!programName) {
        logger.log(`Failed program creation: missing programName by ${username}`, { level: 'warn', source: 'program' });
        res.writeHead(400);
        res.end('Missing program name');
        return;
      }
      const program = { programName, color, imageUrl, role: 'admin' };
      users[username].programs.push(program);
      logger.log(`Program created by ${username}: ${programName}`, { source: 'program' });
      res.writeHead(201, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(program));
    }

    if (req.method === 'GET' && req.url === '/create-program.html') {
      const username = cookies.username;
      req.user = username;
      if (!username || !users[username]) {
        res.writeHead(302, { 'Location': '/login.html' });
        return res.end();
      }
    }

    if (req.method === 'GET' && req.url === '/api/programs') {
      const username = cookies.username;
      req.user = username;
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
      logger.log(`/logs accessed by ${req.user || 'anonymous'}`, { level: 'info', source: 'logs' });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(logger.getLogs()));
    }

    if (req.method === 'GET' && req.url.startsWith('/api/logs')) {
      logger.log(`/api/logs accessed by ${req.user || 'anonymous'}`, { level: 'info', source: 'logs' });
      const urlObj = new URL(req.url, `http://${req.headers.host}`);
      let logs = logger.getLogs();
      const start = urlObj.searchParams.get('start');
      const end = urlObj.searchParams.get('end');
      const level = urlObj.searchParams.getAll('level');
      const source = urlObj.searchParams.get('source');
      const search = urlObj.searchParams.get('search');
      if (start) logs = logs.filter(l => l.timestamp >= start);
      if (end) logs = logs.filter(l => l.timestamp <= end);
      if (level && level.length) logs = logs.filter(l => level.includes(l.level));
      if (source && source !== 'all') logs = logs.filter(l => l.source === source);
      if (search) logs = logs.filter(l => {
        return (l.message && l.message.includes(search)) ||
               (l.error && l.error.includes(search)) ||
               (l.source && l.source.includes(search));
      });
      const page = parseInt(urlObj.searchParams.get('page') || '1', 10);
      const pageSize = parseInt(urlObj.searchParams.get('pageSize') || '50', 10);
      const startIdx = (page - 1) * pageSize;
      const items = logs.slice(startIdx, startIdx + pageSize);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ total: logs.length, items }));
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
        logger.log(`File not found (404): ${filePath}`, { level: 'warn', source: 'server', user: req.user || 'anonymous' });
        res.writeHead(404);
        res.end('Not Found');
      } else {
        logger.log(`Error reading file ${filePath}: ${err.message}`, { level: 'error', source: 'server' });
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
