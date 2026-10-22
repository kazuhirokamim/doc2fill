// tests/core/hybrid-ocr-scanning.test.js
// Suíte TDD para Engine Híbrida de Escaneamento: Binarização Otsu-lite, Rotação e Cloud-Boost

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeOtsuThreshold,
  applyOtsuBinarizationToPixels
} from '../../core/image-preprocessor.js';
import {
  formatGoogleVisionPayload,
  parseGoogleVisionResponse,
  performCloudVisionOcr,
  evaluateOcrConfidence,
  requestHybridOcr
} from '../../core/cloud-ocr-client.js';

describe('Engine Híbrida de Escaneamento e OCR (Local-First + Cloud-Boost)', () => {
  describe('Melhoria Local: Binarização Adaptativa Otsu-lite (image-preprocessor.js)', () => {
    it('Cenário 1 (Happy Path): deve calcular limiar de Otsu ótimo para distribuição bimodal de tons de cinza', () => {
      // Simula histograma com 2 picos: fundo claro (~200) e texto escuro (~50)
      const histogram = new Array(256).fill(0);
      for (let i = 40; i <= 60; i++) histogram[i] = 100; // Pico escuro (texto)
      for (let i = 190; i <= 210; i++) histogram[i] = 400; // Pico claro (fundo)
      const totalPixels = 21 * 100 + 21 * 400;

      const threshold = computeOtsuThreshold(histogram, totalPixels);
      assert.ok(threshold > 60 && threshold < 190, `Limiar Otsu calculado (${threshold}) deve separar os picos`);
    });

    it('Cenário 2 (Edge Case): deve lidar com imagem monocromática sem quebrar e retornar limiar seguro', () => {
      const flatHistogram = new Array(256).fill(0);
      flatHistogram[128] = 1000;
      const threshold = computeOtsuThreshold(flatHistogram, 1000);
      assert.equal(typeof threshold, 'number');
      assert.ok(threshold >= 0 && threshold <= 255);
    });

    it('Cenário 3 (Error Path): deve lidar com histograma vazio ou total zero retornando limiar padrão 128', () => {
      const emptyHist = new Array(256).fill(0);
      assert.equal(computeOtsuThreshold(emptyHist, 0), 128);
      assert.equal(computeOtsuThreshold(null, 100), 128);
    });

    it('Cenário 4 (Binarização de Pixels): binariza array RGBA transformando pixels claros em branco e escuros em preto', () => {
      // Cria buffer RGBA de 2 pixels: 1 escuro (RGB 30,30,30) e 1 claro (RGB 220,220,220)
      const rgba = new Uint8ClampedArray([
        30, 30, 30, 255,     // Pixel 0: Escuro (deve virar 0)
        220, 220, 220, 255   // Pixel 1: Claro (deve virar 255)
      ]);

      const result = applyOtsuBinarizationToPixels(rgba);
      assert.equal(result[0], 0);   // R escuro
      assert.equal(result[1], 0);   // G escuro
      assert.equal(result[2], 0);   // B escuro
      assert.equal(result[4], 255); // R claro
      assert.equal(result[5], 255); // G claro
      assert.equal(result[6], 255); // B claro
    });
  });

  describe('Cloud-Boost: Google Vision Payload e Parsing (cloud-ocr-client.js)', () => {
    it('Cenário 1 (Happy Path): formata payload compatível com a API Cloud Vision REST', () => {
      const base64Sample = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const payload = formatGoogleVisionPayload(base64Sample);

      assert.ok(payload.requests && Array.isArray(payload.requests));
      assert.equal(payload.requests[0].features[0].type, 'DOCUMENT_TEXT_DETECTION');
      assert.ok(payload.requests[0].image.content.length > 0);
      assert.ok(!payload.requests[0].image.content.startsWith('data:'));
    });

    it('Cenário 2 (Happy Path): faz parse correto de resposta do Google Vision extraindo texto consolidado', () => {
      const mockVisionResponse = {
        responses: [
          {
            fullTextAnnotation: {
              text: 'DROGARIA POPULAR LTDA\nCNPJ: 12.345.678/0001-99\nVALOR TOTAL R$ 150,00'
            }
          }
        ]
      };

      const extracted = parseGoogleVisionResponse(mockVisionResponse);
      assert.ok(extracted.includes('DROGARIA POPULAR'));
      assert.ok(extracted.includes('12.345.678/0001-99'));
      assert.ok(extracted.includes('R$ 150,00'));
    });

    it('Cenário 3 (Edge Case): lida com resposta sem texto ou estruturada de forma vazia sem lançar exceção', () => {
      assert.equal(parseGoogleVisionResponse({}), '');
      assert.equal(parseGoogleVisionResponse({ responses: [{}] }), '');
      assert.equal(parseGoogleVisionResponse(null), '');
    });
  });

  describe('Avaliação de Confiança e Orquestração Híbrida (cloud-ocr-client.js)', () => {
    it('Cenário 1 (Avaliação de Confiança): pontua adequadamente presença de campos críticos', () => {
      const fullDoc = {
        cnpj: '12.345.678/0001-90',
        valor: 'R$ 100,00',
        numero_documento: '123456',
        data: '2026-05-10',
        fornecedor: 'FARMACIA SAO PAULO'
      };
      const score = evaluateOcrConfidence(fullDoc, 'DROGARIA SAO PAULO LTDA CNPJ 12345678000190 NOTA 123456');
      assert.ok(score >= 80, `Documento com todos os campos deve ter score alto: ${score}`);

      const poorDoc = {
        cnpj: null,
        valor: null,
        numero_documento: null,
        fornecedor: null
      };
      const poorScore = evaluateOcrConfidence(poorDoc, 'texto ilegível ruído borrado');
      assert.ok(poorScore < 50, `Documento sem campos deve ter score baixo: ${poorScore}`);
    });

    it('Cenário 2 (Orquestração Local-First): usa resultado local se confiança >= 70% sem chamar nuvem', async () => {
      let cloudCalled = false;
      const mockCloudFn = async () => {
        cloudCalled = true;
        return { text: 'CLOUD TEXT' };
      };

      const localResult = {
        text: 'POSTO IPIRANGA LTDA CNPJ: 01.234.567/0001-89 NOTA 45678 TOTAL R$ 250,00 DATA 12/03/2026',
        confidence: 85
      };

      const finalResult = await requestHybridOcr({
        localResult,
        base64Image: 'base64_data',
        fileName: 'cupom.jpg',
        apiKey: 'fake_key',
        cloudFetcher: mockCloudFn
      });

      assert.equal(cloudCalled, false, 'Não deve chamar Cloud se o motor local teve boa confiança');
      assert.equal(finalResult.source, 'local');
      assert.equal(finalResult.data.cnpj, '01.234.567/0001-89');
    });

    it('Cenário 3 (Cloud-Boost Opt-in): aciona Cloud Vision se confiança local for baixa e chave existir', async () => {
      let cloudCalled = false;
      const mockCloudFn = async () => {
        cloudCalled = true;
        return {
          text: 'DROGARIA MEDICAMENTOS S/A\nCNPJ: 98.765.432/0001-10\nVALOR R$ 89,90\nDOC: 998877\nDATA: 20/04/2026'
        };
      };

      const localResult = {
        text: 'texto manchado ilegivel',
        confidence: 30
      };

      const finalResult = await requestHybridOcr({
        localResult,
        base64Image: 'base64_data',
        fileName: 'recibo.jpg',
        apiKey: 'valid_api_key',
        cloudFetcher: mockCloudFn
      });

      assert.equal(cloudCalled, true, 'Deve acionar Cloud Boost quando confiança local for insuficiente');
      assert.equal(finalResult.source, 'cloud_boost');
      assert.equal(finalResult.data.cnpj, '98.765.432/0001-10');
      assert.equal(finalResult.data.valor, '89,90');
    });

    it('Cenário 4 (Error Path Resiliente): fallback suave para local se chamada Cloud falhar com erro HTTP', async () => {
      const failingCloudFn = async () => {
        throw new Error('HTTP 403 Forbidden - Quota Exceeded');
      };

      const localResult = {
        text: 'CUPOM FISCAL LOCAL R$ 50,00',
        confidence: 45
      };

      const finalResult = await requestHybridOcr({
        localResult,
        base64Image: 'base64_data',
        fileName: 'cupom.jpg',
        apiKey: 'invalid_key',
        cloudFetcher: failingCloudFn
      });

      assert.equal(finalResult.source, 'local_fallback');
      assert.ok(finalResult.text.includes('CUPOM FISCAL LOCAL'));
      assert.ok(finalResult.warning.includes('HTTP 403'));
    });
  });
});
