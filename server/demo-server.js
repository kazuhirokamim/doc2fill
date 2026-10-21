// doc2fill - Servidor Local de Demonstração & Ephemeral Relay P2P
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';
import { processOcrText, performOcr } from '../core/ocr-engine.js';
import { generateLicenseKey, generateAsymmetricLicenseKeyAsync } from '../core/license-validator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
export const DEFAULT_PORT = Number(process.env.PORT) || 3333;
export const SESSION_TTL_MS = 5 * 60 * 1000;
const MAX_BODY_SIZE = 15 * 1024 * 1024;

export const relaySessions = new Map();
export const sseClients = new Set();

export function cleanupExpiredSessions(now = Date.now(), ttlMs = SESSION_TTL_MS) {
  let purgedCount = 0;
  for (const [sessionId, item] of relaySessions.entries()) {
    if (now - (item.timestamp || 0) > ttlMs) {
      relaySessions.delete(sessionId);
      purgedCount++;
    }
  }
  return purgedCount;
}

export function getLocalIpAddress() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return '127.0.0.1';
}

function readRequestBody(req, maxBytes = MAX_BODY_SIZE) {
  return new Promise((resolve, reject) => {
    let body = '';
    let received = 0;
    req.on('data', chunk => {
      received += chunk.length;
      if (received > maxBytes) {
        req.destroy();
        reject(new Error('PAYLOAD_TOO_LARGE'));
        return;
      }
      body += chunk;
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.zip': 'application/zip'
};

export function createAppServer(port = DEFAULT_PORT) {
  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const urlObj = new URL(req.url, `http://localhost:${port}`);
    const reqPath = urlObj.pathname;

    if (reqPath === '/api/session') {
      const sessionId = Math.random().toString(36).substring(2, 10);
      const localIp = getLocalIpAddress();
      const mobileUrl = `http://${localIp}:${port}/mobile?session=${sessionId}`;

      try {
        const qrSvg = await QRCode.toString(mobileUrl, {
          type: 'svg', margin: 1, width: 140, color: { dark: '#111827', light: '#FFFFFF' }
        });
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ sessionId, localIp, mobileUrl, qrSvg }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Erro ao gerar QR Code' }));
      }
      return;
    }

    if (reqPath === '/api/ocr' && req.method === 'POST') {
      cleanupExpiredSessions();
      try {
        const body = await readRequestBody(req);
        const payload = JSON.parse(body);
        if (!payload.image || typeof payload.image !== 'string' || payload.image.trim() === '') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'image base64 é obrigatória' }));
          return;
        }

        let ocrText = payload.mockText || '';
        if (!ocrText) {
          const ocrRes = await performOcr(payload.image);
          ocrText = ocrRes.text;
        }

        const extractedData = processOcrText(ocrText, payload.name || 'foto.jpg');
        if (payload.session) {
          relaySessions.set(payload.session, {
            data: extractedData,
            file: { name: payload.name || 'foto_camera.jpg', type: 'image/jpeg', base64: payload.image },
            timestamp: Date.now()
          });
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, text: ocrText, data: extractedData }));
      } catch (e) {
        const status = e.message === 'PAYLOAD_TOO_LARGE' ? 413 : 400;
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: status === 413 ? 'Payload excede 15MB' : 'JSON inválido' }));
      }
      return;
    }

    if (reqPath === '/api/relay/upload' && req.method === 'POST') {
      cleanupExpiredSessions();
      try {
        const body = await readRequestBody(req);
        const payload = JSON.parse(body);
        if (!payload.session || (!payload.data && !payload.file)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'session e (data ou file) são obrigatórios' }));
          return;
        }

        let finalData = payload.data || {};
        if (payload.file && payload.file.base64 && payload.autoOcr) {
          const ocrRes = await performOcr(payload.file.base64);
          if (ocrRes.text) {
            const ocrFields = processOcrText(ocrRes.text, payload.file.name);
            finalData = { ...finalData, ...ocrFields };
          }
        }

        relaySessions.set(payload.session, { data: finalData, file: payload.file || null, timestamp: Date.now() });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: finalData }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'JSON inválido' }));
      }
      return;
    }

    if (reqPath === '/api/relay/poll') {
      cleanupExpiredSessions();
      const session = urlObj.searchParams.get('session');
      if (!session || !relaySessions.has(session)) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ hasData: false }));
        return;
      }
      const item = relaySessions.get(session);
      relaySessions.delete(session);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ hasData: true, data: item.data, file: item.file || null }));
      return;
    }

    if (reqPath === '/api/checkout/pix' && req.method === 'POST') {
      try {
        const body = await readRequestBody(req);
        const payload = body ? JSON.parse(body) : {};
        const plan = payload.plan || 'mensal';
        let amount = 197.00;
        if (plan === 'starter') amount = 89.00;
        else if (plan === 'starter_anual') amount = 790.00;
        else if (plan === 'anual') amount = 1970.00;

        const orderId = `PED-${Date.now().toString(36).toUpperCase()}`;
        const pixCode = `00020126580014br.gov.bcb.pix0136fundador@exemplo.com520400005303986540${amount.toFixed(2)}5802BR5916DOC2FILL TECNOLOGIA6009SAO PAULO62070503***6304${orderId}`;

        const qrSvg = await QRCode.toString(pixCode, {
          type: 'svg', margin: 1, width: 190, color: { dark: '#0A0D14', light: '#FFFFFF' }
        });

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          success: true, orderId, plan, amount, pixCode, qrSvg,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
        }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Falha ao processar checkout' }));
      }
      return;
    }

    if (reqPath === '/api/checkout/events' && req.method === 'GET') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive'
      });
      res.write(': sse connected\n\n');
      sseClients.add(res);
      req.on('close', () => sseClients.delete(res));
      return;
    }

    if (reqPath === '/api/checkout/confirm' && req.method === 'POST') {
      try {
        const body = await readRequestBody(req);
        const payload = body ? JSON.parse(body) : {};
        const orderId = payload.orderId || `PED-${Date.now().toString(36).toUpperCase()}`;
        const email = payload.email || 'fundador@exemplo.com';
        const plan = (payload.plan === 'starter' || payload.plan === 'starter_anual') ? 'STARTER' : 'PRO';

        const nextYear = new Date();
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        const expStr = `${nextYear.getFullYear()}${String(nextYear.getMonth() + 1).padStart(2, '0')}${String(nextYear.getDate()).padStart(2, '0')}`;

        const cryptographicLicenseKey = generateLicenseKey(email, plan, expStr);
        let ecdsaLicenseKey = '';
        try {
          ecdsaLicenseKey = await generateAsymmetricLicenseKeyAsync(email, plan, expStr);
        } catch (_) {}
        const licenseKey = payload.useCryptoFormat ? cryptographicLicenseKey : `DOC2FILL-FUNDADOR-${cryptographicLicenseKey}`;

        const ssePayload = JSON.stringify({
          event: 'payment_confirmed', orderId, email,
          licenseKey: cryptographicLicenseKey, ecdsaLicenseKey, legacyLicenseKey: licenseKey,
          downloadUrl: '/download/doc2fill-beta.zip', timestamp: Date.now()
        });

        for (const client of sseClients) {
          try { client.write(`data: ${ssePayload}\n\n`); } catch (_) { sseClients.delete(client); }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, orderId, email, licenseKey, cryptographicLicenseKey, ecdsaLicenseKey }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Erro ao confirmar pedido' }));
      }
      return;
    }

    if (reqPath === '/api/feedback') {
      const feedbacksFilePath = path.join(ROOT_DIR, 'data', 'feedbacks.json');
      if (req.method === 'GET') {
        try {
          let feedbacks = [];
          if (fs.existsSync(feedbacksFilePath)) feedbacks = JSON.parse(fs.readFileSync(feedbacksFilePath, 'utf8'));
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: true, feedbacks }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Erro ao listar feedbacks' }));
        }
        return;
      }

      if (req.method === 'POST') {
        try {
          const body = await readRequestBody(req);
          const payload = JSON.parse(body || '{}');
          const rating = Number(payload.rating);
          const comment = typeof payload.comment === 'string' ? payload.comment.trim() : '';

          if (isNaN(rating) || rating < 1 || rating > 5) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'O rating deve ser um número inteiro de 1 a 5' }));
            return;
          }
          if (!comment) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'O comentário de feedback não pode estar vazio' }));
            return;
          }

          const validCategories = ['elogio', 'critica', 'sugestao', 'erro'];
          const category = validCategories.includes(payload.category) ? payload.category : 'elogio';
          const author = typeof payload.author === 'string' && payload.author.trim() ? payload.author.trim() : 'Anônimo';

          const newFeedback = {
            id: `fb-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            timestamp: new Date().toISOString(), rating, category, author, comment
          };

          let feedbacks = [];
          if (fs.existsSync(feedbacksFilePath)) {
            try { feedbacks = JSON.parse(fs.readFileSync(feedbacksFilePath, 'utf8')); } catch (_) { feedbacks = []; }
          }

          feedbacks.unshift(newFeedback);
          if (feedbacks.length > 50) feedbacks = feedbacks.slice(0, 50);

          const dataDir = path.join(ROOT_DIR, 'data');
          if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
          fs.writeFileSync(feedbacksFilePath, JSON.stringify(feedbacks, null, 2), 'utf8');

          res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: true, feedback: newFeedback }));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Payload JSON malformado' }));
        }
        return;
      }
    }

    let staticPath = reqPath;
    if (staticPath === '/' || staticPath === '/home') staticPath = '/site/index.html';
    else if (staticPath === '/portal' || staticPath === '/demo') staticPath = '/demo-portal/index.html';
    else if (staticPath === '/mobile' || staticPath === '/scanner') staticPath = '/mobile-pwa/index.html';
    else if (staticPath === '/checkout' || staticPath === '/vendas') staticPath = '/demo-portal/checkout.html';
    else if (staticPath === '/download/doc2fill-beta.zip') staticPath = '/dist/doc2fill-v0.3.0-beta.zip';

    const filePath = path.join(ROOT_DIR, staticPath);
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
      res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-cache' });
      fs.createReadStream(filePath).pipe(res);
    });
  });

  return server;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const localIp = getLocalIpAddress();
  const initialPort = DEFAULT_PORT;

  function tryListen(port, attemptsLeft = 5) {
    const srv = createAppServer(port);
    srv.once('error', (err) => {
      if (err.code === 'EADDRINUSE' && attemptsLeft > 0) {
        tryListen(port + 1, attemptsLeft - 1);
      } else {
        console.error(`[doc2fill] Falha ao iniciar servidor na porta ${port}:`, err.message);
      }
    });
    srv.listen(port, () => {
      console.log(`\n======================================================`);
      console.log(`⚡ doc2fill — Servidor Local & Ephemeral Relay Ativo`);
      console.log(`🏛️  Simulador CCHA / AGU:  http://localhost:${port}/portal`);
      console.log(`📱 Scanner Mobile PWA:    http://${localIp}:${port}/mobile`);
      console.log(`======================================================\n`);
    });
  }
  tryListen(initialPort);
}