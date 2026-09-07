import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Lógica do scanner mobile que prepara o envio de dados para o computador
 * @param {string|null} sessionId 
 * @param {Object|null} customData 
 * @returns {Object}
 */
export function buildMobileRelayPayload(sessionId, customData) {
  if (!sessionId || typeof sessionId !== 'string' || !sessionId.trim()) {
    return { ready: false, error: 'Sessão de pareamento ausente ou inválida' };
  }

  const defaultData = {
    cnpj: '33.000.167/0001-01',
    razao: 'Petróleo Brasileiro S.A. - Petrobras',
    valor: 'R$ 14.750,00',
    data: '2026-09-06',
    servico: '08.02',
    irrf: 'R$ 221,25',
    descricao: 'Honorários de sucumbência e assessoria contábil em execução fiscal nº 5001234-88.2026.4.04.7100.'
  };

  const payload = customData && typeof customData === 'object' ? customData : defaultData;

  return {
    ready: true,
    body: {
      session: sessionId.trim(),
      data: payload
    }
  };
}

describe('doc2fill Mobile Scanner Controller (TDD Suite)', () => {
  it('Cenário 1 (Happy Path): deve empacotar dados para envio P2P com sessionId válido', () => {
    const res = buildMobileRelayPayload('sess-abc-123', {
      cnpj: '00.000.000/0001-91',
      razao: 'Banco do Brasil',
      valor: 'R$ 5.000,00'
    });

    assert.equal(res.ready, true);
    assert.equal(res.body.session, 'sess-abc-123');
    assert.equal(res.body.data.cnpj, '00.000.000/0001-91');
    assert.equal(res.body.data.razao, 'Banco do Brasil');
  });

  it('Cenário 2 (Edge Case): utiliza dados de demonstração da AGU quando customData é omitido', () => {
    const res = buildMobileRelayPayload('sess-xyz-999', null);
    assert.equal(res.ready, true);
    assert.equal(res.body.data.cnpj, '33.000.167/0001-01');
    assert.equal(res.body.data.razao, 'Petróleo Brasileiro S.A. - Petrobras');
  });

  it('Cenário 3 (Error Path): rejeita sessionId nulo, vazio ou não-string', () => {
    assert.equal(buildMobileRelayPayload(null, {}).ready, false);
    assert.equal(buildMobileRelayPayload('', {}).ready, false);
    assert.equal(buildMobileRelayPayload('   ', {}).ready, false);
  });
});
