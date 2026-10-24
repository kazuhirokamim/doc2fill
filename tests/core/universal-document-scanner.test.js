// @tear-proof issue-1
// tests/core/universal-document-scanner.test.js
// Suíte TDD - Motor de Varredura Universal de Documentos Fiscais & Resiliência OCR
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseDocumentFields, normalizeCanonicalDocumentFields } from '../../core/document-parser.js';
import { extractLineItemsFromText } from '../../core/item-extractor.js';
import { cleanOcrText, processOcrText } from '../../core/ocr-engine.js';
import { classifyDocumentType } from '../../core/classifier.js';

describe('Motor de Varredura Universal de Documentos (TDD)', () => {
  // -------------------------------------------------------------
  // Cenário 1 (Happy Path): Extração completa de tipos fiscais heterogêneos
  // -------------------------------------------------------------
  it('Cenário 1.1 (Happy Path - Cupom Fiscal): extrai valores e itens de cupom fiscal com códigos tributários T04/F1', () => {
    const rawCupomText = `
LOJAS
AV.
CNPJ:                              IE:
 /  /       :  :      CCF:         COO:
        CUPOM FISCAL
ITEM CÓDIGO      DESCRIÇÃO
QTD. UN. VL.UNIT( R$) ST IAT VL.ITEM( R$)
001 530236310   Blusa n3 4
    1,000Un x     89,90 T04  A       89,90
002 520196220   PERFUME PA
    1,000Un x    199,00 F1   A      199,00
TOTAL           R$                  288,90
Dinheiro                            288,90
T04=17,00%
MD5:1b94ecab054d01b1fd8ac75ed0e3d9f1
Total Impostos Pagos R$ 116,56 (40,35%) Fonte: IBPT
    `.trim();

    const parsed = processOcrText(rawCupomText, 'cupom_exemplo.png');
    const canonical = normalizeCanonicalDocumentFields(parsed);

    // 8 Campos canônicos imutáveis
    assert.ok(canonical.tipo_documento.includes('Cupom'), 'Deve classificar como Cupom Fiscal');
    assert.strictEqual(canonical.valor, '288,90', 'Deve extrair o valor total de 288,90');
    assert.strictEqual(canonical.valorNumerico, 288.9, 'Valor numérico normalizado');
    assert.ok(canonical.descritivo.includes('Aquisição de insumos'), 'Descritivo de cupom fiscal gerado');
    assert.ok(canonical.motivo.includes('pronto pagamento') || canonical.motivo.includes('CCHA'), 'Motivo justificado');

    // Validação de itens com códigos tributários intermediários
    const items = extractLineItemsFromText(rawCupomText);
    assert.strictEqual(items.length, 2, 'Deve extrair exatamente os 2 itens do cupom');
    assert.strictEqual(items[0].description, 'Blusa n3 4');
    assert.strictEqual(items[0].totalPrice, 89.9);
    assert.strictEqual(items[1].description, 'PERFUME PA');
    assert.strictEqual(items[1].totalPrice, 199.0);
  });

  it('Cenário 1.2 (Happy Path - Nota Fiscal de Serviços NFS-e): extrai prestador, tomador, número, data e valor', () => {
    const rawNfseText = `
PREFEITURA MUNICIPAL DE SÃO PAULO
NOTA FISCAL ELETRÔNICA DE SERVIÇOS - NFS-e
Número da Nota: 202604812
Data de Emissão: 15/10/2026
Código de Verificação: 7A9B-4C2D

PRESTADOR DE SERVIÇOS
Razão Social: TECH CONSULTORIA E SISTEMAS LTDA
CNPJ: 18.234.567/0001-89
Inscrição Municipal: 4.891.203-1

TOMADOR DE SERVIÇOS
Nome: ADVOCACIA GERAL DA UNIÃO
CPF/CNPJ: 00.394.452/0001-03

DISCRIMINAÇÃO DOS SERVIÇOS
Desenvolvimento de módulos de interoperabilidade e sustentação técnica de infraestrutura.
VALOR TOTAL DOS SERVIÇOS: R$ 4.750,00
VALOR LÍQUIDO DA NOTA: R$ 4.750,00
    `.trim();

    const parsed = processOcrText(rawNfseText, 'nfse_servicos.pdf');
    const canonical = normalizeCanonicalDocumentFields(parsed);

    assert.ok(canonical.tipo_documento.includes('Nota Fiscal'), 'Classifica como Nota Fiscal');
    assert.strictEqual(canonical.cpf_cnpj, '18.234.567/0001-89', 'CNPJ do prestador extraído');
    assert.strictEqual(canonical.fornecedor, 'TECH CONSULTORIA E SISTEMAS LTDA', 'Razão social extraída');
    assert.strictEqual(canonical.numero_documento, '202604812', 'Número da nota extraído');
    assert.strictEqual(canonical.data, '2026-10-15', 'Data da nota normalizada para AAAA-MM-DD');
    assert.strictEqual(canonical.valor, '4.750,00', 'Valor formatado pt-BR');
    assert.strictEqual(canonical.valorNumerico, 4750.0, 'Valor numérico em float');
  });

  it('Cenário 1.3 (Happy Path - Boleto Bancário): extrai cedente, linha digitável, vencimento e valor cobrado', () => {
    const rawBoletoText = `
BANCO BRADESCO S.A. | 237-2 | 23793.38128 60000.000004 01000.654321 9 95000000125000
BENEFICIÁRIO: CENTRO CLINICO DE DIAGNOSTICOS MEDICOS S/A
CNPJ/CPF: 02.456.789/0001-30
PAGADOR: CONSELHO CURADOR DE HONORARIOS ADVOCATICIOS
VENCIMENTO: 28/10/2026
VALOR DO DOCUMENTO: R$ 1.250,00
VALOR COBRADO: R$ 1.250,00
DOCUMENTO: 8847120
    `.trim();

    const parsed = processOcrText(rawBoletoText, 'boleto_outubro.pdf');
    const canonical = normalizeCanonicalDocumentFields(parsed);

    assert.ok(canonical.tipo_documento.includes('Boleto') || canonical.tipo_documento.includes('Comprovante'), 'Identifica tipo Boleto');
    assert.strictEqual(canonical.cpf_cnpj, '02.456.789/0001-30');
    assert.ok(canonical.fornecedor.includes('CENTRO CLINICO'));
    assert.strictEqual(canonical.data, '2026-10-28');
    assert.strictEqual(canonical.valor, '1.250,00');
    assert.strictEqual(canonical.valorNumerico, 1250.0);
  });

  it('Cenário 1.4 (Happy Path - Fatura Concessionária): extrai concessionária, vencimento, código e valor', () => {
    const rawFaturaText = `
ENEL DISTRIBUIÇÃO SÃO PAULO
FATURA DE ENERGIA ELÉTRICA
CNPJ: 61.695.227/0001-93
INSTALAÇÃO: 0048192019
MÊS DE REFERÊNCIA: 10/2026
VENCIMENTO: 25/10/2026
TOTAL A PAGAR: R$ 342,85
    `.trim();

    const parsed = processOcrText(rawFaturaText, 'fatura_enel.pdf');
    const canonical = normalizeCanonicalDocumentFields(parsed);

    assert.ok(canonical.tipo_documento.includes('Fatura') || canonical.tipo_documento.includes('Concessionária'));
    assert.strictEqual(canonical.cpf_cnpj, '61.695.227/0001-93');
    assert.ok(canonical.fornecedor.includes('ENEL'));
    assert.strictEqual(canonical.valor, '342,85');
    assert.strictEqual(canonical.data, '2026-10-25');
  });

  it('Cenário 1.5 (Happy Path - Comprovante PIX): extrai recebedor, chave pix, ID de transação e valor', () => {
    const rawPixText = `
COMPROVANTE DE TRANSFERÊNCIA PIX
BANCO INTER S.A.
ID DA TRANSAÇÃO: E00416968202610241200ABCD1234EF
DATA E HORA: 24/10/2026 - 11:32:05
VALOR: R$ 180,00

RECEBEDOR: PAPELARIA E COPIADORA CENTRAL LTDA
CNPJ: 07.891.234/0001-55
CHAVE PIX: financeiro@papelariacentral.com.br
AUTENTICAÇÃO BANCÁRIA: 8A7B9C0D1E2F3G4H5I6J
    `.trim();

    const parsed = processOcrText(rawPixText, 'comprovante_pix.png');
    const canonical = normalizeCanonicalDocumentFields(parsed);

    assert.ok(canonical.tipo_documento.includes('Comprovante') || canonical.tipo_documento.includes('PIX'));
    assert.strictEqual(canonical.cpf_cnpj, '07.891.234/0001-55');
    assert.strictEqual(canonical.fornecedor, 'PAPELARIA E COPIADORA CENTRAL LTDA');
    assert.strictEqual(canonical.valor, '180,00');
    assert.strictEqual(canonical.data, '2026-10-24');
    assert.ok(canonical.numero_documento.includes('8A7B9C') || canonical.numero_documento.includes('E00416'));
  });

  // -------------------------------------------------------------
  // Cenário 2 (Edge Case): Campos ausentes, dados parciais e ruído óptico
  // -------------------------------------------------------------
  it('Cenário 2.1 (Edge Case - Documento de Homologação com campos em branco): não fabrica CNPJ/Data vazios e captura valor', () => {
    // Exatamente como o cupom real da foto onde CNPJ e Data são / / e CNPJ: sem dígitos
    const emptyFieldsText = `
LOJAS
AV.
CNPJ:                              IE:
 /  /       :  :      CCF:         COO:
CUPOM FISCAL
TOTAL R$ 288,90
Dinheiro 288,90
    `.trim();

    const parsed = parseDocumentFields(emptyFieldsText, 'foto_sem_cnpj_nem_data.png');
    const canonical = normalizeCanonicalDocumentFields(parsed);

    // CNPJ e Data devem ser vazios sem inventar dígitos
    assert.strictEqual(canonical.cpf_cnpj, '', 'CNPJ deve ser vazio pois não há dígitos');
    assert.strictEqual(canonical.data, '', 'Data deve ser vazia pois as barras estão sem números');
    // Mas o valor DEVE ser extraído
    assert.strictEqual(canonical.valor, '288,90', 'Valor deve ser extraído com precisão');
    assert.strictEqual(canonical.valorNumerico, 288.9);
  });

  it('Cenário 2.2 (Edge Case - Formatações heterogêneas de totalizador): suporta DINHEIRO, CARTÃO e TOTAL A PAGAR', () => {
    const textA = 'CUPOM FISCAL\nSUBTOTAL: 150,00\nDINHEIRO: 150,00';
    const parsedA = parseDocumentFields(textA, 'recibo.jpg');
    assert.strictEqual(normalizeCanonicalDocumentFields(parsedA).valor, '150,00');

    const textB = 'NOTA DE VENDA AO CONSUMIDOR\nVALOR A PAGAR R$ 98,50\nCARTAO DE CREDITO';
    const parsedB = parseDocumentFields(textB, 'recibo.jpg');
    assert.strictEqual(normalizeCanonicalDocumentFields(parsedB).valor, '98,50');

    const textC = 'DANFE SIMPLIFICADA\nTOTAL LIQUIDO R$ 1.450,20';
    const parsedC = parseDocumentFields(textC, 'recibo.jpg');
    assert.strictEqual(normalizeCanonicalDocumentFields(parsedC).valor, '1.450,20');
  });

  // -------------------------------------------------------------
  // Cenário 3 (Error Path): Resiliência total contra entradas corrompidas
  // -------------------------------------------------------------
  it('Cenário 3.1 (Error Path): payload nulo ou texto vazio retorna estrutura canônica sem quebras', () => {
    const emptyParsed = parseDocumentFields('', '');
    const canonical = normalizeCanonicalDocumentFields(emptyParsed);

    assert.strictEqual(canonical.tipo_documento, 'Outro Comprovante');
    assert.strictEqual(canonical.cpf_cnpj, '');
    assert.strictEqual(canonical.fornecedor, '');
    assert.strictEqual(canonical.numero_documento, '');
    assert.strictEqual(canonical.data, '');
    assert.strictEqual(canonical.valor, '');
    assert.strictEqual(canonical.valorNumerico, 0);
    assert.strictEqual(canonical.descritivo, '');
    assert.strictEqual(canonical.motivo, '');
    assert.deepStrictEqual(canonical.items, []);
  });
});
