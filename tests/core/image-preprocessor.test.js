// tests/core/image-preprocessor.test.js
// Suíte TDD para Preprocessamento de Imagens, Detecção EXIF e Auto-Deskew Angular

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  detectExifOrientation,
  getRotationDegreesFromOrientation,
  estimateSkewAngleFromProjection,
  calculateRotatedDimensions
} from '../../core/image-preprocessor.js';

describe('core/image-preprocessor.js - Preprocessamento e Auto-Deskew (TDD)', () => {
  describe('detectExifOrientation', () => {
    it('Cenário 1 (Happy Path): deve identificar orientação EXIF 6 (90 graus) em JPEG sintético', () => {
      // Constrói um cabeçalho JPEG mínimo com APP1 e tag TIFF 0x0112 (Orientation = 6)
      const buffer = new Uint8Array([
        0xFF, 0xD8, // SOI
        0xFF, 0xE1, // APP1
        0x00, 0x22, // Tamanho do bloco APP1 (34 bytes)
        0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // "Exif\0\0"
        0x49, 0x49, 0x2A, 0x00, // Header TIFF Little-Endian (II)
        0x08, 0x00, 0x00, 0x00, // Offset do IFD0 (8)
        0x01, 0x00, // Número de tags (1)
        0x12, 0x01, // Tag 0x0112 (Orientation)
        0x03, 0x00, // Tipo SHORT
        0x01, 0x00, 0x00, 0x00, // Contagem 1
        0x06, 0x00, 0x00, 0x00, // Valor 6 (Rotate 90 CW)
        0x00, 0x00, 0x00, 0x00  // Próximo IFD offset
      ]);

      const orientation = detectExifOrientation(buffer);
      assert.equal(orientation, 6);
    });

    it('Cenário 1.2 (Happy Path Big-Endian): deve identificar orientação EXIF 3 (180 graus) em JPEG Big-Endian', () => {
      const buffer = new Uint8Array([
        0xFF, 0xD8, // SOI
        0xFF, 0xE1, // APP1
        0x00, 0x22, // Tamanho do bloco APP1
        0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // "Exif\0\0"
        0x4D, 0x4D, 0x00, 0x2A, // Header TIFF Big-Endian (MM)
        0x00, 0x00, 0x00, 0x08, // Offset IFD0 (8)
        0x00, 0x01, // 1 tag
        0x01, 0x12, // Tag Orientation 0x0112
        0x00, 0x03, // Tipo SHORT
        0x00, 0x00, 0x00, 0x01, // Contagem 1
        0x00, 0x03, 0x00, 0x00, // Valor 3 (Rotate 180)
        0x00, 0x00, 0x00, 0x00
      ]);

      const orientation = detectExifOrientation(buffer);
      assert.equal(orientation, 3);
    });

    it('Cenário 2 (Edge Case): retorna 1 (sem rotação) para JPEG sem marcador EXIF ou PNG', () => {
      const plainJpeg = new Uint8Array([0xFF, 0xD8, 0xFF, 0xDB, 0x00, 0x43, 0x00]);
      assert.equal(detectExifOrientation(plainJpeg), 1);

      const png = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      assert.equal(detectExifOrientation(png), 1);
    });

    it('Cenário 3 (Error Path): lida com buffer nulo, vazio ou truncado com segurança', () => {
      assert.equal(detectExifOrientation(null), 1);
      assert.equal(detectExifOrientation(undefined), 1);
      assert.equal(detectExifOrientation(new Uint8Array(0)), 1);
      assert.equal(detectExifOrientation('string-invalida'), 1);
    });
  });

  describe('getRotationDegreesFromOrientation', () => {
    it('Cenário 1 (Happy Path): mapeia orientações canônicas EXIF para graus de rotação corretos', () => {
      assert.equal(getRotationDegreesFromOrientation(1), 0);
      assert.equal(getRotationDegreesFromOrientation(3), 180);
      assert.equal(getRotationDegreesFromOrientation(6), 90);
      assert.equal(getRotationDegreesFromOrientation(8), 270);
    });

    it('Cenário 2 (Edge Case): orientações espelhadas ou não usuais retornam 0 ou grau base', () => {
      assert.equal(getRotationDegreesFromOrientation(2), 0);
      assert.equal(getRotationDegreesFromOrientation(99), 0);
    });

    it('Cenário 3 (Error Path): entradas inválidas, nulas ou negativas retornam 0', () => {
      assert.equal(getRotationDegreesFromOrientation(null), 0);
      assert.equal(getRotationDegreesFromOrientation(-1), 0);
      assert.equal(getRotationDegreesFromOrientation('abc'), 0);
    });
  });

  describe('estimateSkewAngleFromProjection', () => {
    it('Cenário 1 (Happy Path): estima com precisão a inclinação angular de linhas horizontais', () => {
      const width = 100;
      const height = 100;
      // Cria imagem com 3 linhas pretas horizontais perfeitamente alinhadas (0 graus)
      const pixels = new Uint8Array(width * height); // 0 = branco, 1 = preto
      for (const y of [20, 50, 80]) {
        for (let x = 10; x < 90; x++) {
          pixels[y * width + x] = 1;
        }
      }

      const angle = estimateSkewAngleFromProjection(pixels, width, height, -10, 10, 1);
      assert.equal(angle, 0);
    });

    it('Cenário 1.2 (Happy Path Inclinado): detecta inclinação positiva em linha sintética inclinada', () => {
      const width = 100;
      const height = 100;
      const pixels = new Uint8Array(width * height);
      // Linha inclinada em aproximadamente ~5 graus: y = 50 + x * tan(5°)
      const rad = 5 * (Math.PI / 180);
      for (let x = 0; x < width; x++) {
        const y = Math.round(50 + (x - 50) * Math.tan(rad));
        if (y >= 0 && y < height) {
          pixels[y * width + x] = 1;
        }
      }

      const angle = estimateSkewAngleFromProjection(pixels, width, height, -10, 10, 1);
      // Deve encontrar entre 4 e 6 graus
      assert.ok(Math.abs(angle - 5) <= 1, `Ângulo detectado foi ${angle}, esperado ~5`);
    });

    it('Cenário 1.3 (Happy Path Passo Fracionário): suporta resolução angular refinada com step fracionário', () => {
      const width = 120;
      const height = 120;
      const pixels = new Uint8Array(width * height);
      for (const y of [30, 60, 90]) {
        for (let x = 15; x < 105; x++) {
          pixels[y * width + x] = 1;
        }
      }
      const angle = estimateSkewAngleFromProjection(pixels, width, height, -2, 2, 0.5);
      assert.equal(angle, 0);
    });

    it('Cenário 2 (Edge Case): imagem vazia (sem linhas) ou totalmente preta retorna 0', () => {
      const width = 50;
      const height = 50;
      const emptyPixels = new Uint8Array(width * height);
      assert.equal(estimateSkewAngleFromProjection(emptyPixels, width, height), 0);

      const solidPixels = new Uint8Array(width * height).fill(1);
      assert.equal(estimateSkewAngleFromProjection(solidPixels, width, height), 0);
    });

    it('Cenário 3 (Error Path): entradas com dimensões inválidas ou nulas retornam 0', () => {
      assert.equal(estimateSkewAngleFromProjection(null, 100, 100), 0);
      assert.equal(estimateSkewAngleFromProjection(new Uint8Array(10), 0, 10), 0);
      assert.equal(estimateSkewAngleFromProjection(new Uint8Array(10), 10, -5), 0);
    });
  });

  describe('calculateRotatedDimensions', () => {
    it('Cenário 1 (Happy Path): calcula novas dimensões de bounding box para rotação de 90 e 45 graus', () => {
      const dim90 = calculateRotatedDimensions(100, 200, 90);
      assert.equal(dim90.width, 200);
      assert.equal(dim90.height, 100);

      const dim0 = calculateRotatedDimensions(100, 200, 0);
      assert.equal(dim0.width, 100);
      assert.equal(dim0.height, 200);
    });

    it('Cenário 2 (Edge Case): rotação de 180 graus preserva largura e altura', () => {
      const dim180 = calculateRotatedDimensions(120, 80, 180);
      assert.equal(dim180.width, 120);
      assert.equal(dim180.height, 80);
    });

    it('Cenário 3 (Error Path): dimensões inválidas ou nulas retornam defaults seguros', () => {
      const invalid = calculateRotatedDimensions(0, -10, 45);
      assert.equal(invalid.width, 0);
      assert.equal(invalid.height, 0);
    });
  });
});
