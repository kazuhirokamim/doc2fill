// tests/core/item-extractor.test.js
// Suíte TDD para Extração Semântica e Estruturada de Itens de Compra e Serviços

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractLineItemsFromText,
  validateItemTotals,
  normalizeItemDescription
} from '../../core/item-extractor.js';

describe('core/item-extractor.js - Extrator de Itens de Nota Fiscal (TDD)', () => {
  describe('extractLineItemsFromText', () => {
    it('Cenário 1 (Happy Path - Cupom Fiscal Tabular): extrai múltiplos itens com código, descrição, QTD e valores', () => {
      const text = `
AUTO POSTO CENTRAL LTDA
CNPJ: 12.345.678/0001-90
DANFE NFC-e - Documento Auxiliar da Nota Fiscal de Consumidor Eletrônica
----------------------------------------------------------------------
# | COD | DESCRIÇÃO | QTD | UN | VL UNIT | VL TOTAL
----------------------------------------------------------------------
001 7891000100100 GASOLINA COMUM C 35,45 LT X 5,89 208,80
002 7891000200200 OLEO MOTOR 5W30 1,00 UN X 45,00 45,00
003 7891000300300 ADITIVO RADIADOR 2 UN X 25,50 51,00
----------------------------------------------------------------------
QTD TOTAL DE ITENS: 3
VALOR TOTAL R$ 304,80
FORMA DE PAGAMENTO: PIX
      `;

      const items = extractLineItemsFromText(text);
      assert.equal(items.length, 3);

      assert.equal(items[0].itemIndex, 1);
      assert.equal(items[0].code, '7891000100100');
      assert.ok(items[0].description.includes('GASOLINA COMUM'));
      assert.equal(items[0].quantity, 35.45);
      assert.equal(items[0].unit, 'LT');
      assert.equal(items[0].unitPrice, 5.89);
      assert.equal(items[0].totalPrice, 208.80);

      assert.equal(items[1].itemIndex, 2);
      assert.equal(items[1].code, '7891000200200');
      assert.ok(items[1].description.includes('OLEO MOTOR'));
      assert.equal(items[1].quantity, 1.0);
      assert.equal(items[1].unitPrice, 45.00);
      assert.equal(items[1].totalPrice, 45.00);

      assert.equal(items[2].itemIndex, 3);
      assert.equal(items[2].totalPrice, 51.00);
    });

    it('Cenário 1.2 (Happy Path - Farmácia / Supermercado com Quebra de Linha):', () => {
      const text = `
DROGARIA SAO PAULO S/A
CUPOM FISCAL ELETRONICO
001 7896004701234 DIPIRONA MONOIDRATADA 500MG
2 UN X 7,50 15,00
002 7896004705678 PARACETAMOL GOTAS 15ML
1 UN X 12,90 12,90
TOTAL R$ 27,90
      `;

      const items = extractLineItemsFromText(text);
      assert.equal(items.length, 2);
      assert.ok(items[0].description.includes('DIPIRONA'));
      assert.equal(items[0].quantity, 2);
      assert.equal(items[0].unitPrice, 7.50);
      assert.equal(items[0].totalPrice, 15.00);

      assert.ok(items[1].description.includes('PARACETAMOL'));
      assert.equal(items[1].totalPrice, 12.90);
    });

    it('Cenário 2 (Edge Case): lista simplificada de restaurante sem código de barras', () => {
      const text = `
RESTAURANTE SABOR BRASIL
CONTA / PEDIDO 452
1 ALMOCO EXECUTIVO BUFFET 38,50
2 SUCO NATURAL LARANJA 500ML 12,00
1 CAFE EXPRESSO 6,50
TOTAL DA CONTA: R$ 57,00
      `;

      const items = extractLineItemsFromText(text);
      assert.equal(items.length, 3);
      assert.ok(items[0].description.includes('ALMOCO EXECUTIVO'));
      assert.equal(items[0].totalPrice, 38.50);
      assert.ok(items[1].description.includes('SUCO NATURAL'));
      assert.equal(items[1].totalPrice, 12.00);
      assert.ok(items[2].description.includes('CAFE EXPRESSO'));
      assert.equal(items[2].totalPrice, 6.50);
    });

    it('Cenário 3 (Error Path): documento sem itens (ex: boleto bancário ou recibo simples) retorna array vazio', () => {
      const boletoText = `
BANCO DO BRASIL S.A. | 001-9
RECIBO DO PAGADOR
CEDENTE: COMPANHIA ELETRICA
VALOR DO DOCUMENTO: 185,40
VENCIMENTO: 25/10/2026
LINHA DIGITAVEL: 00190.00009 01234.567890 12345.678901 1 89760000018540
      `;

      const items = extractLineItemsFromText(boletoText);
      assert.deepEqual(items, []);

      assert.deepEqual(extractLineItemsFromText(''), []);
      assert.deepEqual(extractLineItemsFromText(null), []);
      assert.deepEqual(extractLineItemsFromText(undefined), []);
    });
  });

  describe('validateItemTotals', () => {
    it('Cenário 1 (Happy Path): valida soma exata dos itens com o total da nota', () => {
      const items = [
        { totalPrice: 150.00 },
        { totalPrice: 45.50 },
        { totalPrice: 4.50 }
      ];
      const result = validateItemTotals(items, 200.00);
      assert.equal(result.valid, true);
      assert.equal(result.sum, 200.00);
      assert.equal(result.diff, 0);
    });

    it('Cenário 2 (Edge Case): aceita pequenas discrepâncias de arredondamento dentro da tolerância', () => {
      const items = [
        { totalPrice: 33.33 },
        { totalPrice: 33.33 },
        { totalPrice: 33.33 }
      ];
      // Soma = 99.99 vs Total 100.00 -> diff 0.01
      const result = validateItemTotals(items, 100.00, 0.05);
      assert.equal(result.valid, true);
      assert.equal(result.sum, 99.99);
      assert.ok(result.diff <= 0.05);
    });

    it('Cenário 3 (Error Path): rejeita quando a diferença excede a margem aceitável ou dados são nulos', () => {
      const items = [{ totalPrice: 50.00 }];
      const result = validateItemTotals(items, 200.00, 0.10);
      assert.equal(result.valid, false);

      const invalidResult = validateItemTotals(null, 100);
      assert.equal(invalidResult.valid, false);
      assert.equal(invalidResult.sum, 0);
    });
  });

  describe('normalizeItemDescription', () => {
    it('Cenário 1 (Happy Path): limpa prefixos de códigos e caracteres especiais', () => {
      const clean = normalizeItemDescription('001 - 7891000 GASOLINA COMUM C (LT)');
      assert.ok(clean.includes('GASOLINA COMUM C'));
    });

    it('Cenário 2 (Edge Case): preserva descrições curtas e converte maiúsculas uniformes', () => {
      assert.equal(normalizeItemDescription('PÃO FRANCÊS'), 'PÃO FRANCÊS');
    });

    it('Cenário 3 (Error Path): lida com strings nulas ou vazias', () => {
      assert.equal(normalizeItemDescription(''), '');
      assert.equal(normalizeItemDescription(null), '');
    });
  });
});
