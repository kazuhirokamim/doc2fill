// @tear-proof issue-1
// tests/core/offline-optical-pipeline.test.js
// Bateria TDD para Pipeline Óptico Autônomo e Leitura Client-Side de PDFs Escaneados (ADR-034 / PLAN-026)

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  extractFirstPdfImageAsDataUrl,
  decompressPdfStream
} from '../../core/pdf-stream-decoder.js';

import {
  computeOtsuThreshold,
  applyOtsuBinarizationToPixels,
  estimateSkewAngleFromProjection,
  calculateRotatedDimensions,
  rotateCanvasByDegrees
} from '../../core/image-preprocessor.js';

import {
  upscaleAndEnhanceImageElement,
  performBrowserClientOcr
} from '../../core/browser-ocr.js';

describe('doc2fill Offline Optical Pipeline & Client-Side Scanned PDF Suite (TDD)', () => {
  describe('Extrator de Imagens em PDFs Escaneados (extractFirstPdfImageAsDataUrl)', () => {
    test('Cenário 1 (Happy Path): extrai stream de imagem DCTDecode (JPEG) diretamente do PDF gerando Data URL', () => {
      // Simula um PDF contendo um objeto de imagem DCTDecode (JPEG)
      const fakeJpegBytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0xFF, 0xD9]);
      const pdfHeader = '1 0 obj\n<< /Type /XObject /Subtype /Image /Width 100 /Height 100 /Filter /DCTDecode /Length 14 >>\nstream\r\n';
      const pdfFooter = '\r\nendstream\nendobj';
      
      const encoder = new TextEncoder();
      const headerBytes = encoder.encode(pdfHeader);
      const footerBytes = encoder.encode(pdfFooter);
      
      const fullPdf = new Uint8Array(headerBytes.length + fakeJpegBytes.length + footerBytes.length);
      fullPdf.set(headerBytes, 0);
      fullPdf.set(fakeJpegBytes, headerBytes.length);
      fullPdf.set(footerBytes, headerBytes.length + fakeJpegBytes.length);

      const resultDataUrl = extractFirstPdfImageAsDataUrl(fullPdf);
      assert.ok(resultDataUrl, 'Deveria extrair um Data URL');
      assert.ok(resultDataUrl.startsWith('data:image/jpeg;base64,'), 'Deveria ser um data URL de JPEG');
      
      // Decodifica o base64 para conferir os magic bytes do JPEG
      const b64Part = resultDataUrl.split(',')[1];
      const decoded = Buffer.from(b64Part, 'base64');
      assert.equal(decoded[0], 0xFF);
      assert.equal(decoded[1], 0xD8);
      assert.equal(decoded[decoded.length - 2], 0xFF);
      assert.equal(decoded[decoded.length - 1], 0xD9);
    });

    test('Cenário 2 (Edge Case): suporta streams em arrays de filtros [/DCTDecode] e variações de espaçamento', () => {
      const fakeJpegBytes = new Uint8Array([0xFF, 0xD8, 0x00, 0x01, 0xFF, 0xD9]);
      const pdfString = '2 0 obj\n<< /Subtype /Image /Filter [ /DCTDecode ] /Length 6 >>\nstream\n';
      const pdfFooter = '\nendstream\nendobj';

      const enc = new TextEncoder();
      const h = enc.encode(pdfString);
      const f = enc.encode(pdfFooter);
      const full = new Uint8Array(h.length + fakeJpegBytes.length + f.length);
      full.set(h, 0);
      full.set(fakeJpegBytes, h.length);
      full.set(f, h.length + fakeJpegBytes.length);

      const res = extractFirstPdfImageAsDataUrl(full);
      assert.ok(res, 'Deveria extrair mesmo com notação de array [/DCTDecode]');
      assert.ok(res.startsWith('data:image/jpeg;base64,'));
    });

    test('Cenário 3 (Error Path): PDF sem streams de imagem ou buffer inválido/vazio retorna null de forma segura', () => {
      assert.equal(extractFirstPdfImageAsDataUrl(null), null);
      assert.equal(extractFirstPdfImageAsDataUrl(new Uint8Array(0)), null);
      
      const textOnlyPdf = new TextEncoder().encode('%PDF-1.4\n1 0 obj\n<< /Type /Page >>\nendobj\n%%EOF');
      assert.equal(extractFirstPdfImageAsDataUrl(textOnlyPdf), null);
    });
  });

  describe('Pipeline Óptico e Pré-processamento no Canvas (Otsu & Deskew)', () => {
    test('Cenário 1 (Happy Path): binarização adaptativa Otsu separa texto com ruído e limiar ótimo', () => {
      // Cria um buffer RGBA simulando fundo cinza claro (valor 200) e texto escuro (valor 30)
      const rgba = new Uint8ClampedArray(16 * 4);
      for (let i = 0; i < 16; i++) {
        const val = i < 8 ? 30 : 200; // 8 pixels escuros, 8 pixels claros
        rgba[i * 4] = val;
        rgba[i * 4 + 1] = val;
        rgba[i * 4 + 2] = val;
        rgba[i * 4 + 3] = 255;
      }

      applyOtsuBinarizationToPixels(rgba);

      // Pixels escuros devem ser 0 e claros devem ser 255
      assert.equal(rgba[0], 0, 'Pixel escuro deveria ser binarizado para 0');
      assert.equal(rgba[1], 0);
      assert.equal(rgba[2], 0);
      assert.equal(rgba[3], 255, 'Canal alfa deve ser preservado');

      assert.equal(rgba[32], 255, 'Pixel claro deveria ser binarizado para 255');
      assert.equal(rgba[33], 255);
      assert.equal(rgba[34], 255);
      assert.equal(rgba[35], 255);
    });

    test('Cenário 2 (Edge Case): estimativa de inclinação e rotação planar arbitrária ajustam dimensões', () => {
      const w = 800;
      const h = 600;
      const angle = 5; // 5 graus de inclinação
      const dims = calculateRotatedDimensions(w, h, angle);
      
      assert.ok(dims.width >= w, 'Largura rotacionada deve acomodar o retângulo inclinado');
      assert.ok(dims.height >= h, 'Altura rotacionada deve acomodar o retângulo inclinado');

      // Testa rotação em Mock Canvas
      const mockCanvas = {
        width: 400,
        height: 300,
        getContext: () => ({
          translate: () => {},
          rotate: () => {},
          drawImage: () => {}
        })
      };

      const rotated = rotateCanvasByDegrees(mockCanvas, 5);
      assert.ok(rotated, 'Canvas rotacionado deve existir');
    });

    test('Cenário 3 (Error Path): upscaleAndEnhanceImageElement lida com elementos vazios ou inválidos', () => {
      assert.equal(upscaleAndEnhanceImageElement(null), null);
      assert.equal(upscaleAndEnhanceImageElement({ width: 0, height: 0 }), null);
    });
  });

  describe('Fluxo Integrado Browser Client OCR com Contingência Local', () => {
    test('Cenário 1 (Happy Path): performBrowserClientOcr processa imagem com BarcodeDetector simulado', async () => {
      const originalDetector = globalThis.BarcodeDetector;
      const originalImage = globalThis.Image;

      // Mock de BarcodeDetector detectando chave SEFAZ
      globalThis.BarcodeDetector = class {
        async detect() {
          return [{ rawValue: '35241012345678000195550010000001231000001234' }];
        }
      };

      globalThis.Image = class {
        constructor() {
          setTimeout(() => {
            this.naturalWidth = 800;
            this.naturalHeight = 1200;
            if (this.onload) this.onload();
          }, 5);
        }
      };

      try {
        const dummyBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...';
        const res = await performBrowserClientOcr(dummyBase64, 'cupom_fiscal.jpg');
        
        assert.ok(res.success, 'Deveria ter sucesso');
        assert.ok(res.text.includes('35241012345678000195550010000001231000001234'), 'Deveria conter a chave de acesso');
        assert.equal(res.data.cnpj, '12.345.678/0001-95', 'Deveria decodificar o CNPJ da chave SEFAZ');
      } finally {
        globalThis.BarcodeDetector = originalDetector;
        globalThis.Image = originalImage;
      }
    });

    test('Cenário 2 (Edge Case): performBrowserClientOcr converte internamente PDFs escaneados para imagem', async () => {
      // Simula um PDF contendo imagem JPEG e passa como base64
      const fakeJpegBytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0xFF, 0xD9]);
      const pdfHeader = '1 0 obj\n<< /Type /XObject /Subtype /Image /Width 100 /Height 100 /Filter /DCTDecode /Length 14 >>\nstream\r\n';
      const pdfFooter = '\r\nendstream\nendobj';
      
      const encoder = new TextEncoder();
      const h = encoder.encode(pdfHeader);
      const f = encoder.encode(pdfFooter);
      const full = new Uint8Array(h.length + fakeJpegBytes.length + f.length);
      full.set(h, 0);
      full.set(fakeJpegBytes, h.length);
      full.set(f, h.length + fakeJpegBytes.length);

      const base64Pdf = `data:application/pdf;base64,${Buffer.from(full).toString('base64')}`;

      const res = await performBrowserClientOcr(base64Pdf, 'scanned_document.pdf');
      assert.ok(res, 'Deveria retornar resultado estruturado');
      assert.notEqual(res.source, 'invalid_input');
    });

    test('Cenário 3 (Error Path): performBrowserClientOcr com entrada vazia ou inválida retorna erro estruturado', async () => {
      const resNull = await performBrowserClientOcr(null);
      assert.equal(resNull.success, false);
      assert.equal(resNull.source, 'invalid_input');

      const resEmpty = await performBrowserClientOcr('');
      assert.equal(resEmpty.success, false);
      assert.equal(resEmpty.source, 'invalid_input');
    });
  });
});
