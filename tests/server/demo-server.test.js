import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

describe('doc2fill Demo Server Suite (TDD)', () => {
  let server;
  const TEST_PORT = 8999;

  const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8'
  };

  before(async () => {
    server = http.createServer((req, res) => {
      let reqPath = req.url.split('?')[0];

      if (reqPath === '/' || reqPath === '/portal' || reqPath === '/demo') {
        reqPath = '/demo-portal/index.html';
      } else if (reqPath === '/mobile' || reqPath === '/scanner') {
        reqPath = '/mobile-pwa/index.html';
      }

      const filePath = path.join(ROOT_DIR, reqPath);

      if (!filePath.startsWith(ROOT_DIR)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('403 Proibido');
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
        res.writeHead(200, { 'Content-Type': contentType });
        fs.createReadStream(filePath).pipe(res);
      });
    });

    await new Promise(resolve => server.listen(TEST_PORT, resolve));
  });

  after(async () => {
    await new Promise(resolve => server.close(resolve));
  });

  it('Cenário 1 (Happy Path): rota /portal deve responder status 200 com HTML do simulador', async () => {
    const res = await fetch(`http://localhost:${TEST_PORT}/portal`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'text/html; charset=utf-8');
    const text = await res.text();
    assert.ok(text.includes('Portal Eletrônico de Atos & Honorários Fiscais'));
  });

  it('Cenário 2 (Edge Case): rota /mobile deve responder status 200 com scanner PWA', async () => {
    const res = await fetch(`http://localhost:${TEST_PORT}/mobile`);
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.ok(text.includes('doc2fill'));
  });

  it('Cenário 3 (Error Path): rota inexistente deve responder status 404', async () => {
    const res = await fetch(`http://localhost:${TEST_PORT}/inexistente-xyz`);
    assert.equal(res.status, 404);
  });
});

