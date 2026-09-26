// doc2fill - Servidor Local de Demonstração & Ephemeral Relay P2P
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';
import { processOcrText, performOcr } from '../core/ocr-engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
export const DEFAULT_PORT = process.env.PORT || 8080;
export const SESSION_TTL_MS = 5 * 60 * 1000; // 5 minutos de vida máxima na RAM

// Memória efêmera de sessões para pareamento P2P (Zero Retenção)
export const relaySessions = new Map();

/**
 * Purga ativamente sessões que excederam o tempo de vida na memória RAM
 * @param {number} [now=Date.now()] Timestamp atual para validação
 * @param {number} [ttlMs=SESSION_TTL_MS] Tempo de vida máximo em milissegundos
 * @returns {number} Quantidade de sessões purgadas
 */
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

/**
 * Detecta o endereço IP local na rede Wi-Fi / Ethernet para acesso mobile
 */
export function getLocalIpAddress() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

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

/**
 * Cria o servidor HTTP da aplicação
 */
export function createAppServer(port = DEFAULT_PORT) {
  const server = http.createServer(async (req, res) => {
    // CORS Headers globais
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

    // 1. API: Criar / Obter Sessão de Pareamento P2P com QR Code Real
    if (reqPath === '/api/session') {
      const sessionId = Math.random().toString(36).substring(2, 10);
      const localIp = getLocalIpAddress();
      const mobileUrl = `http://${localIp}:${port}/mobile?session=${sessionId}`;

      try {
        const qrSvg = await QRCode.toString(mobileUrl, {
          type: 'svg',
          margin: 1,
          width: 140,
          color: { dark: '#111827', light: '#FFFFFF' }
        });

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ sessionId, localIp, mobileUrl, qrSvg }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Erro ao gerar QR Code' }));
      }
      return;
    }

    // 2. API: OCR Local de Imagens / Fotos Mobile (Tesseract.js)
    if (reqPath === '/api/ocr' && req.method === 'POST') {
      cleanupExpiredSessions();
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
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

          // Se sessão foi fornecida, atualiza o relay imediatamente para a extensão consumir
          if (payload.session) {
            relaySessions.set(payload.session, {
              data: extractedData,
              file: {
                name: payload.name || 'foto_camera.jpg',
                type: 'image/jpeg',
                base64: payload.image
              },
              timestamp: Date.now()
            });
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            text: ocrText,
            data: extractedData
          }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'JSON inválido' }));
        }
      });
      return;
    }

    // 3. API: Upload de Dados Fiscais pelo Celular (Buffer em Memória com Enriquecimento por OCR)
    if (reqPath === '/api/relay/upload' && req.method === 'POST') {
      cleanupExpiredSessions();
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body);
          if (!payload.session || (!payload.data && !payload.file)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'session e (data ou file) são obrigatórios' }));
            return;
          }

          let finalData = payload.data || {};

          // Auto-OCR: se vier arquivo com imagem e autoOcr ou sem dados reais extraídos
          if (payload.file && payload.file.base64 && payload.autoOcr) {
            const ocrRes = await performOcr(payload.file.base64);
            if (ocrRes.text) {
              const ocrFields = processOcrText(ocrRes.text, payload.file.name);
              finalData = { ...finalData, ...ocrFields };
            }
          }

          relaySessions.set(payload.session, {
            data: finalData,
            file: payload.file || null,
            timestamp: Date.now()
          });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, data: finalData }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'JSON inválido' }));
        }
      });
      return;
    }

    // 3. API: Polling de Consumo Único (Zero-Retention Ephemeral Consume)
    if (reqPath === '/api/relay/poll') {
      cleanupExpiredSessions();
      const session = urlObj.searchParams.get('session');
      if (!session || !relaySessions.has(session)) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ hasData: false }));
        return;
      }

      const item = relaySessions.get(session);
      // Descarta imediatamente da memória RAM após a leitura (Zero Retenção)
      relaySessions.delete(session);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ hasData: true, data: item.data, file: item.file || null }));
      return;
    }

    // 4. Arquivos Estáticos e Roteamento Amigável
    let staticPath = reqPath;
    if (staticPath === '/' || staticPath === '/portal' || staticPath === '/demo') {
      staticPath = '/demo-portal/index.html';
    } else if (staticPath === '/mobile' || staticPath === '/scanner') {
      staticPath = '/mobile-pwa/index.html';
    }

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

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
      });

      fs.createReadStream(filePath).pipe(res);
    });
  });

  return server;
}

// Inicia servidor se executado diretamente
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const localIp = getLocalIpAddress();
  const server = createAppServer(DEFAULT_PORT);
  server.listen(DEFAULT_PORT, () => {
    console.log(`\n======================================================`);
    console.log(`⚡ doc2fill — Servidor Local & Ephemeral Relay Ativo`);
    console.log(`======================================================`);
    console.log(`🏛️  Simulador AGU/PGFN:  http://localhost:${DEFAULT_PORT}/portal`);
    console.log(`📱 Scanner Mobile:      http://${localIp}:${DEFAULT_PORT}/mobile`);
    console.log(`======================================================\n`);
  });
}
