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
    tipo_documento: (rawInputs.tipo_documento || 'Nota Fiscal de Serviços (NFS-e)').trim(),
    cpf_cnpj: (rawInputs.cpf_cnpj || rawInputs.cnpj || rawInputs.cpf || '').trim(),
    cnpj: (rawInputs.cnpj || rawInputs.cpf_cnpj || '').trim(),
    cpf: (rawInputs.cpf || rawInputs.cpf_cnpj || '').trim(),
    fornecedor: (rawInputs.fornecedor || rawInputs.razao || rawInputs.nome || '').trim(),
    razao: (rawInputs.razao || rawInputs.fornecedor || '').trim(),
    numero_documento: (rawInputs.numero_documento || rawInputs.processo || '').trim(),
    data: (rawInputs.data || '').trim(),
    valor: (rawInputs.valor || '').trim(),
    descritivo: (rawInputs.descritivo || rawInputs.descricao || '').trim(),
    descricao: (rawInputs.descricao || rawInputs.descritivo || '').trim(),
    motivo: (rawInputs.motivo || '').trim(),
    // campos complementares / retrocompatíveis:
    servico: (rawInputs.servico || '').trim(),
    irrf: (rawInputs.irrf || '').trim(),
    beneficiario: (rawInputs.beneficiario || 'titular').trim(),
    natureza: (rawInputs.natureza || 'Não Cirúrgico (Ambulatorial)').trim()
  };

  if (!sanitized.cpf_cnpj && !sanitized.fornecedor) {
    return { valid: false, error: 'Documento precisa de ao menos CPF/CNPJ ou Nome do Fornecedor' };
  }

  return { valid: true, data: sanitized };
}

/**
 * Validador de arquivos suportados na aba de PDF/Foto
 * @param {Object} fileObj { name, size, type }
 * @returns {Object} { valid: boolean, error?: string }
 */
export function validateUploadFile(fileObj) {
  if (!fileObj || typeof fileObj !== 'object' || !fileObj.name) {
    return { valid: false, error: 'Arquivo inválido ou não selecionado' };
  }

  const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg'];
  const ext = fileObj.name.substring(fileObj.name.lastIndexOf('.')).toLowerCase();

  if (!allowedExtensions.includes(ext)) {
    return { valid: false, error: `Formato ${ext} não suportado. Use PDF, PNG ou JPG.` };
  }

  const maxSizeBytes = 25 * 1024 * 1024; // 25 MB
  if (fileObj.size && fileObj.size > maxSizeBytes) {
    return { valid: false, error: 'Arquivo excede o tamanho máximo permitido (25MB)' };
  }

  return { valid: true, extension: ext };
}

describe('doc2fill Sidepanel Payload Builder (TDD Suite)', () => {
  it('Cenário 1 (Happy Path): deve construir e higienizar payload completo com os 8 campos focados', () => {
    const raw = {
      tipo_documento: 'Nota Fiscal de Serviços (NFS-e)',
      cpf_cnpj: ' 33.000.167/0001-01 ',
      fornecedor: ' Petróleo Brasileiro S.A. - Petrobras ',
      numero_documento: ' 00045821 ',
      data: '2026-09-06',
      valor: ' R$ 14.750,00 ',
      descritivo: ' Honorários de sucumbência em execução fiscal ',
      motivo: ' Requerimento CCHA rateio sucumbencial '
    };

    const result = buildFiscalPayload(raw);
    assert.equal(result.valid, true);
    assert.equal(result.data.tipo_documento, 'Nota Fiscal de Serviços (NFS-e)');
    assert.equal(result.data.cpf_cnpj, '33.000.167/0001-01');
    assert.equal(result.data.fornecedor, 'Petróleo Brasileiro S.A. - Petrobras');
    assert.equal(result.data.numero_documento, '00045821');
    assert.equal(result.data.data, '2026-09-06');
    assert.equal(result.data.valor, 'R$ 14.750,00');
    assert.equal(result.data.descritivo, 'Honorários de sucumbência em execução fiscal');
    assert.equal(result.data.motivo, 'Requerimento CCHA rateio sucumbencial');
  });

  it('Cenário 2 (Edge Case): deve aceitar campos opcionais vazios ou com espaços em branco', () => {
    const raw = {
      cnpj: '33.000.167/0001-01',
      fornecedor: '',
      valor: '',
      irrf: '   '
    };

    const result = buildFiscalPayload(raw);
    assert.equal(result.valid, true);
    assert.equal(result.data.cpf_cnpj, '33.000.167/0001-01');
    assert.equal(result.data.irrf, '');
  });

  it('Cenário 3 (Error Path): deve rejeitar payload vazio, nulo ou sem nenhum identificador fiscal', () => {
    assert.equal(buildFiscalPayload(null).valid, false);
    assert.equal(buildFiscalPayload({}).valid, false);
    assert.equal(buildFiscalPayload({ valor: 'R$ 100,00' }).valid, false);
  });
});

describe('doc2fill File Upload Validator (TDD Suite)', () => {
  it('Cenário 1 (Happy Path): aceita arquivos PDF, PNG e JPEG de notas fiscais', () => {
    assert.equal(validateUploadFile({ name: 'nota_fiscal_agu.pdf', size: 102400 }).valid, true);
    assert.equal(validateUploadFile({ name: 'comprovante.png', size: 50000 }).valid, true);
    assert.equal(validateUploadFile({ name: 'foto_documento.jpg', size: 80000 }).valid, true);
  });

  it('Cenário 2 (Edge Case): lida com extensões em maiúsculas (.PDF, .PNG) e caminhos longos', () => {
    const res = validateUploadFile({ name: 'CERTIDAO_HONORARIOS_PGFN_2026.PDF', size: 204800 });
    assert.equal(res.valid, true);
    assert.equal(res.extension, '.pdf');
  });

  it('Cenário 3 (Error Path): rejeita arquivos executáveis, formatos não suportados ou nulos', () => {
    assert.equal(validateUploadFile(null).valid, false);
    assert.equal(validateUploadFile({ name: 'script.exe' }).valid, false);
    assert.equal(validateUploadFile({ name: 'arquivo_sem_extensao' }).valid, false);
    assert.equal(validateUploadFile({ name: 'nota.pdf', size: 30 * 1024 * 1024 }).valid, false); // > 25MB
  });
});

/**
 * Função utilitária que gera as URLs candidatas para conexão resiliente com o servidor local
 * @param {number[]} [ports]
 * @returns {string[]}
 */
export function buildCandidateApiUrls(ports = [3333, 8080, 3334, 3030, 4040]) {
  if (!Array.isArray(ports)) return ['http://localhost:3333'];
  return ports
    .filter(p => typeof p === 'number' && p > 0 && p <= 65535)
    .map(p => `http://localhost:${p}`);
}

describe('doc2fill Sidepanel API Candidate Resolver (TDD Suite)', () => {
  it('Cenário 1 (Happy Path): gera lista de URLs locais incluindo 3333 como prioritária', () => {
    const urls = buildCandidateApiUrls();
    assert.ok(Array.isArray(urls));
    assert.equal(urls[0], 'http://localhost:3333');
    assert.ok(urls.includes('http://localhost:8080'));
  });

  it('Cenário 2 (Edge Case): aceita array customizado de portas e filtra valores inválidos', () => {
    const urls = buildCandidateApiUrls([3333, -1, 99999, 'invalido', 4040]);
    assert.deepEqual(urls, ['http://localhost:3333', 'http://localhost:4040']);
  });

  it('Cenário 3 (Error Path): lida graciosamente com entrada nula ou não-array', () => {
    assert.deepEqual(buildCandidateApiUrls(null), ['http://localhost:3333']);
    assert.deepEqual(buildCandidateApiUrls('3333'), ['http://localhost:3333']);
  });
});

/**
 * Validador das abas de navegação ativas no Sidepanel (eliminando abas de teste/mock)
 * @param {string[]} registeredTabs 
 * @returns {{ valid: boolean, tabs: string[] }}
 */
export function sanitizeNavigationTabs(registeredTabs) {
  const allowedProductionTabs = ['file', 'qr'];
  if (!Array.isArray(registeredTabs)) {
    return { valid: true, tabs: allowedProductionTabs };
  }
  const filtered = registeredTabs.filter(tab => allowedProductionTabs.includes(tab));
  return {
    valid: filtered.length > 0 && !registeredTabs.includes('demo'),
    tabs: filtered
  };
}

describe('doc2fill Navigation Tabs Guard (TDD Suite)', () => {
  it('Cenário 1 (Happy Path): deve validar abas de produção padrão (file e qr) com file prioritária', () => {
    const result = sanitizeNavigationTabs(['file', 'qr']);
    assert.equal(result.valid, true);
    assert.deepEqual(result.tabs, ['file', 'qr']);
  });

  it('Cenário 2 (Edge Case): deve expurgar aba legada demo e retornar falso para integridade', () => {
    const result = sanitizeNavigationTabs(['demo', 'file', 'qr']);
    assert.equal(result.valid, false);
    assert.deepEqual(result.tabs, ['file', 'qr']);
  });

  it('Cenário 3 (Error Path): deve retornar abas de produção seguras quando input for inválido ou vazio', () => {
    const resNull = sanitizeNavigationTabs(null);
    assert.equal(resNull.valid, true);
    assert.deepEqual(resNull.tabs, ['file', 'qr']);

    const resEmpty = sanitizeNavigationTabs([]);
    assert.equal(resEmpty.valid, false);
    assert.deepEqual(resEmpty.tabs, []);
  });
});

