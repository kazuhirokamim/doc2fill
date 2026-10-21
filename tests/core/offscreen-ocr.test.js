// tests/core/offscreen-ocr.test.js
// Suíte TDD - Sprint B: OCR Embarcado Offscreen WASM e window.ai (Chrome MV3)
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import {
  handleOffscreenOcrRequest,
  promptGeminiNanoIfAvailable,
  initOffscreenListener
} from '../../extension/offscreen.js';
import {
  ensureOffscreenDocument,
  executeOffscreenOcr
} from '../../extension/offscreen-client.js';

describe('doc2fill Sprint B: Offscreen OCR & Built-in AI Suite (TDD)', () => {
  const originalChrome = globalThis.chrome;
  const originalAi = globalThis.ai;
  const originalBarcodeDetector = globalThis.BarcodeDetector;
  const originalImage = globalThis.Image;

  beforeEach(() => {
    // Reseta estado global
    delete globalThis.chrome;
    delete globalThis.ai;
    delete globalThis.BarcodeDetector;
    delete globalThis.Image;
  });

  afterEach(() => {
    globalThis.chrome = originalChrome;
    globalThis.ai = originalAi;
    globalThis.BarcodeDetector = originalBarcodeDetector;
    globalThis.Image = originalImage;
  });

  it('Cenário 1 (Happy Path): processa OCR offscreen com BarcodeDetector e responde mensagem', async () => {
    // Mock BarcodeDetector nativo
    globalThis.BarcodeDetector = class {
      async detect() {
        return [{ rawValue: '35240112345678000195550010000001231000001234' }];
      }
    };
    globalThis.Image = class {
      set src(val) {
        setTimeout(() => this.onload && this.onload(), 5);
      }
    };

    const mockMessage = {
      target: 'offscreen',
      type: 'RECOGNIZE_IMAGE',
      base64Image: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/',
      fileName: 'cupom_fiscal_sefaz.jpg'
    };

    const result = await handleOffscreenOcrRequest(mockMessage);

    assert.strictEqual(result.success, true, 'O processamento offscreen deve ter sucesso');
    assert.strictEqual(result.offscreen, true, 'Deve conter a flag offscreen');
    assert.ok(result.text.includes('35240112345678000195550010000001231000001234'), 'Texto deve conter chave SEFAZ');
    assert.strictEqual(result.data.chave_acesso, '35240112345678000195550010000001231000001234');
    assert.ok(result.data.tipo_documento.includes('Cupom') || result.data.tipo_documento.includes('Nota'), 'Tipo de documento fiscal identificado');
  });

  it('Cenário 2 (Edge Case): idempotência de criação offscreen e enriquecimento com window.ai / Gemini Nano', async () => {
    // 1. Simula ambiente Chrome com offscreen já criado
    let createDocumentCalls = 0;
    globalThis.chrome = {
      runtime: {
        getURL: (p) => `chrome-extension://doc2fill-id/${p}`,
        getContexts: async () => [{ contextType: 'OFFSCREEN_DOCUMENT' }],
        sendMessage: (msg, cb) => cb({ success: true, text: 'Chave: 1234', data: {} })
      },
      offscreen: {
        createDocument: async () => {
          createDocumentCalls++;
          throw new Error('Only a single offscreen document may be created at a time');
        }
      }
    };

    const ensured = await ensureOffscreenDocument('offscreen.html');
    assert.strictEqual(ensured, true, 'Deve retornar true aproveitando o contexto existente');
    assert.strictEqual(createDocumentCalls, 0, 'Não deve tentar recriar documento se já existir');

    // 2. Simula window.ai / Prompt API (Gemini Nano)
    globalThis.ai = {
      languageModel: {
        capabilities: async () => ({ available: 'readily' }),
        create: async () => ({
          prompt: async (txt) => 'CNPJ: 12.345.678/0001-95 | Valor: R$ 450,00 | TUSS: 30101010',
          destroy: () => {}
        })
      }
    };

    const nanoEnriched = await promptGeminiNanoIfAvailable('Texto cru de consulta médica com dermatologia');
    assert.ok(nanoEnriched.includes('30101010'), 'Gemini Nano deve extrair código TUSS do contexto');
    assert.ok(nanoEnriched.includes('12.345.678/0001-95'), 'Gemini Nano deve extrair CNPJ');
  });

  it('Cenário 3 (Error Path): chamadas defensivas com imagem vazia, offscreen indisponível ou erro de runtime', async () => {
    // 1. Imagem nula ou vazia
    const emptyResult = await handleOffscreenOcrRequest({});
    assert.strictEqual(emptyResult.success, false);
    assert.strictEqual(emptyResult.source, 'offscreen_invalid_input');

    // 2. Offscreen indisponível no cliente
    delete globalThis.chrome;
    const unavailableResult = await executeOffscreenOcr('data:image/png;base64,123');
    assert.strictEqual(unavailableResult.success, false);
    assert.strictEqual(unavailableResult.source, 'offscreen_unavailable');

    // 3. Erro reportado pelo chrome.runtime.lastError
    globalThis.chrome = {
      runtime: {
        getURL: (p) => p,
        getContexts: async () => [{ contextType: 'OFFSCREEN_DOCUMENT' }],
        lastError: { message: 'Canal de mensagens fechado inesperadamente' },
        sendMessage: (msg, cb) => cb(null)
      },
      offscreen: {
        createDocument: async () => {}
      }
    };

    const lastErrorResult = await executeOffscreenOcr('data:image/png;base64,123');
    assert.strictEqual(lastErrorResult.success, false);
    assert.strictEqual(lastErrorResult.source, 'offscreen_message_error');
    assert.strictEqual(lastErrorResult.error, 'Canal de mensagens fechado inesperadamente');
  });
});
