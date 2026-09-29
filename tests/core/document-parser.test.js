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
      assert.equal(parsed.cpf_cnpj, '123.456.789-00');
      assert.equal(parsed.matricula, '1984521');
      assert.equal(parsed.valor, 'R$ 14.850,00');
      assert.equal(parsed.data, '2026-09-25');
      assert.equal(parsed.fornecedor, 'Lucas Silva');
      assert.equal(parsed.razao, 'Lucas Silva');
      assert.equal(parsed.beneficiario, 'Advogado da União (AGU)');
      assert.equal(parsed.banco, 'BANCO DO BRASIL');
      assert.equal(parsed.agencia, '3380-4');
      assert.equal(parsed.conta, '45210-9');
      assert.equal(parsed.pix, 'lucas.silva@agu.gov.br');
      assert.ok(parsed.descritivo && parsed.descritivo.length > 5);
      assert.ok(parsed.motivo && parsed.motivo.length > 5);
    });

    it('Cenário 1.2 (Happy Path): extrai os 8 campos de Nota Fiscal de Serviços com número, fornecedor, CNPJ, valor e data', () => {
      const nfText = `
        PREFEITURA MUNICIPAL DE SÃO PAULO
        NOTA FISCAL ELETRÔNICA DE SERVIÇOS - NFS-e
        Número da Nota: 00045821
        Data de Emissão: 15/08/2026
        PRESTADOR DE SERVIÇOS
        Razão Social: TECNOLOGIA JURÍDICA E PROCESSAMENTO LTDA
        CNPJ: 12.345.678/0001-90
        DISCRIMINAÇÃO DOS SERVIÇOS
        Prestação de serviços de consultoria e suporte técnico processual.
        VALOR TOTAL DA NOTA = R$ 3.450,00
      `;

      const parsed = parseDocumentFields(nfText, 'nfse_00045821.pdf');
      assert.equal(parsed.cpf_cnpj, '12.345.678/0001-90');
      assert.equal(parsed.fornecedor, 'TECNOLOGIA JURÍDICA E PROCESSAMENTO LTDA');
      assert.equal(parsed.numero_documento, '00045821');
      assert.equal(parsed.valor, 'R$ 3.450,00');
      assert.equal(parsed.data, '2026-08-15');
      assert.equal(parsed.tipo_documento, 'Nota Fiscal de Serviços (NFS-e)');
      assert.ok(parsed.descritivo.includes('consultoria') || parsed.descritivo.includes('suporte') || parsed.descritivo.includes('Nota Fiscal'));
      assert.ok(parsed.motivo.includes('CCHA') || parsed.motivo.includes('Reembolso') || parsed.motivo.includes('Prestação de contas'));
    });

    it('Cenário 1.3 (Happy Path): extrai os 8 campos de Cupom Fiscal com número de extrato SAT e CNPJ', () => {
      const cupomText = `
        SUPERMERCADOS BRASIL S/A
        CNPJ: 45.123.789/0001-12
        EXTRATO Nº 00098412 DO CUPOM FISCAL ELETRÔNICO - SAT
        Data: 02/09/2026 14:32:01
        QTD TOTAL DE ITENS 5
        VALOR TOTAL R$ 189,50
      `;

      const parsed = parseDocumentFields(cupomText, 'cupom_sat.png');
      assert.equal(parsed.cpf_cnpj, '45.123.789/0001-12');
      assert.equal(parsed.fornecedor, 'SUPERMERCADOS BRASIL S/A');
      assert.equal(parsed.numero_documento, '00098412');
      assert.equal(parsed.valor, 'R$ 189,50');
      assert.equal(parsed.data, '2026-09-02');
      assert.equal(parsed.tipo_documento, 'Cupom Fiscal (NFC-e / SAT)');
      assert.ok(parsed.descritivo && parsed.descritivo.length > 5);
      assert.ok(parsed.motivo && parsed.motivo.length > 5);
    });

    it('Cenário 1.3.1 (Happy Path - Real Receipt): extrai com fidelidade os 8 campos de cupom fiscal térmico de farmácia (Droga 10 / Drogaria Ribeiro Ltda)', () => {
      const realReceiptText = `
        Rede Popular DROGA 10
        MATRIZ - TAVEIROPOLIS
        CNPJ: 40 727 407/0001-30 DROGARIA RIBEIRO LTDA
        RUA ALBERT SABIN, 1024 VILA TAVEIROPOLIS - CAMPO GRANDE - MS 79090-160
        DOCUMENTO AUXILIAR DA NOTA FISCAL DE CONSUMIDOR ELETRÔNIC
        # Cód Descrição Qtd Un Vl Unit. Vl Total
        001 237004 PANT SEC 5 1 UNID X 78,05 78,05
        Desconto -9,37
        Valor Líquido 68,68
        QTD. TOTAL DE ITENS 001
        VALOR TOTAL R$ 68,68
        Consulte pela Chave de Acesso em http://www.dfe.ms.gov.br/nfce/consulta
        5026 0840 7274 0700 0130 6500 2000 1306 1613 7581 2435
        CONSUMIDOR NÃO IDENTIFICADO
        NFC-e nº 000190616 Série 002
        24/09/2026 13:01:46
      `;

      const parsed = parseDocumentFields(realReceiptText, 'recibo_farmacia.pdf');
      assert.equal(parsed.tipo_documento, 'Cupom Fiscal (NFC-e / SAT)');
      assert.equal(parsed.cpf_cnpj, '40.727.407/0001-30');
      assert.ok(parsed.fornecedor.includes('DROGARIA RIBEIRO') || parsed.fornecedor.includes('DROGA 10'));
      assert.equal(parsed.numero_documento, '000190616');
      assert.equal(parsed.data, '2026-09-24');
      assert.equal(parsed.valor, 'R$ 68,68');
      assert.ok(parsed.descritivo.includes('PANT SEC 5') || parsed.descritivo.includes('insumos') || parsed.descritivo.includes('farmacêuticos') || parsed.descritivo.includes('consumo'));
      assert.ok(parsed.motivo.includes('despesa') || parsed.motivo.includes('CCHA') || parsed.motivo.includes('operacional'));
    });

    it('Cenário 1.4 (Happy Path): extrai os 8 campos de Comprovante de Pagamento PIX', () => {
      const pixText = `
        BANCO DIGITAL S.A.
        COMPROVANTE DE PAGAMENTO PIX
        Transação realizada com sucesso
        Identificador / Protocolo: E202609251845XYZ
        Data da Transação: 25/09/2026
        Valor Pago: R$ 450,00
        Beneficiário / Destinatário: Papelaria e Suprimentos Central
        CNPJ do Destinatário: 98.765.432/0001-09
        Chave PIX: contato@suprimentos.com.br
      `;

      const parsed = parseDocumentFields(pixText, 'comprovante_pix.pdf');
      assert.equal(parsed.cpf_cnpj, '98.765.432/0001-09');
      assert.equal(parsed.fornecedor, 'Papelaria e Suprimentos Central');
      assert.equal(parsed.numero_documento, 'E202609251845XYZ');
      assert.equal(parsed.valor, 'R$ 450,00');
      assert.equal(parsed.data, '2026-09-25');
      assert.equal(parsed.tipo_documento, 'Comprovante de Pagamento');
      assert.ok(parsed.descritivo && parsed.descritivo.length > 5);
      assert.ok(parsed.motivo && parsed.motivo.length > 5);
    });

    it('Cenário 2 (Edge Case): infere campos a partir do nome do arquivo quando o texto for reduzido', () => {
      const parsed = parseDocumentFields('', 'PGFN_Honorarios_CPF_98765432100_Valor_5400,00.pdf');
      assert.equal(parsed.beneficiario, 'Procurador da Fazenda Nacional (PGFN)');
      assert.equal(parsed.cpf, '987.654.321-00');
      assert.equal(parsed.cpf_cnpj, '987.654.321-00');
      assert.equal(parsed.valor, 'R$ 5400,00');
      assert.ok(parsed.descritivo && parsed.descritivo.length > 5);
      assert.ok(parsed.motivo && parsed.motivo.length > 5);
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

    it('Cenário 2.2 (Edge Case): retorna string vazia quando o PDF possui apenas streams compactadas sem texto legível', () => {
      const compressedBinaryMock = '%PDF-1.4\n1 0 obj\n<< /Filter /FlateDecode /Length 40 >>\nstream\nx\x9c\xcbH\xcd\xc9\xc9\x07\x00\x08e\x02k\nendstream\nendobj';
      const extracted = extractTextFromPdfContent(compressedBinaryMock);
      assert.equal(extracted, '');
    });

    it('Cenário 3 (Error Path): retorna string vazia para tipos inválidos', () => {
      assert.equal(extractTextFromPdfContent(null), '');
      assert.equal(extractTextFromPdfContent(undefined), '');
      assert.equal(extractTextFromPdfContent(123), '');
    });
  });
});
