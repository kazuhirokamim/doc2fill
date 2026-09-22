import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { classifyDocumentType, DOCUMENT_TYPES } from '../../core/classifier.js';

describe('doc2fill Document Type Classifier (TDD Suite)', () => {
  describe('classifyDocumentType', () => {
    it('Cenário 1 (Happy Path): identifica corretamente Nota Fiscal, Recibo, Boleto e Guia Médica', () => {
      // 1. Nota Fiscal de Serviço
      const nfText = 'PREFEITURA MUNICIPAL DE SÃO PAULO - NOTA FISCAL ELETRÔNICA DE SERVIÇOS - NFS-e Nº 00123';
      const resNf = classifyDocumentType(nfText);
      assert.equal(resNf.type, DOCUMENT_TYPES.NFSE);
      assert.equal(resNf.label, 'Nota Fiscal de Serviços (NFS-e)');

      // 2. Recibo de Profissional Liberal (CRM/CRO)
      const reciboText = 'RECIBO DE PAGAMENTO AUTÔNOMO - Dr. Carlos Silva - CRM/SP 123456 - CPF 123.456.789-00';
      const resRecibo = classifyDocumentType(reciboText);
      assert.equal(resRecibo.type, DOCUMENT_TYPES.RECIBO);
      assert.equal(resRecibo.label, 'Recibo Profissional Liberal');

      // 3. Boleto Bancário
      const boletoText = 'BANCO BRADESCO S.A. - RECIBO DO SACADO - LINHA DIGITÁVEL 23793.38128 60083.012345 67000.000000 1 900000001000';
      const resBoleto = classifyDocumentType(boletoText);
      assert.equal(resBoleto.type, DOCUMENT_TYPES.BOLETO);
      assert.equal(resBoleto.label, 'Boleto / Comprovante Bancário');

      // 4. Guia TISS/TUSS
      const guiaText = 'PADRÃO TISS - GUIA DE SERVIÇO PROFISSIONAL / SERVIÇO AUXILIAR DE DIAGNÓSTICO E TERAPIA (SP/SADT)';
      const resGuia = classifyDocumentType(guiaText);
      assert.equal(resGuia.type, DOCUMENT_TYPES.GUIA);
      assert.equal(resGuia.label, 'Guia Médica (TISS/TUSS)');
    });

    it('Cenário 2 (Edge Case): identifica documento por metadados de arquivo (nome do arquivo) ou texto reduzido', () => {
      // Por nome de arquivo
      const resByName = classifyDocumentType('', 'recibo_honorarios_dr_marcos.pdf');
      assert.equal(resByName.type, DOCUMENT_TYPES.RECIBO);

      const resDanfe = classifyDocumentType('', 'danfe_nota_fiscal_33000.pdf');
      assert.equal(resDanfe.type, DOCUMENT_TYPES.NFSE);
    });

    it('Cenário 3 (Error Path): lida com conteúdo vazio ou não identificável retornando tipo genérico com segurança', () => {
      const resNull = classifyDocumentType(null, null);
      assert.equal(resNull.type, DOCUMENT_TYPES.OUTROS);
      assert.equal(resNull.label, 'Outro Comprovante');

      const resEmpty = classifyDocumentType('', '');
      assert.equal(resEmpty.type, DOCUMENT_TYPES.OUTROS);

      const resUnknown = classifyDocumentType('texto aleatório que não parece documento fiscal');
      assert.equal(resUnknown.type, DOCUMENT_TYPES.OUTROS);
    });
  });
});
