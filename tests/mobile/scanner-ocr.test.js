// tests/mobile/scanner-ocr.test.js
// Suíte TDD para o Scanner Mobile e Integração de OCR em Tempo Real (3 Cenários Obrigatórios Tear)
import test from 'node:test';
import assert from 'node:assert/strict';
import { createAppServer } from '../../server/demo-server.js';
import http from 'node:http';

test('Mobile Scanner & Relay OCR — 1. Caminho Feliz (Happy Path): endpoint /api/ocr processa requisição e extrai dados', async () => {
  const testPort = 8991;
  const server = createAppServer(testPort);

  await new Promise(resolve => server.listen(testPort, resolve));

  try {
    const postData = JSON.stringify({
      image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      name: 'foto_documento.png',
      session: 'sess1234',
      mockText: 'CPF: 111.222.333-44 Nome: Kazuhiro Procurador Processo: 0001234-55.2026.4.01.3400 Valor: R$ 5.000,00'
    });

    const res = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port: testPort,
        path: '/api/ocr',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      }, resolve);
      req.on('error', reject);
      req.write(postData);
      req.end();
    });

    assert.equal(res.statusCode, 200);
    let body = '';
    for await (const chunk of res) body += chunk;
    const json = JSON.parse(body);

    assert.ok(json.success);
    assert.ok(json.data);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('Mobile Scanner & Relay OCR — 2. Casos de Borda (Edge Cases): upload sem sessão ou imagem vazia', async () => {
  const testPort = 8992;
  const server = createAppServer(testPort);
  await new Promise(resolve => server.listen(testPort, resolve));

  try {
    const postData = JSON.stringify({
      image: '',
      name: 'empty.png'
    });

    const res = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port: testPort,
        path: '/api/ocr',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      }, resolve);
      req.on('error', reject);
      req.write(postData);
      req.end();
    });

    assert.equal(res.statusCode, 400);
    let body = '';
    for await (const chunk of res) body += chunk;
    const json = JSON.parse(body);
    assert.equal(json.success, false);
    assert.ok(json.error);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('Mobile Scanner & Relay OCR — 3. Tratamento de Erro (Error Path): JSON corrompido na requisição', async () => {
  const testPort = 8993;
  const server = createAppServer(testPort);
  await new Promise(resolve => server.listen(testPort, resolve));

  try {
    const invalidJson = '{"corrupted: true';

    const res = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port: testPort,
        path: '/api/ocr',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(invalidJson)
        }
      }, resolve);
      req.on('error', reject);
      req.write(invalidJson);
      req.end();
    });

    assert.equal(res.statusCode, 400);
    let body = '';
    for await (const chunk of res) body += chunk;
    const json = JSON.parse(body);
    assert.equal(json.success, false);
    assert.ok(json.error.includes('JSON inválido'));
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
