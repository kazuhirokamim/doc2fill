import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Função utilitária do Content Script que avalia a compatibilidade de um conjunto de campos
 * @param {Array<Object>} mockInputs 
 * @param {Object} data 
 * @returns {Object}
 */
export function simulateAutofillCheck(mockInputs, data) {
  if (!data || typeof data !== 'object') {
    return { success: false, reason: 'Nenhum dado fornecido.' };
  }
  if (!Array.isArray(mockInputs) || mockInputs.length === 0) {
    return { success: false, reason: 'Nenhum campo compatível encontrado na página.' };
  }

  const termsMap = {
    cnpj: ['cnpj', 'cpf', 'documento'],
    razao: ['razao', 'nome', 'empresa'],
    valor: ['valor', 'total'],
    data: ['data', 'emissao']
  };

  let matchedCount = 0;
  for (const [key, val] of Object.entries(data)) {
    if (!val || typeof val !== 'string' || !val.trim()) continue;
    const terms = termsMap[key] || [key];
    const found = mockInputs.some(inp => 
      !inp.disabled && terms.some(t => (inp.id || '').includes(t) || (inp.name || '').includes(t))
    );
    if (found) matchedCount++;
  }

  return {
    success: matchedCount > 0,
    count: matchedCount,
    reason: matchedCount === 0 ? 'Nenhum campo compatível encontrado na página.' : null
  };
}

describe('doc2fill Content Script Autofill Engine (TDD Suite)', () => {
  const sampleInputs = [
    { id: 'cnpj', name: 'cnpj_prestador', disabled: false },
    { id: 'razao_social', name: 'razao_social', disabled: false },
    { id: 'valor_bruto', name: 'valor_bruto', disabled: false },
    { id: 'data_emissao', name: 'data_emissao', disabled: false },
    { id: 'submit_btn', name: 'submit', disabled: false }
  ];

  it('Cenário 1 (Happy Path): detecta e vincula campos para nota da AGU com sucesso', () => {
    const data = {
      cnpj: '33.000.167/0001-01',
      razao: 'Petrobras',
      valor: 'R$ 14.750,00'
    };
    const res = simulateAutofillCheck(sampleInputs, data);
    assert.equal(res.success, true);
    assert.equal(res.count, 3);
  });

  it('Cenário 2 (Edge Case): ignora campos desabilitados e campos não informados no payload', () => {
    const inputsWithDisabled = [
      { id: 'cnpj', name: 'cnpj', disabled: true },
      { id: 'razao_social', name: 'razao', disabled: false }
    ];
    const data = {
      cnpj: '33.000.167/0001-01',
      razao: 'Petrobras',
      campo_vazio: ''
    };
    const res = simulateAutofillCheck(inputsWithDisabled, data);
    assert.equal(res.success, true);
    assert.equal(res.count, 1);
  });

  it('Cenário 3 (Error Path): rejeita dados nulos ou páginas sem formulário compatível', () => {
    assert.equal(simulateAutofillCheck(sampleInputs, null).success, false);
    assert.equal(simulateAutofillCheck([], { cnpj: '33.000.167/0001-01' }).success, false);
    assert.equal(simulateAutofillCheck([{ id: 'comentario' }], { cnpj: '33.000.167/0001-01' }).success, false);
  });
});
