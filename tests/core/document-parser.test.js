// @tear-proof issue-1
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractTextFromPdfContent, parseDocumentFields } from '../../core/document-parser.js';

describe('doc2fill Document Parser & Extractor Engine (TDD Suite)', () => {
  describe('parseDocumentFields', () => {
    it('Cenário 1 (Happy Path): extrai campos completos de requerimento CCHA (Processo, CPF, Valor, Nome)', () => {
      const docText = `
        CONSELHO CURADOR DOS HONORÁRIOS ADVOCATÍCIOS - CCHA
        REQUERIMENTO DE RATEIO DE HONORÁRIOS SUCUMBENCIAIS
        Requerente: Dr. Lucas Silva
        Carreira: Advogado da União - AGU
        CPF: 123.456.789-00  SIAPE: 1984521
        Processo Judicial: 0045821-44.2026.4.01.3400
        Valor: R$ 14.850,00
        Data: 25/09/2026
        Banco do Brasil Agência: 3380-4 Conta: 45210-9
        PIX: lucas.silva@agu.gov.br
      `;

      const parsed = parseDocumentFields(docText, 'requerimento_ccha_honorarios.pdf');
      assert.equal(parsed.processo, '0045821-44.2026.4.01.3400');
      assert.equal(parsed.cpf, '123.456.789-00');
      assert.equal(parsed.matricula, '1984521');
      assert.equal(parsed.valor, 'R$ 14.850,00');
      assert.equal(parsed.data, '2026-09-25');
      assert.equal(parsed.razao, 'Lucas Silva');
      assert.equal(parsed.beneficiario, 'Advogado da União (AGU)');
      assert.equal(parsed.banco, 'BANCO DO BRASIL');
      assert.equal(parsed.agencia, '3380-4');
      assert.equal(parsed.conta, '45210-9');
      assert.equal(parsed.pix, 'lucas.silva@agu.gov.br');
    });

    it('Cenário 2 (Edge Case): infere campos a partir do nome do arquivo quando o texto for reduzido', () => {
      const parsed = parseDocumentFields('', 'PGFN_Honorarios_CPF_98765432100_Valor_5400,00.pdf');
      assert.equal(parsed.beneficiario, 'Procurador da Fazenda Nacional (PGFN)');
      assert.equal(parsed.cpf, '987.654.321-00');
      assert.equal(parsed.valor, 'R$ 5400,00');
    });

    it('Cenário 3 (Error Path): lida com texto vazio ou nulo sem lançar exceção', () => {
      const parsedNull = parseDocumentFields(null, null);
      assert.deepEqual(parsedNull, {});

      const parsedEmpty = parseDocumentFields('', '');
      assert.deepEqual(parsedEmpty, {});
    });
  });

  describe('extractTextFromPdfContent', () => {
    it('Cenário 1 (Happy Path): extrai strings de comandos Tj do PDF', () => {
      const pdfMock = 'BT /F1 12 Tf (Requerimento CCHA) Tj (Dr. Lucas) Tj ET';
      const extracted = extractTextFromPdfContent(pdfMock);
      assert.ok(extracted.includes('Requerimento CCHA'));
      assert.ok(extracted.includes('Dr. Lucas'));
    });

    it('Cenário 2 (Edge Case): lida com ArrayBuffer de entrada decodificando corretamente', () => {
      const encoder = new TextEncoder();
      const buffer = encoder.encode('(Texto no buffer) Tj').buffer;
      const extracted = extractTextFromPdfContent(buffer);
      assert.ok(extracted.includes('Texto no buffer'));
    });

    it('Cenário 3 (Error Path): retorna string vazia para tipos inválidos', () => {
      assert.equal(extractTextFromPdfContent(null), '');
      assert.equal(extractTextFromPdfContent(undefined), '');
      assert.equal(extractTextFromPdfContent(123), '');
    });
  });
});
