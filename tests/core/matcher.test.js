import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { findBestMatchingField, matchFieldsForPayload } from '../../core/matcher.js';

describe('doc2fill Matcher Engine (TDD Suite)', () => {
  const sampleInputs = [
    { id: 'cnpj', name: 'cnpj_prestador', placeholder: '00.000.000/0000-00', label: 'CNPJ / CPF do Prestador' },
    { id: 'razao_social', name: 'razao_social', placeholder: 'Digite a razão social', label: 'Razão Social / Nome' },
    { id: 'valor_bruto', name: 'valor_bruto', placeholder: 'R$ 0,00', label: 'Valor Bruto do Documento' },
    { id: 'data_emissao', name: 'data_emissao', placeholder: '', label: 'Data de Emissão / Competência' },
    { id: 'retencao_irrf', name: 'retencao_irrf', placeholder: 'R$ 0,00', label: 'Retenção de IRRF' },
    { id: 'codigo_servico', name: 'cod_servico', placeholder: 'Ex: 08.02', label: 'Código do Serviço' },
    { id: 'discriminacao_servico', name: 'descricao_servico', placeholder: 'Descrição...', label: 'Discriminação dos Serviços' }
  ];

  describe('findBestMatchingField', () => {
    it('Cenário 1 (Happy Path): localiza campos por termos fiscais relevantes em id, name ou label', () => {
      const matchCnpj = findBestMatchingField(sampleInputs, ['cnpj', 'cpf', 'documento']);
      assert.ok(matchCnpj);
      assert.equal(matchCnpj.id, 'cnpj');

      const matchValor = findBestMatchingField(sampleInputs, ['valor', 'bruto', 'total']);
      assert.ok(matchValor);
      assert.equal(matchValor.id, 'valor_bruto');
    });

    it('Cenário 2 (Edge Case): lida com variações de maiúsculas/minúsculas e acentuação', () => {
      const mixedInputs = [
        { id: 'txt_EMPRESA', name: 'RAZAO', label: 'Razão Social da Empresa' }
      ];
      const match = findBestMatchingField(mixedInputs, ['razao', 'social', 'empresa']);
      assert.ok(match);
      assert.equal(match.id, 'txt_EMPRESA');
    });

    it('Cenário 3 (Error Path): retorna null quando nenhum campo corresponde ou entradas são nulas', () => {
      const matchInexistente = findBestMatchingField(sampleInputs, ['campo_inexistente_xyz']);
      assert.equal(matchInexistente, null);

      assert.equal(findBestMatchingField(null, ['cnpj']), null);
      assert.equal(findBestMatchingField([], ['cnpj']), null);
      assert.equal(findBestMatchingField(sampleInputs, null), null);
      assert.equal(findBestMatchingField(sampleInputs, []), null);
    });
  });

  describe('matchFieldsForPayload', () => {
    it('Cenário 1 (Happy Path): mapeia todos os campos de uma nota fiscal válida', () => {
      const payload = {
        cnpj: '33.000.167/0001-01',
        razao: 'Petrobras',
        valor: 'R$ 14.750,00',
        data: '2026-09-06',
        servico: '08.02',
        beneficiario: 'titular',
        motivo: 'Disfunção mastigatória'
      };
      const extendedInputs = [
        ...sampleInputs,
        { id: 'sel_beneficiario', name: 'beneficiario', label: 'Titular ou Dependente' },
        { id: 'txt_motivo', name: 'motivo_solicitacao', label: 'Motivo da Necessidade' }
      ];
      const matches = matchFieldsForPayload(extendedInputs, payload);
      assert.equal(matches.length, 7);
      assert.equal(matches.find(m => m.key === 'cnpj').target.id, 'cnpj');
      assert.equal(matches.find(m => m.key === 'valor').target.id, 'valor_bruto');
      assert.equal(matches.find(m => m.key === 'beneficiario').target.id, 'sel_beneficiario');
      assert.equal(matches.find(m => m.key === 'motivo').target.id, 'txt_motivo');
    });

    it('Cenário 1.2 (Happy Path CCHAR): mapeia com precisão campos com nomenclatura do sistema CCHAR', () => {
      const ccharInputs = [
        { id: 'prestador_cpf', name: 'cpf_cnpj', label: 'CPF / CNPJ do Prestador' },
        { id: 'prestador_nome', name: 'nome_prestador', label: 'Nome / Razão Social' },
        { id: 'valor_pago', name: '_valor', label: 'Valor Pago / Despesa' },
        { id: 'dt_pagamento', name: 'data_pagamento', label: 'Data do Pagamento' },
        { id: 'tipo_beneficiario', name: 'dependenteNome', label: 'Beneficiário / Dependente' },
        { id: 'justificativa_clinica', name: 'motivo_solicitacao', label: 'Justificativa Clínica Anti-Glosa' }
      ];
      const payload = {
        cnpj: '12.345.678/0001-99',
        razao: 'Dr. Lucas Odontologia',
        valor: 'R$ 4.850,00',
        data: '2026-09-25',
        beneficiario: 'titular',
        motivo: 'Disfunção mastigatória severa'
      };
      const matches = matchFieldsForPayload(ccharInputs, payload);
      assert.equal(matches.length, 6);
      assert.equal(matches.find(m => m.key === 'cnpj').target.id, 'prestador_cpf');
      assert.equal(matches.find(m => m.key === 'razao').target.id, 'prestador_nome');
      assert.equal(matches.find(m => m.key === 'valor').target.id, 'valor_pago');
      assert.equal(matches.find(m => m.key === 'data').target.id, 'dt_pagamento');
      assert.equal(matches.find(m => m.key === 'beneficiario').target.id, 'tipo_beneficiario');
      assert.equal(matches.find(m => m.key === 'motivo').target.id, 'justificativa_clinica');
    });

    it('Cenário 2 (Edge Case): ignora campos vazios no payload ou inexistentes no DOM', () => {
      const payload = {
        cnpj: '33.000.167/0001-01',
        campo_inexistente: 'Alguma coisa',
        valor: ''
      };
      const matches = matchFieldsForPayload(sampleInputs, payload);
      assert.equal(matches.length, 1);
      assert.equal(matches[0].key, 'cnpj');
    });

    it('Cenário 3 (Error Path): lida com payload nulo ou lista de inputs vazia', () => {
      assert.deepEqual(matchFieldsForPayload(null, {}), []);
      assert.deepEqual(matchFieldsForPayload(sampleInputs, null), []);
      assert.deepEqual(matchFieldsForPayload([], {}), []);
    });
  });
});

