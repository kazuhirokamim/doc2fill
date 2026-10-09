// @tear-proof issue-1
// tests/core/layout-parser.test.js
// Suíte TDD para o Módulo de Extração Layout-Aware e Chunking Parent-Child (Tear & Noesis)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  clusterWordsIntoLayoutLines,
  detectAndFormatMarkdownTable,
  createLayoutAwareChunks
} from '../../core/layout-parser.js';

describe('doc2fill Layout-Aware Parser & Parent-Child Chunking (TDD Suite)', () => {
  describe('clusterWordsIntoLayoutLines', () => {
    it('Cenário 1 (Happy Path): agrupa palavras dispersas no mesmo alinhamento vertical e ordena da esquerda para a direita', () => {
      // Simula palavras extraídas por OCR com coordenadas em duas linhas
      const rawWords = [
        { text: 'CNPJ:', bbox: { x0: 10, y0: 20, x1: 50, y1: 35 }, confidence: 95 },
        { text: 'DROGARIA', bbox: { x0: 180, y0: 22, x1: 250, y1: 36 }, confidence: 92 },
        { text: '40.127.407/0001-30', bbox: { x0: 55, y0: 21, x1: 170, y1: 35 }, confidence: 96 },
        { text: 'VALOR', bbox: { x0: 10, y0: 60, x1: 60, y1: 75 }, confidence: 90 },
        { text: 'TOTAL:', bbox: { x0: 65, y0: 60, x1: 110, y1: 75 }, confidence: 91 },
        { text: 'R$ 68,68', bbox: { x0: 200, y0: 59, x1: 260, y1: 76 }, confidence: 98 }
      ];

      const lines = clusterWordsIntoLayoutLines(rawWords, 8);
      assert.equal(lines.length, 2, 'Deve identificar 2 linhas distintas');
      assert.equal(lines[0].lineText, 'CNPJ: 40.127.407/0001-30 DROGARIA');
      assert.equal(lines[1].lineText, 'VALOR TOTAL: R$ 68,68');
    });

    it('Cenário 2 (Edge Case): tolera pequenas variações de rotação e palavras sem bbox completas', () => {
      const noisyWords = [
        { text: 'Linha', bbox: { x0: 10, y0: 10, x1: 40, y1: 25 } },
        { text: 'Inclinada', bbox: { x0: 45, y0: 14, x1: 90, y1: 29 } }, // Delta y = 4 (dentro da tolerância 8)
        { text: 'Segunda', bbox: { x0: 10, y0: 40, x1: 50, y1: 55 } }
      ];

      const lines = clusterWordsIntoLayoutLines(noisyWords, 8);
      assert.equal(lines.length, 2);
      assert.equal(lines[0].lineText, 'Linha Inclinada');
      assert.equal(lines[1].lineText, 'Segunda');
    });

    it('Cenário 3 (Error Path): lida com entrada nula, vazia ou inválida sem lançar exceção', () => {
      assert.deepEqual(clusterWordsIntoLayoutLines(null), []);
      assert.deepEqual(clusterWordsIntoLayoutLines([]), []);
      assert.deepEqual(clusterWordsIntoLayoutLines('não-array'), []);
    });
  });

  describe('detectAndFormatMarkdownTable', () => {
    it('Cenário 1 (Happy Path): converte linhas de itens fiscais em tabela Markdown estruturada', () => {
      const lines = [
        'CÓDIGO DESCRIÇÃO QTD VL_UNIT VL_TOTAL',
        '001 PANT_SEC_5 1 78,05 68,68',
        '002 VITAMINA_C 2 15,00 30,00'
      ];

      const tableMarkdown = detectAndFormatMarkdownTable(lines);
      assert.ok(tableMarkdown.includes('| CÓDIGO | DESCRIÇÃO | QTD | VL_UNIT | VL_TOTAL |'));
      assert.ok(tableMarkdown.includes('| --- | --- | --- | --- | --- |'));
      assert.ok(tableMarkdown.includes('| 001 | PANT_SEC_5 | 1 | 78,05 | 68,68 |'));
      assert.ok(tableMarkdown.includes('| 002 | VITAMINA_C | 2 | 15,00 | 30,00 |'));
    });

    it('Cenário 2 (Edge Case): ignora texto narrativo que não possua estrutura tabular', () => {
      const narrativeLines = [
        'CONSELHO CURADOR DOS HONORÁRIOS ADVOCATÍCIOS',
        'Requerimento submetido pelo Dr. Lucas em favor da União.',
        'Atuação processual no TRF1.'
      ];

      const tableMarkdown = detectAndFormatMarkdownTable(narrativeLines);
      assert.equal(tableMarkdown, '', 'Texto não tabular deve retornar string vazia');
    });

    it('Cenário 3 (Error Path): lida graciosamente com entrada nula ou indefinida', () => {
      assert.equal(detectAndFormatMarkdownTable(null), '');
      assert.equal(detectAndFormatMarkdownTable([]), '');
    });
  });

  describe('createLayoutAwareChunks', () => {
    it('Cenário 1 (Happy Path): gera chunks hierárquicos Parent-Child mapeando seções do documento', () => {
      const documentText = `
        DROGARIA POPULAR LTDA - CNPJ: 12.345.678/0001-90
        NOTA FISCAL DE CONSUMIDOR ELETRÔNICA - NFC-e Nº 00045821
        CHAVE DE ACESSO: 35260912345678000190650010000458211839201924
        
        ITENS DA NOTA:
        CÓDIGO DESCRIÇÃO QTD VL_UNIT VL_TOTAL
        001 MEDICAMENTO_A 1 45,00 45,00
        
        TOTAIS:
        VALOR TOTAL R$ 45,00
        FORMA DE PAGAMENTO: CARTÃO
      `;

      const chunks = createLayoutAwareChunks(documentText);
      assert.ok(Array.isArray(chunks));
      assert.ok(chunks.length >= 3, 'Deve gerar no mínimo 3 seções lógicas');

      const headerChunk = chunks.find(c => c.section === 'HEADER_FISCAL');
      assert.ok(headerChunk);
      assert.ok(headerChunk.parentText.includes('DROGARIA POPULAR'));
      assert.ok(headerChunk.children.some(child => child.key === 'CNPJ'));

      const itemsChunk = chunks.find(c => c.section === 'ITEMS_TABLE');
      assert.ok(itemsChunk);
      assert.ok(itemsChunk.parentText.includes('MEDICAMENTO_A'));

      const totalsChunk = chunks.find(c => c.section === 'TOTALS_PAYMENT');
      assert.ok(totalsChunk);
      assert.ok(totalsChunk.children.some(child => child.key === 'VALOR_TOTAL'));
    });

    it('Cenário 2 (Edge Case): documento compacto com poucas linhas preserva contexto único com filhos mapeados', () => {
      const shortText = 'Recibo de Honorários Advocatícios - Valor R$ 5.000,00 - Data: 2026-09-01';
      const chunks = createLayoutAwareChunks(shortText);
      assert.ok(chunks.length >= 1);
      assert.equal(chunks[0].section, 'GENERAL_RECEIPT');
      assert.ok(chunks[0].children.length >= 1);
    });

    it('Cenário 3 (Error Path): lida com texto vazio ou nulo com segurança', () => {
      assert.deepEqual(createLayoutAwareChunks(null), []);
      assert.deepEqual(createLayoutAwareChunks(''), []);
    });
  });
});
