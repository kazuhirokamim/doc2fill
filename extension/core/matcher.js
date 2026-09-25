// doc2fill - Core Field Matcher Engine
// Responsável pela heurística inteligente de mapeamento entre dados fiscais e campos de formulário

export const DEFAULT_FISCAL_MAPPINGS = {
  cnpj: ['cnpj', 'cpf', 'documento', 'prestador', 'emitente', 'identificacao', 'cpf_cnpj', 'cpfcnpj', 'prestador_cpf', 'prestador_cnpj'],
  razao: ['razao', 'nome', 'fantasia', 'empresa', 'social', 'prestador_nome', 'nome_prestador', 'clinica', 'medico'],
  valor: ['valor', 'bruto', 'total', 'quantia', 'servico_valor', 'valor_servico', 'valor_pago', 'valor_despesa', 'valor_solicitado', '_valor'],
  data: ['data', 'emissao', 'competencia', 'dt_emissao', 'data_pagamento', 'dt_pagamento', 'data_atendimento', 'data_realizacao', '_data'],
  servico: ['servico', 'codigo', 'item', 'cnae', 'atividade', 'cod_servico', 'codigo_tuss', 'tuss', 'tuss_codigo'],
  irrf: ['irrf', 'retencao', 'retido', 'imposto'],
  descricao: ['descricao', 'discriminacao', 'historico', 'detalhe', 'observacao', 'servicos', 'procedimento', 'despesa', 'especialidade', 'tipo_despesa'],
  beneficiario: ['titular', 'dependente', 'beneficiario', 'parentesco', 'paciente', 'segurado', 'usuario', 'cpfTitular', 'dependenteCpf', 'dependenteNome', 'tipo_beneficiario'],
  motivo: ['motivo', 'justificativa', 'indicacao', 'necessidade', 'diagnostico', 'cid', 'justificativa_clinica', 'indicacao_clinica', 'relatorio_medico', 'laudo'],
  natureza: ['natureza', 'cirurgico', 'tipo_procedimento', 'carater'],
  tipo_documento: ['tipo_documento', 'comprovante_tipo', 'especie', 'tipo_comprovante', 'tipo_doc', 'comprovante', 'tipo_despesa']
};

/**
 * Normaliza strings para comparação sem acento e em minúsculas
 * @param {string} str 
 * @returns {string}
 */
export function normalizeText(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Encontra o melhor campo correspondente dentro de uma lista de candidatos
 * @param {Array<Object>} inputs Lista de campos candidatos ({ id, name, placeholder, label })
 * @param {Array<string>} terms Lista de termos de busca
 * @returns {Object|null}
 */
export function findBestMatchingField(inputs, terms) {
  if (!Array.isArray(inputs) || inputs.length === 0) return null;
  if (!Array.isArray(terms) || terms.length === 0) return null;

  const normalizedTerms = terms.map(normalizeText).filter(Boolean);
  if (normalizedTerms.length === 0) return null;

  let bestInput = null;
  let highestScore = 0;

  for (const input of inputs) {
    if (!input) continue;

    const id = normalizeText(input.id || '');
    const name = normalizeText(input.name || '');
    const placeholder = normalizeText(input.placeholder || '');
    const label = normalizeText(input.label || '');

    let currentScore = 0;

    for (const term of normalizedTerms) {
      if (!term) continue;

      if (id === term || name === term) {
        currentScore += 10;
      } else if (id.includes(term) || name.includes(term)) {
        currentScore += 7;
      }

      if (label.includes(term)) {
        currentScore += 5;
      }

      if (placeholder.includes(term)) {
        currentScore += 3;
      }
    }

    if (currentScore > highestScore) {
      highestScore = currentScore;
      bestInput = input;
    }
  }

  return highestScore > 0 ? bestInput : null;
}

/**
 * Mapeia um payload de dados fiscais para a lista de inputs disponíveis
 * @param {Array<Object>} inputs Lista de campos do formulário
 * @param {Object} payload Objeto contendo os dados extraídos
 * @returns {Array<{ key: string, value: string, target: Object }>}
 */
export function matchFieldsForPayload(inputs, payload) {
  if (!Array.isArray(inputs) || !payload || typeof payload !== 'object') {
    return [];
  }

  const results = [];
  const usedInputIds = new Set();

  for (const [key, value] of Object.entries(payload)) {
    if (!value || typeof value !== 'string' || value.trim() === '') continue;

    const terms = DEFAULT_FISCAL_MAPPINGS[key] || [key];
    const availableInputs = inputs.filter(inp => !inp.id || !usedInputIds.has(inp.id));
    const target = findBestMatchingField(availableInputs, terms);

    if (target) {
      if (target.id) usedInputIds.add(target.id);
      results.push({ key, value: value.trim(), target });
    }
  }

  return results;
}

