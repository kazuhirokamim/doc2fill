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
    tipo_documento: 'recibo',
    beneficiario: 'titular',
    natureza: 'nao_cirurgico',
    cnpj: '33.000.167/0001-01',
    razao: 'Petróleo Brasileiro S.A. - Petrobras',
    valor: 'R$ 14.750,00',
    data: '2026-09-06',
    servico: '08.02',
    irrf: 'R$ 221,25',
    descricao: 'Honorários de sucumbência e assessoria contábil em execução fiscal nº 5001234-88.2026.4.04.7100.',
    motivo: 'Atuação contábil pericial e técnica judicial especializada.'
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

/**
 * Gera botões de 1-touch copy para preenchimento assistido mobile
 * @param {Object} data 
 * @returns {Array<{ id: string, label: string, value: string }>}
 */
export function generateQuickCopyActions(data) {
  if (!data || typeof data !== 'object') {
    return [];
  }

  const actions = [];
  const fields = [
    { key: 'cnpj', label: 'Copiar CNPJ / CPF' },
    { key: 'razao', label: 'Copiar Nome / Razão Social' },
    { key: 'valor', label: 'Copiar Valor' },
    { key: 'descricao', label: 'Copiar Descrição Técnica' },
    { key: 'motivo', label: 'Copiar Motivo Anti-Glosa' },
    { key: 'servico', label: 'Copiar Código TUSS' }
  ];

  for (const f of fields) {
    if (data[f.key] && typeof data[f.key] === 'string' && data[f.key].trim()) {
      actions.push({
        id: f.key,
        label: f.label,
        value: data[f.key].trim()
      });
    }
  }
  return actions;
}

describe('doc2fill Mobile Scanner Controller (TDD Suite)', () => {
  it('Cenário 1 (Happy Path): deve empacotar dados para envio P2P com sessionId válido', () => {
    const res = buildMobileRelayPayload('sess-abc-123', {
      cnpj: '00.000.000/0001-91',
      razao: 'Banco do Brasil',
      valor: 'R$ 5.000,00',
      beneficiario: 'dependente',
      motivo: 'Procedimento funcional reparador'
    });

    assert.equal(res.ready, true);
    assert.equal(res.body.session, 'sess-abc-123');
    assert.equal(res.body.data.cnpj, '00.000.000/0001-91');
    assert.equal(res.body.data.razao, 'Banco do Brasil');
    assert.equal(res.body.data.beneficiario, 'dependente');
    assert.equal(res.body.data.motivo, 'Procedimento funcional reparador');
  });

  it('Cenário 2 (Edge Case): utiliza dados de demonstração da AGU quando customData é omitido', () => {
    const res = buildMobileRelayPayload('sess-xyz-999', null);
    assert.equal(res.ready, true);
    assert.equal(res.body.data.cnpj, '33.000.167/0001-01');
    assert.equal(res.body.data.razao, 'Petróleo Brasileiro S.A. - Petrobras');
    assert.equal(res.body.data.tipo_documento, 'recibo');
    assert.equal(res.body.data.beneficiario, 'titular');
  });

  it('Cenário 3 (Error Path): rejeita sessionId nulo, vazio ou não-string', () => {
    assert.equal(buildMobileRelayPayload(null, {}).ready, false);
    assert.equal(buildMobileRelayPayload('', {}).ready, false);
    assert.equal(buildMobileRelayPayload('   ', {}).ready, false);
  });

  describe('generateQuickCopyActions (1-Touch Copy Mobile Assistance)', () => {
    it('Cenário 1 (Happy Path): gera lista completa de ações de cópia para campos preenchidos', () => {
      const data = {
        cnpj: '12.345.678/0001-90',
        razao: 'Clínica Dermatológica',
        valor: 'R$ 1.200,00',
        descricao: 'Tratamento de alopecia areata e alopécia cicatricial',
        motivo: 'Controle de processo inflamatório folicular com repercussão funcional',
        servico: '20.10.101-5'
      };

      const actions = generateQuickCopyActions(data);
      assert.equal(actions.length, 6);
      assert.equal(actions[0].id, 'cnpj');
      assert.equal(actions[3].id, 'descricao');
      assert.ok(actions[3].value.includes('alopecia'));
      assert.equal(actions[4].id, 'motivo');
      assert.ok(actions[4].value.includes('anti-glosa') || actions[4].label.includes('Anti-Glosa'));
    });

    it('Cenário 2 (Edge Case): omite campos vazios, com apenas espaços ou não-string', () => {
      const data = {
        cnpj: '12.345.678/0001-90',
        razao: '   ',
        valor: 'R$ 500,00',
        descricao: null,
        motivo: undefined
      };

      const actions = generateQuickCopyActions(data);
      assert.equal(actions.length, 2);
      assert.equal(actions[0].id, 'cnpj');
      assert.equal(actions[1].id, 'valor');
    });

    it('Cenário 3 (Error Path): retorna array vazio quando dados são nulos, vazios ou inválidos', () => {
      assert.deepEqual(generateQuickCopyActions(null), []);
      assert.deepEqual(generateQuickCopyActions(undefined), []);
      assert.deepEqual(generateQuickCopyActions('string'), []);
      assert.deepEqual(generateQuickCopyActions({}), []);
    });
  });
});
