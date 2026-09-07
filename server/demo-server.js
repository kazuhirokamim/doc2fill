// doc2fill - Servidor Local de Demonstração (Node.js nativo, zero dependências)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const PORT = process.env.PORT || 8080;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];

  // Roteamento amigável
  if (reqPath === '/' || reqPath === '/portal' || reqPath === '/demo') {
    reqPath = '/demo-portal/index.html';
  } else if (reqPath === '/mobile' || reqPath === '/scanner') {
    reqPath = '/mobile-pwa/index.html';
  }

  const filePath = path.join(ROOT_DIR, reqPath);

  // Prevenção básica de Directory Traversal
  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Acesso Proibido');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Arquivo não encontrado');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`⚡ doc2fill — Servidor de Demonstração Ativo`);
  console.log(`==================================================`);
  console.log(`🏛️ Simulador AGU/PGFN:   http://localhost:${PORT}/portal`);
  console.log(`📱 Scanner Web Mobile:   http://localhost:${PORT}/mobile`);
  console.log(`==================================================\n`);
});
