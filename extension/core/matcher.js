// doc2fill - Core Field Matcher Engine
// Responsável pela heurística inteligente de mapeamento entre dados fiscais e campos de formulário

export const DEFAULT_FISCAL_MAPPINGS = {
  tipo_documento: ['tipo_documento', 'comprovante_tipo', 'especie', 'tipo_comprovante', 'tipo_doc', 'comprovante', 'tipo_despesa', 'tipo_requerimento', 'tipodocumento'],
  cpf_cnpj: ['cpf_cnpj', 'cpfcnpj', 'cnpj', 'cpf', 'documento', 'prestador', 'emitente', 'identificacao', 'fornecedor', 'prestador_cpf', 'prestador_cnpj', 'fornecedor_cnpj', 'fornecedor_cpf'],
  cnpj: ['cnpj', 'cpf', 'documento', 'prestador', 'emitente', 'identificacao', 'cpf_cnpj', 'cpfcnpj', 'cpf_procurador', 'cpf_beneficiario', 'prestador_cpf', 'prestador_cnpj'],
  fornecedor: ['fornecedor', 'nome_fornecedor', 'fornecedor_nome', 'razao', 'razao_social', 'nome', 'fantasia', 'empresa', 'social', 'prestador_nome', 'nome_prestador'],
  razao: ['razao', 'nome', 'fantasia', 'empresa', 'social', 'prestador_nome', 'nome_prestador', 'nome_procurador', 'nome_advogado', 'clinica', 'medico', 'fornecedor'],
  numero_documento: ['numero_documento', 'num_documento', 'numero_nf', 'num_nf', 'numero_nota', 'numero', 'num_recibo', 'numero_recibo', 'numero_cupom', 'numero_fatura', 'numero_comprovante', 'num_doc', 'processo', 'protocolo'],
  valor: ['valor', 'honorarios', 'valor_honorarios', 'quantia', 'valor_total', 'bruto', 'total', 'servico_valor', 'valor_servico', 'valor_pago', 'valor_despesa', 'valor_solicitado', '_valor', 'valor_bruto'],
  data: ['data', 'emissao', 'competencia', 'dt_emissao', 'data_requerimento', 'data_pagamento', 'dt_pagamento', 'data_atendimento', 'data_realizacao', '_data', 'data_emissao', 'data_documento'],
  descritivo: ['descritivo', 'descricao', 'discriminacao', 'historico', 'detalhe', 'observacao', 'servicos', 'procedimento', 'despesa', 'objeto', 'especificacao', 'discriminacao_servico', 'descricao_servico'],
  descricao: ['descricao', 'discriminacao', 'historico', 'detalhe', 'observacao', 'servicos', 'procedimento', 'despesa', 'especialidade', 'tipo_despesa', 'objeto', 'especificacao', 'honorarios_sucumbenciais', 'discriminacao_servico', 'descricao_servico'],
  motivo: ['motivo', 'justificativa', 'fundamentacao', 'indicacao', 'necessidade', 'diagnostico', 'cid', 'justificativa_clinica', 'indicacao_clinica', 'relatorio_medico', 'laudo', 'relatorio', 'observacao', 'motivo_procedimento'],
  servico: ['servico', 'codigo', 'item', 'cnae', 'atividade', 'cod_servico', 'codigo_tuss', 'tuss', 'tuss_codigo', 'rubrica', 'rubrica_ccha'],
  irrf: ['irrf', 'retencao', 'retido', 'imposto', 'tributo'],
  beneficiario: ['beneficiario', 'procurador', 'advogado', 'nome_beneficiario', 'requerente', 'nome_requerente', 'titular', 'dependente', 'parentesco', 'paciente', 'segurado', 'usuario', 'cpfTitular', 'dependenteCpf', 'dependenteNome', 'tipo_beneficiario'],
  natureza: ['natureza', 'especie', 'tipo_processo', 'carater', 'cirurgico', 'tipo_procedimento'],
  matricula: ['matricula', 'siape', 'matricula_siape', 'num_matricula', 'registro_funcional', 'oab'],
  orgao: ['orgao', 'lotacao', 'carreira', 'cargo', 'unidade', 'agu', 'pgfn', 'pgf', 'pgbc'],
  banco: ['banco', 'instituicao_bancaria', 'cod_banco', 'nome_banco'],
  agencia: ['agencia', 'cod_agencia', 'prefixo_agencia'],
  conta: ['conta', 'conta_corrente', 'num_conta', 'cc', 'conta_bancaria'],
  pix: ['pix', 'chave_pix', 'tipo_pix', 'chavepix'],
  processo: ['processo', 'numero_processo', 'num_processo', 'processo_judicial', 'processo_administrativo', 'protocolo']
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

