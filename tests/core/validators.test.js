import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateCPF,
  validateCNPJ,
  formatCurrencyBRL,
  parseBrazilianDate,
  sanitizeDocument
} from '../../core/validators.js';

describe('doc2fill Core Validators (TDD Suite)', () => {
  describe('CPF Validation', () => {
    it('Cenário 1 (Happy Path): deve validar CPFs válidos com e sem pontuação', () => {
      assert.equal(validateCPF('52998224725'), true);
      assert.equal(validateCPF('529.982.247-25'), true);
    });

    it('Cenário 2 (Edge Case): deve rejeitar CPFs com todos dígitos iguais ou tamanho inválido', () => {
      assert.equal(validateCPF('000.000.000-00'), false);
      assert.equal(validateCPF('111.111.111-11'), false);
      assert.equal(validateCPF('12345'), false);
      assert.equal(validateCPF(''), false);
    });

    it('Cenário 3 (Error Path): deve rejeitar CPFs com dígito verificador inválido ou entrada nula', () => {
      assert.equal(validateCPF('529.982.247-00'), false);
      assert.equal(validateCPF(null), false);
      assert.equal(validateCPF(undefined), false);
      assert.equal(validateCPF('texto-invalido'), false);
    });
  });

  describe('CNPJ Validation', () => {
    it('Cenário 1 (Happy Path): deve validar CNPJs autênticos com e sem máscara', () => {
      // CNPJ real Banco do Brasil: 00.000.000/0001-91
      assert.equal(validateCNPJ('00.000.000/0001-91'), true);
      assert.equal(validateCNPJ('00000000000191'), true);
    });

    it('Cenário 2 (Edge Case): deve rejeitar sequências homogêneas e tamanhos incorretos', () => {
      assert.equal(validateCNPJ('00000000000000'), false);
      assert.equal(validateCNPJ('11111111111111'), false);
      assert.equal(validateCNPJ('00.000.000/0001'), false);
    });

    it('Cenário 3 (Error Path): deve rejeitar dígitos verificadores falsificados e tipos não-string', () => {
      assert.equal(validateCNPJ('00.000.000/0001-99'), false);
      assert.equal(validateCNPJ(null), false);
      assert.equal(validateCNPJ({}), false);
    });
  });

  describe('Currency & Date Parsing', () => {
    it('Cenário 1 (Happy Path): formata e extrai moedas em padrão BRL', () => {
      assert.equal(formatCurrencyBRL(1250.5), 'R$ 1.250,50');
      assert.equal(formatCurrencyBRL('1250.50'), 'R$ 1.250,50');
    });

    it('Cenário 2 (Edge Case): normaliza datas brasileiras DD/MM/AAAA para ISO YYYY-MM-DD', () => {
      assert.equal(parseBrazilianDate('06/09/2026'), '2026-09-06');
      assert.equal(parseBrazilianDate('6/9/2026'), '2026-09-06');
    });

    it('Cenário 3 (Error Path): lida elegantemente com entradas vazias e nulas', () => {
      assert.equal(formatCurrencyBRL(null), 'R$ 0,00');
      assert.equal(parseBrazilianDate(null), null);
      assert.equal(parseBrazilianDate('data-invalida'), null);
      assert.equal(sanitizeDocument(' 123.456.789-00 '), '12345678900');
    });
  });
});
