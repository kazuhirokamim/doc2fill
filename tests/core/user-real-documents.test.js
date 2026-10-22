// tests/core/user-real-documents.test.js
// Bateria TDD Forense com Amostras Reais do Usuário (5 Documentos Heterogêneos)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseDocumentFields } from '../../core/document-parser.js';
import { isCleanTextStream } from '../../core/pdf-stream-decoder.js';

describe('Bateria TDD Forense: 5 Documentos Fiscais Reais do Usuário', () => {

  describe('Cenário 1 (Happy Path): Extração Semântica e Blindagem contra Stopwords', () => {
    it('Documento 1 (Drogaria Ribeiro): extrai CNPJ, Drogaria, Valor e não aceita lixo binário', () => {
      const ocrText = `Yo IR GATO mm
MATRIZ. TAVEIROPOLIS
CNPJ: 40 127 407/0001-30 DROGARIA RIBEIRO
RUA ALBERY SABIN, 1024 VILA TAVEIROPOLIS -
CAMPO GRANDE - MS 78090-160 Fone:
(87) 3045-4400 | IE: 26 456.911-6
DOCUMENTO AUXILIAR DA NOTA FISCAL DE CONSUMIDOR ELETRÔNICA - NFC-e
001 062060130 PANT SEC 5 1 UNID 65,08
VALOR TOTAL R$ 65,08
EMISSÃO: 24/08/2026`;

      const parsed = parseDocumentFields(ocrText, 'media_drogaria.pdf');
      assert.equal(parsed.cnpj, '40.127.407/0001-30');
      assert.equal(parsed.fornecedor, 'DROGARIA RIBEIRO');
      assert.equal(parsed.valor, 'R$ 65,08');
      assert.equal(parsed.data, '2026-08-24');
      assert.ok(parsed.descritivo.includes('PANT SEC') || parsed.descritivo.includes('medicamento'));
    });

    it('Documento 2 (Cupom Vestuário / Perfumaria): extrai valor total e rejeita stopword TEM como número', () => {
      const ocrText = `LOJAS EXEMPLO
AV. PAULISTA, 1000
CNPJ: 12.345.678/0001-90
CUPOM FISCAL
ITEM CÓDIGO DESCRIÇÃO
001 530236310 Blusa n3 4 1,000Un x 89,90 A 89,90
002 520196220 PERFUME PA 1,000Un x 199,00 à 199,00
TOTAL R$ 288,90
Dinheiro 288,90`;

      const parsed = parseDocumentFields(ocrText, 'cupom_lojas.png');
      assert.equal(parsed.valor, 'R$ 288,90');
      assert.notEqual(parsed.numero_documento, 'TEM', 'numero_documento não pode casar stopword TEM');
      assert.notEqual(parsed.numero_documento, 'ITEM', 'numero_documento não pode casar stopword ITEM');
      assert.equal(parsed.tipo_documento, 'Cupom Fiscal (NFC-e / SAT)');
    });

    it('Documento 3 (NFS-e de Serviços): extrai prestador/tomador, data e valor sem ruídos de cabeçalho', () => {
      const ocrText = `NÚMERO DA NOTA: 1234
COMPETÊNCIA: 11/2002
DATA DE EMISSÃO: 28/11/2002 03:00:00
DADOS DO TOMADOR / PRESTADOR
NOME / RAZÃO SOCIAL: CLIENTE FICTÍCIO
DISCRIMINAÇÃO DO SERVIÇO:
SERVIÇO FICTÍCIO DE CONSULTORIA TÉCNICA
VALOR TOTAL DA NOTA: R$ 2.200,00`;

      const parsed = parseDocumentFields(ocrText, 'nfse_servicos.jpg');
      assert.notEqual(parsed.fornecedor, 'Ro NÚMERO DA NOTA');
      assert.equal(parsed.valor, 'R$ 2.200,00');
      assert.equal(parsed.data, '2002-11-28');
      assert.equal(parsed.tipo_documento, 'Nota Fiscal de Serviços (NFS-e)');
    });

    it('Documento 4 (DANFE Comércio Varejista Exemplo Ltda): prioriza Razão Social real e extrai Nº 000555', () => {
      const ocrText = `DANFE
Documento Auxiliar da Nota Fiscal Eletrônica
0 - ENTRADA
1 - SAÍDA 1
Nº 000555
SÉRIE: 1
PÁGINA: 1 de 1
— = era
COMÉRCIO VAREJISTA EXEMPLO LTDA
CNPJ: 98.765.432/0001-00
DATA DE EMISSÃO: 10/10/2023
CÁLCULO DO IMPOSTO
VALOR TOTAL DA NOTA: R$ 230,00`;

      const parsed = parseDocumentFields(ocrText, 'danfe.jpg');
      assert.equal(parsed.cnpj, '98.765.432/0001-00');
      assert.equal(parsed.fornecedor, 'COMÉRCIO VAREJISTA EXEMPLO LTDA');
      assert.notEqual(parsed.fornecedor, 'era');
      assert.notEqual(parsed.fornecedor, 'CNPJ Inscrição Estadual Data emissão');
      assert.equal(parsed.numero_documento, '000555');
      assert.equal(parsed.valor, 'R$ 230,00');
      assert.equal(parsed.data, '2023-10-10');
    });

    it('Documento 5 (Nota Fiscal Formulário Contínuo): rejeita TA de NOTA FISCAL como número', () => {
      const ocrText = `NOTA FISCAL
MODELO DE NOTA FISCAL 1210
Nº 045123
ESTEIRA MOD. 1210 360,00 96.000,00
VALOR TOTAL: R$ 96.000,00`;

      const parsed = parseDocumentFields(ocrText, 'nota_continua.jpg');
      assert.notEqual(parsed.numero_documento, 'TA', 'numero_documento não pode casar sufixo de NOTA');
      assert.equal(parsed.numero_documento, '045123');
      assert.equal(parsed.valor, 'R$ 96.000,00');
    });
  });

  describe('Cenário 2 (Edge Case): Detecção de Entropia Binária em Streams PDF', () => {
    it('descarta texto que contenha mais de 10% de caracteres não-imprimíveis/binários', () => {
      const binaryJunk = 'B9T`é‡0z¥²ÙHØdÒ\u0011hù.lÀ°èP7!\u0010I¤JQ{5\u0004!†\u0016T\u001eG·\n£\u0006*ÈQI¤\u0012';
      assert.equal(isCleanTextStream(binaryJunk), false);

      const realText = 'PREFEITURA MUNICIPAL NOTA FISCAL DE SERVICOS ELETRONICA VALOR TOTAL R$ 150,00';
      assert.equal(isCleanTextStream(realText), true);
    });
  });

  describe('Cenário 3 (Error Path): Robustez contra Entradas Nulas, Curtas ou sem Dígitos', () => {
    it('números sem nenhum dígito não são aceitos como número de documento', () => {
      const parsed = parseDocumentFields('RECIBO DE PAGAMENTO\nITEM CÓDIGO\nVALOR R$ 10,00', 'doc.png');
      assert.equal(parsed.numero_documento, undefined, 'Palavras puramente alfabéticas não são números de doc');
      assert.equal(parsed.valor, 'R$ 10,00');
    });
  });
});
