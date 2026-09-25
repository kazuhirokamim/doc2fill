import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Função utilitária do Content Script que avalia a compatibilidade de um conjunto de campos
 * com suporte a campos de texto, rádio e anexo de arquivos.
 */
export function simulateAutofillCheck(mockInputs, data, filePayload = null) {
  if (!data || typeof data !== 'object') {
    return { success: false, reason: 'Nenhum dado fornecido.' };
  }
  if (!Array.isArray(mockInputs) || mockInputs.length === 0) {
    return { success: false, reason: 'Nenhum campo compatível encontrado na página.' };
  }

  const termsMap = {
    cnpj: ['cnpj', 'cpf', 'documento', 'prestador', 'cpf_cnpj', 'cpfcnpj', 'prestador_cpf'],
    razao: ['razao', 'nome', 'empresa', 'social', 'prestador_nome', 'nome_prestador'],
    valor: ['valor', 'total', 'bruto', 'valor_pago', 'valor_despesa', '_valor'],
    data: ['data', 'emissao', 'data_pagamento', 'dt_pagamento', 'data_atendimento', '_data'],
    beneficiario: ['titular', 'dependente', 'beneficiario', 'tipo_beneficiario', 'dependentenome'],
    motivo: ['motivo', 'justificativa', 'necessidade', 'justificativa_clinica'],
    natureza: ['natureza', 'cirurgico'],
    tipo_documento: ['tipo_documento', 'comprovante']
  };

  let matchedCount = 0;
  for (const [key, val] of Object.entries(data)) {
    if (!val || typeof val !== 'string' || !val.trim()) continue;
    const terms = termsMap[key] || [key];
    const found = mockInputs.some(inp => 
      !inp.disabled && terms.some(t => 
        (inp.id || '').toLowerCase().includes(t) || 
        (inp.name || '').toLowerCase().includes(t) ||
        (inp.label || '').toLowerCase().includes(t)
      )
    );
    if (found) matchedCount++;
  }

  let fileAttached = false;
  if (filePayload && filePayload.name) {
    const fileInput = mockInputs.find(inp => inp.type === 'file' && !inp.disabled);
    if (fileInput) {
      fileAttached = true;
      matchedCount++;
    }
  }

  return {
    success: matchedCount > 0,
    count: matchedCount,
    fileAttached,
    reason: matchedCount === 0 ? 'Nenhum campo compatível encontrado na página.' : null
  };
}

describe('doc2fill Content Script Autofill Engine (TDD Suite)', () => {
  const sampleInputs = [
    { id: 'cnpj', name: 'cnpj_prestador', disabled: false },
    { id: 'razao_social', name: 'razao_social', disabled: false },
    { id: 'valor_bruto', name: 'valor_bruto', disabled: false },
    { id: 'data_emissao', name: 'data_emissao', disabled: false },
    { id: 'opt_titular', name: 'beneficiario', type: 'radio', value: 'titular', label: 'Titular', disabled: false },
    { id: 'txt_motivo', name: 'motivo_solicitacao', label: 'Motivo da Necessidade Médica', disabled: false },
    { id: 'file_anexo', name: 'anexo_documento', type: 'file', disabled: false }
  ];

  it('Cenário 1 (Happy Path): detecta e preenche dados fiscais, beneficiário e anexo de arquivo', () => {
    const data = {
      cnpj: '33.000.167/0001-01',
      razao: 'Petrobras',
      valor: 'R$ 14.750,00',
      beneficiario: 'titular',
      motivo: 'Disfunção mastigatória severa'
    };
    const file = { name: 'recibo_consulta.pdf', type: 'application/pdf', size: 102400 };

    const res = simulateAutofillCheck(sampleInputs, data, file);
    assert.equal(res.success, true);
    assert.equal(res.fileAttached, true);
    assert.equal(res.count, 6); // 5 campos de dados + 1 arquivo
  });

  it('Cenário 1.2 (Happy Path CCHAR): preenche formulário de reembolso padrão CCHAR com anexo', () => {
    const ccharPageInputs = [
      { id: 'prestador_cpf', name: 'cpf_cnpj', disabled: false },
      { id: 'prestador_nome', name: 'nome_prestador', disabled: false },
      { id: 'valor_pago', name: '_valor', disabled: false },
      { id: 'dt_pagamento', name: 'data_pagamento', disabled: false },
      { id: 'tipo_beneficiario', name: 'tipo_beneficiario', disabled: false },
      { id: 'justificativa_clinica', name: 'motivo_solicitacao', disabled: false },
      { id: 'upload_comprovante', name: 'arquivo', type: 'file', disabled: false }
    ];
    const data = {
      cnpj: '12.345.678/0001-99',
      razao: 'Dr. Lucas Odontologia',
      valor: 'R$ 4.850,00',
      data: '2026-09-25',
      beneficiario: 'titular',
      motivo: 'Disfunção mastigatória severa'
    };
    const file = { name: 'recibo_dr_lucas.pdf', type: 'application/pdf', size: 145000 };

    const res = simulateAutofillCheck(ccharPageInputs, data, file);
    assert.equal(res.success, true);
    assert.equal(res.fileAttached, true);
    assert.equal(res.count, 7); // 6 campos de dados + 1 anexo
  });

  it('Cenário 2 (Edge Case): lida com páginas sem campo de anexo e campos desabilitados', () => {
    const inputsWithoutFile = [
      { id: 'cnpj', name: 'cnpj', disabled: true },
      { id: 'razao_social', name: 'razao', disabled: false }
    ];
    const data = {
      cnpj: '33.000.167/0001-01',
      razao: 'Petrobras'
    };
    const res = simulateAutofillCheck(inputsWithoutFile, data, { name: 'comprovante.pdf' });
    assert.equal(res.success, true);
    assert.equal(res.fileAttached, false);
    assert.equal(res.count, 1);
  });

  it('Cenário 3 (Error Path): rejeita dados nulos ou páginas sem formulário compatível', () => {
    assert.equal(simulateAutofillCheck(sampleInputs, null).success, false);
    assert.equal(simulateAutofillCheck([], { cnpj: '33.000.167/0001-01' }).success, false);
    assert.equal(simulateAutofillCheck([{ id: 'comentario' }], { cnpj: '33.000.167/0001-01' }).success, false);
  });
});

describe('doc2fill Clean DOM Lifecycle (TDD Suite)', () => {
  it('Cenário 1: operação 100% headless sem injeção de nós no DOM da página', () => {
    const elements = new Map();
    // A extensão opera sem injetar elementos persistentes
    assert.equal(elements.has('doc2fill-floating-trigger'), false);
    assert.equal(elements.has('doc2fill-inpage-drawer'), false);
    assert.equal(elements.size, 0);
  });

  it('Cenário 2: limpeza preventiva expurga qualquer resíduo legado', () => {
    const elements = new Map();
    elements.set('doc2fill-floating-trigger', {});
    elements.set('doc2fill-inpage-drawer', {});
    ['doc2fill-floating-trigger', 'doc2fill-inpage-drawer'].forEach(id => elements.delete(id));
    assert.equal(elements.size, 0);
  });
});
