import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Função utilitária do Sidepanel que formata e sanitiza o payload fiscal antes do envio
 * @param {Object} rawInputs 
 * @returns {Object}
 */
export function buildFiscalPayload(rawInputs) {
  if (!rawInputs || typeof rawInputs !== 'object') {
    return { valid: false, error: 'Dados brutos inválidos ou nulos' };
  }

  const sanitized = {
    cnpj: (rawInputs.cnpj || '').trim(),
    razao: (rawInputs.razao || '').trim(),
    valor: (rawInputs.valor || '').trim(),
    data: (rawInputs.data || '').trim(),
    servico: (rawInputs.servico || '').trim(),
    irrf: (rawInputs.irrf || '').trim(),
    descricao: (rawInputs.descricao || '').trim()
  };

  // Pelo menos CNPJ ou Razão Social deve existir para compor uma nota válida
  if (!sanitized.cnpj && !sanitized.razao) {
    return { valid: false, error: 'Nota fiscal precisa de ao menos CNPJ ou Razão Social' };
  }

  return { valid: true, data: sanitized };
}

describe('doc2fill Sidepanel Payload Builder (TDD Suite)', () => {
  it('Cenário 1 (Happy Path): deve construir e higienizar payload completo de honorários da AGU', () => {
    const raw = {
      cnpj: ' 33.000.167/0001-01 ',
      razao: ' Petróleo Brasileiro S.A. - Petrobras ',
      valor: ' R$ 14.750,00 ',
      data: '2026-09-06',
      servico: '08.02',
      irrf: ' R$ 221,25 ',
      descricao: ' Honorários de sucumbência em execução fiscal '
    };

    const result = buildFiscalPayload(raw);
    assert.equal(result.valid, true);
    assert.equal(result.data.cnpj, '33.000.167/0001-01');
    assert.equal(result.data.razao, 'Petróleo Brasileiro S.A. - Petrobras');
    assert.equal(result.data.valor, 'R$ 14.750,00');
    assert.equal(result.data.descricao, 'Honorários de sucumbência em execução fiscal');
  });

  it('Cenário 2 (Edge Case): deve aceitar campos opcionais vazios ou com espaços em branco', () => {
    const raw = {
      cnpj: '33.000.167/0001-01',
      razao: '',
      valor: '',
      irrf: '   '
    };

    const result = buildFiscalPayload(raw);
    assert.equal(result.valid, true);
    assert.equal(result.data.cnpj, '33.000.167/0001-01');
    assert.equal(result.data.irrf, '');
  });

  it('Cenário 3 (Error Path): deve rejeitar payload vazio, nulo ou sem nenhum identificador fiscal', () => {
    assert.equal(buildFiscalPayload(null).valid, false);
    assert.equal(buildFiscalPayload({}).valid, false);
    assert.equal(buildFiscalPayload({ valor: 'R$ 100,00' }).valid, false);
  });
});
