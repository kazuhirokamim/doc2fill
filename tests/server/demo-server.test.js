// @tear-proof issue-1
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createAppServer, cleanupExpiredSessions, relaySessions, SESSION_TTL_MS, DEFAULT_PORT } from '../../server/demo-server.js';

describe('doc2fill Demo Server & P2P Relay Suite (TDD)', () => {
  let server;
  const TEST_PORT = 8999;

  before(async () => {
    server = createAppServer(TEST_PORT);
    await new Promise(resolve => server.listen(TEST_PORT, resolve));
  });

  after(async () => {
    await new Promise(resolve => server.close(resolve));
  });

  describe('Static & Portal Routes', () => {
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

  describe('P2P QR Code & Ephemeral Relay API', () => {
    it('Cenário 1 (Happy Path): /api/session gera sessão com QR Code SVG escaneável e URL móvel', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/session`);
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.ok(data.sessionId);
      assert.ok(data.mobileUrl.includes('/mobile?session='));
      assert.ok(data.qrSvg.startsWith('<svg'));
      assert.ok(data.qrSvg.includes('</svg>'));
    });

    it('Cenário 2 (Edge Case): /api/relay/upload e poll efêmero com consumo único (Zero Retenção)', async () => {
      const session = 'test-session-123';
      const samplePayload = {
        session,
        data: {
          cnpj: '33.000.167/0001-01',
          razao: 'Petrobras',
          valor: 'R$ 14.750,00'
        }
      };

      // Upload do celular
      const uploadRes = await fetch(`http://localhost:${TEST_PORT}/api/relay/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(samplePayload)
      });
      assert.equal(uploadRes.status, 200);
      const uploadJson = await uploadRes.json();
      assert.equal(uploadJson.success, true);

      // Primeiro Poll da extensão (deve consumir e receber os dados)
      const pollRes1 = await fetch(`http://localhost:${TEST_PORT}/api/relay/poll?session=${session}`);
      assert.equal(pollRes1.status, 200);
      const pollJson1 = await pollRes1.json();
      assert.equal(pollJson1.hasData, true);
      assert.equal(pollJson1.data.cnpj, '33.000.167/0001-01');

      // Segundo Poll imediato (deve retornar hasData: false porque já foi descartado da memória)
      const pollRes2 = await fetch(`http://localhost:${TEST_PORT}/api/relay/poll?session=${session}`);
      const pollJson2 = await pollRes2.json();
      assert.equal(pollJson2.hasData, false);
    });

    it('Cenário 3 (Error Path): rejeita upload com JSON malformado ou campos ausentes', async () => {
      const badUpload1 = await fetch(`http://localhost:${TEST_PORT}/api/relay/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"session": "xyz"}' // sem data
      });
      assert.equal(badUpload1.status, 400);

      const badUpload2 = await fetch(`http://localhost:${TEST_PORT}/api/relay/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json'
      });
      assert.equal(badUpload2.status, 400);
    });
  });

  describe('cleanupExpiredSessions (TTL Auto-Cleanup Engine)', () => {
    it('Cenário 1 (Happy Path): sessão recente (menos de 5 min) é mantida na RAM', () => {
      const now = 1000000;
      relaySessions.set('sess-recente', {
        data: { cnpj: '11.222.333/0001-44' },
        timestamp: now - 60000 // 1 minuto atrás
      });

      const purged = cleanupExpiredSessions(now, SESSION_TTL_MS);
      assert.equal(purged, 0);
      assert.ok(relaySessions.has('sess-recente'));
      relaySessions.delete('sess-recente');
    });

    it('Cenário 2 (Edge Case): sessão exatamente no limite de 5 minutos não é purgada antes de exceder o TTL', () => {
      const now = 1000000;
      relaySessions.set('sess-limite', {
        data: { valor: 'R$ 10,00' },
        timestamp: now - SESSION_TTL_MS // exatamente 300.000 ms
      });

      const purged = cleanupExpiredSessions(now, SESSION_TTL_MS);
      assert.equal(purged, 0);
      assert.ok(relaySessions.has('sess-limite'));
      relaySessions.delete('sess-limite');
    });

    it('Cenário 3 (Error Path / Purge): sessões com mais de 5 minutos são descartadas da RAM', () => {
      const now = 1000000;
      relaySessions.set('sess-expirada-1', {
        data: { cnpj: '00.000.000/0001-00' },
        timestamp: now - (SESSION_TTL_MS + 1000) // 5 min e 1 seg
      });
      relaySessions.set('sess-expirada-2', {
        data: { cnpj: '99.999.999/0001-99' },
        timestamp: now - (SESSION_TTL_MS + 60000) // 6 min
      });

      const purged = cleanupExpiredSessions(now, SESSION_TTL_MS);
      assert.equal(purged, 2);
      assert.equal(relaySessions.has('sess-expirada-1'), false);
      assert.equal(relaySessions.has('sess-expirada-2'), false);
    });
  });

  describe('DEFAULT_PORT & Network Configuration', () => {
    it('Cenário 1 (Happy Path): DEFAULT_PORT é numérico e padrão 3333 para evitar conflitos com React/Next', () => {
      assert.equal(typeof DEFAULT_PORT, 'number');
      assert.equal(DEFAULT_PORT, 3333);
    });

    it('Cenário 2 (Edge Case): createAppServer instancia servidor HTTP válido e funcional', () => {
      const customServer = createAppServer(3335);
      assert.ok(customServer);
      assert.equal(typeof customServer.listen, 'function');
      assert.equal(typeof customServer.close, 'function');
    });

    it('Cenário 3 (Error Path): cleanup com timestamp inválido não quebra o servidor', () => {
      assert.doesNotThrow(() => cleanupExpiredSessions(NaN, SESSION_TTL_MS));
      assert.doesNotThrow(() => cleanupExpiredSessions(Date.now(), -1));
    });
  });

  describe('Pix 1-Click Checkout & SSE Telemetry (S3-T4)', () => {
    it('Cenário 1 (Happy Path): rota /checkout responde 200 e /api/checkout/pix gera cobrança válida com QR Code', async () => {
      const pageRes = await fetch(`http://localhost:${TEST_PORT}/checkout`);
      assert.equal(pageRes.status, 200);
      const html = await pageRes.text();
      assert.ok(html.includes('Checkout Fundador Pix 1-Click'));

      const pixRes = await fetch(`http://localhost:${TEST_PORT}/api/checkout/pix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'mensal' })
      });
      assert.equal(pixRes.status, 200);
      const pixJson = await pixRes.json();

      assert.equal(pixJson.success, true);
      assert.equal(pixJson.amount, 197.00);
      assert.ok(pixJson.orderId.startsWith('PED-'));
      assert.ok(pixJson.pixCode.toLowerCase().includes('doc2fill'));
      assert.ok(pixJson.qrSvg.startsWith('<svg'));
    });

    it('Cenário 2 (Edge Case): plano anual gera valor com desconto e /api/checkout/confirm emite chave de licença', async () => {
      const pixAnnualRes = await fetch(`http://localhost:${TEST_PORT}/api/checkout/pix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'anual' })
      });
      const annualJson = await pixAnnualRes.json();
      assert.equal(annualJson.amount, 1970.00);

      const confirmRes = await fetch(`http://localhost:${TEST_PORT}/api/checkout/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: annualJson.orderId })
      });
      assert.equal(confirmRes.status, 200);
      const confirmJson = await confirmRes.json();
      assert.equal(confirmJson.success, true);
      assert.ok(confirmJson.licenseKey.startsWith('DOC2FILL-FUNDADOR-'));
    });

    it('Cenário 3 (Error Path): requisição com payload inválido é tratada com segurança', async () => {
      const badRes = await fetch(`http://localhost:${TEST_PORT}/api/checkout/pix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'bad-json{'
      });
      assert.equal(badRes.status, 400);
    });
  });
});

