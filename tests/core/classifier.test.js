import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { classifyDocumentType, DOCUMENT_TYPES, DOCUMENT_LABELS } from '../../core/classifier.js';

describe('doc2fill Document Type Classifier (TDD Suite)', () => {
  describe('classifyDocumentType', () => {
    it('Cenário 1 (Happy Path): identifica corretamente todos os 8 tipos documentais requeridos', () => {
      // 1. Nota Fiscal (NFS-e / NF-e / DANFE)
      const nfText = 'PREFEITURA MUNICIPAL DE SÃO PAULO - NOTA FISCAL ELETRÔNICA DE SERVIÇOS - NFS-e Nº 00123';
      const resNf = classifyDocumentType(nfText);
      assert.equal(resNf.type, DOCUMENT_TYPES.NFSE);
      assert.equal(resNf.label, DOCUMENT_LABELS[DOCUMENT_TYPES.NFSE]);

      // 2. Cupom Fiscal (NFC-e / SAT / ECF)
      const cupomText = 'EXTRATO Nº 045129 DO CUPOM FISCAL ELETRÔNICO - SAT - NFC-e CONSUMIDOR';
      const resCupom = classifyDocumentType(cupomText);
      assert.equal(resCupom.type, DOCUMENT_TYPES.CUPOM);
      assert.equal(resCupom.label, DOCUMENT_LABELS[DOCUMENT_TYPES.CUPOM]);

      // 3. Recibo Profissional Liberal / RPA
      const reciboText = 'RECIBO DE PAGAMENTO AUTÔNOMO - Dr. Carlos Silva - CRM/SP 123456 - CPF 123.456.789-00';
      const resRecibo = classifyDocumentType(reciboText);
      assert.equal(resRecibo.type, DOCUMENT_TYPES.RECIBO);
      assert.equal(resRecibo.label, DOCUMENT_LABELS[DOCUMENT_TYPES.RECIBO]);

      // 4. Boleto Bancário
      const boletoText = 'BANCO BRADESCO S.A. - RECIBO DO SACADO - LINHA DIGITÁVEL 23793.38128 60083.012345 67000.000000 1 900000001000';
      const resBoleto = classifyDocumentType(boletoText);
      assert.equal(resBoleto.type, DOCUMENT_TYPES.BOLETO);
      assert.equal(resBoleto.label, DOCUMENT_LABELS[DOCUMENT_TYPES.BOLETO]);

      // 5. Fatura (Concessionária / Cartão / Serviços)
      const faturaText = 'FATURA DE SERVIÇOS DE TELECOMUNICAÇÕES - CONTA MENSAL - VENCIMENTO 10/10/2026';
      const resFatura = classifyDocumentType(faturaText);
      assert.equal(resFatura.type, DOCUMENT_TYPES.FATURA);
      assert.equal(resFatura.label, DOCUMENT_LABELS[DOCUMENT_TYPES.FATURA]);

      // 6. Comprovante de Pagamento (PIX / Transferência Bancária)
      const comprovanteText = 'COMPROVANTE DE PAGAMENTO PIX - TRANSAÇÃO REALIZADA COM SUCESSO - ID E20260925';
      const resComp = classifyDocumentType(comprovanteText);
      assert.equal(resComp.type, DOCUMENT_TYPES.COMPROVANTE);
      assert.equal(resComp.label, DOCUMENT_LABELS[DOCUMENT_TYPES.COMPROVANTE]);

      // 7. Guia Médica TISS/TUSS
      const guiaText = 'PADRÃO TISS - GUIA DE SERVIÇO PROFISSIONAL / SERVIÇO AUXILIAR DE DIAGNÓSTICO E TERAPIA (SP/SADT)';
      const resGuia = classifyDocumentType(guiaText);
      assert.equal(resGuia.type, DOCUMENT_TYPES.GUIA);
      assert.equal(resGuia.label, DOCUMENT_LABELS[DOCUMENT_TYPES.GUIA]);

      // 8. Declaração (Quitação / Serviços / Isenção)
      const declaracaoText = 'DECLARAÇÃO DE QUITAÇÃO ANUAL DE DÉBITOS E PRESTAÇÃO DE SERVIÇOS';
      const resDecl = classifyDocumentType(declaracaoText);
      assert.equal(resDecl.type, DOCUMENT_TYPES.DECLARACAO);
      assert.equal(resDecl.label, DOCUMENT_LABELS[DOCUMENT_TYPES.DECLARACAO]);
    });

    it('Cenário 2 (Edge Case): identifica documento por metadados de arquivo (nome do arquivo) ou texto reduzido', () => {
      // Por nome de arquivo
      const resByName = classifyDocumentType('', 'recibo_honorarios_dr_marcos.pdf');
      assert.equal(resByName.type, DOCUMENT_TYPES.RECIBO);

      const resDanfe = classifyDocumentType('', 'danfe_nota_fiscal_33000.pdf');
      assert.equal(resDanfe.type, DOCUMENT_TYPES.NFSE);

      const resCupom = classifyDocumentType('', 'cupom_fiscal_sat_mercado.png');
      assert.equal(resCupom.type, DOCUMENT_TYPES.CUPOM);

      const resPix = classifyDocumentType('', 'comprovante_pix_transferencia.pdf');
      assert.equal(resPix.type, DOCUMENT_TYPES.COMPROVANTE);

      const resFatura = classifyDocumentType('', 'fatura_cartao_setembro.pdf');
      assert.equal(resFatura.type, DOCUMENT_TYPES.FATURA);

      const resDecl = classifyDocumentType('', 'declaracao_quitacao_ccha.pdf');
      assert.equal(resDecl.type, DOCUMENT_TYPES.DECLARACAO);
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
