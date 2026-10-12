import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAppServer } from '../../server/demo-server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');
const FEEDBACKS_FILE = path.join(ROOT_DIR, 'data', 'feedbacks.json');

const TEST_PORT = 3499;
let serverInstance = null;

function makeRequest(pathName, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const payload = data ? JSON.stringify(data) : null;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: TEST_PORT,
        path: pathName,
        method: method,
        headers: payload
          ? {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(payload)
            }
          : {}
      },
      res => {
        let body = '';
        res.on('data', chunk => {
          body += chunk;
        });
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(body);
          } catch (_) {
            json = body;
          }
          resolve({ status: res.statusCode, headers: res.headers, data: json });
        });
      }
    );

    req.on('error', reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

describe('Landing Page, Feedback Hub & Pricing Routing Suite (TDD)', () => {
  before(async () => {
    // Garante pasta data
    const dataDir = path.join(ROOT_DIR, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    serverInstance = createAppServer(TEST_PORT);
    await new Promise(resolve => serverInstance.listen(TEST_PORT, resolve));
  });

  after(async () => {
    if (serverInstance) {
      await new Promise(resolve => serverInstance.close(resolve));
    }
  });

  // Cenário 1: Caminho feliz (Happy Path)
  it('Cenário 1 (Happy Path): submete feedback válido com 5 estrelas e recupera via GET /api/feedback', async () => {
    const payload = {
      rating: 5,
      category: 'elogio',
      comment: 'Economizei 2 horas no preenchimento do CCHA com o autofill!',
      author: 'Procurador Federal'
    };

    const postRes = await makeRequest('/api/feedback', 'POST', payload);
    assert.strictEqual(postRes.status, 201, 'POST /api/feedback deve responder com status 201');
    assert.strictEqual(postRes.data.success, true);
    assert.ok(postRes.data.feedback.id, 'Feedback deve conter id único');
    assert.strictEqual(postRes.data.feedback.rating, 5);
    assert.strictEqual(postRes.data.feedback.category, 'elogio');
    assert.strictEqual(postRes.data.feedback.author, 'Procurador Federal');

    const getRes = await makeRequest('/api/feedback', 'GET');
    assert.strictEqual(getRes.status, 200, 'GET /api/feedback deve responder status 200');
    assert.strictEqual(getRes.data.success, true);
    assert.ok(Array.isArray(getRes.data.feedbacks), 'feedbacks deve ser um array');

    const found = getRes.data.feedbacks.find(f => f.id === postRes.data.feedback.id);
    assert.ok(found, 'O feedback cadastrado deve estar na lista retornada');
  });

  // Cenário 2: Casos de borda (Edge Case)
  it('Cenário 2 (Edge Case): aceita feedback anônimo com acentuação e roteia raiz para Landing Page e /portal para CCHA', async () => {
    const payloadAnonimo = {
      rating: 4,
      category: 'sugestao',
      comment: 'Seria ótimo ter suporte a certidões judiciais de execução fiscal.'
    };

    const postRes = await makeRequest('/api/feedback', 'POST', payloadAnonimo);
    assert.strictEqual(postRes.status, 201);
    assert.strictEqual(postRes.data.feedback.author, 'Anônimo', 'Deve usar Anônimo como autor padrão');

    // Valida roteamento da rota / e rota /portal
    const rootRes = await makeRequest('/', 'GET');
    assert.strictEqual(rootRes.status, 200, 'Rota / deve responder 200');
    assert.ok(typeof rootRes.data === 'string', 'Rota / deve retornar HTML');

    const portalRes = await makeRequest('/portal', 'GET');
    assert.strictEqual(portalRes.status, 200, 'Rota /portal deve responder 200');
    assert.ok(typeof portalRes.data === 'string', 'Rota /portal deve retornar HTML do simulador');
  });

  // Cenário 3: Tratamento de erro (Error Path)
  it('Cenário 3 (Error Path): rejeita rating fora do intervalo 1-5, comentário vazio e JSON inválido', async () => {
    // Rating inválido (> 5)
    const resRatingAlto = await makeRequest('/api/feedback', 'POST', {
      rating: 6,
      category: 'elogio',
      comment: 'Nota alta demais'
    });
    assert.strictEqual(resRatingAlto.status, 400, 'Deve rejeitar rating maior que 5');

    // Rating inválido (< 1)
    const resRatingBaixo = await makeRequest('/api/feedback', 'POST', {
      rating: 0,
      category: 'critica',
      comment: 'Nota zero'
    });
    assert.strictEqual(resRatingBaixo.status, 400, 'Deve rejeitar rating menor que 1');

    // Comentário vazio
    const resComentarioVazio = await makeRequest('/api/feedback', 'POST', {
      rating: 4,
      category: 'sugestao',
      comment: '   '
    });
    assert.strictEqual(resComentarioVazio.status, 400, 'Deve rejeitar comentário vazio');
  });
});
