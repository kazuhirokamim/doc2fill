// @tear-proof issue-1
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isPdfEncrypted, extractTextFromPdfContent } from '../../core/document-parser.js';
import { hasSufficientImageContrast } from '../../core/ocr-engine.js';

describe('doc2fill S1-T4: Resilience & Exception Handling Suite (TDD)', () => {
  describe('isPdfEncrypted', () => {
    it('Cenário 1 (Happy Path): identifica que PDF padrão sem senha NÃO está criptografado', () => {
      const normalPdfStr = '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\ntrailer\n<< /Size 3 /Root 1 0 R >>\n%%EOF';
      const buffer = Buffer.from(normalPdfStr, 'latin1');
      assert.equal(isPdfEncrypted(buffer), false);
    });

    it('Cenário 2 (Edge Case): detecta preventivamente PDF protegido com senha (/Encrypt)', () => {
      const encryptedPdfStr = '%PDF-1.6\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R /Encrypt 5 0 R >>\n%%EOF';
      const buffer = Buffer.from(encryptedPdfStr, 'latin1');
      assert.equal(isPdfEncrypted(buffer), true);

      // Também deve lidar com ArrayBuffer
      const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
      assert.equal(isPdfEncrypted(ab), true);
    });

    it('Cenário 3 (Error Path): lida graciosamente com buffers nulos, vazios ou corrompidos sem lançar exceções', () => {
      assert.equal(isPdfEncrypted(null), false);
      assert.equal(isPdfEncrypted(undefined), false);
      assert.equal(isPdfEncrypted(new ArrayBuffer(0)), false);
      assert.equal(isPdfEncrypted(Buffer.alloc(0)), false);
      assert.equal(isPdfEncrypted('não é um buffer'), false);
    });
  });

  describe('hasSufficientImageContrast', () => {
    it('Cenário 1 (Happy Path): buffer com texto/contraste dinâmico é aprovado para OCR', () => {
      // Cria buffer simulando imagem com pixels variados (preto, cinza, branco)
      const data = new Uint8Array(200);
      for (let i = 0; i < data.length; i++) {
        data[i] = (i % 2 === 0) ? 20 : 230;
      }
      assert.equal(hasSufficientImageContrast(data), true);
    });

    it('Cenário 2 (Edge Case): imagem 100% preta ou 100% branca (variância nula) é detectada para evitar OCR inútil', () => {
      // Imagem 100% preta
      const solidBlack = new Uint8Array(100).fill(0);
      assert.equal(hasSufficientImageContrast(solidBlack), false);

      // Imagem 100% branca
      const solidWhite = new Uint8Array(100).fill(255);
      assert.equal(hasSufficientImageContrast(solidWhite), false);
    });

    it('Cenário 3 (Error Path): buffers nulos, indefinidos ou de tamanho insuficiente retornam false com segurança', () => {
      assert.equal(hasSufficientImageContrast(null), false);
      assert.equal(hasSufficientImageContrast(undefined), false);
      assert.equal(hasSufficientImageContrast(new Uint8Array(2)), false);
      assert.equal(hasSufficientImageContrast([]), false);
    });
  });
});
