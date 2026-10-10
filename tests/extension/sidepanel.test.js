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

/**
 * Processador em lote unificado para Drag & Drop e Seleção Nativa
 * @param {FileList|Array} fileList 
 * @returns {Object} { valid: boolean, file?: Object, warning?: string, error?: string }
 */
export function handleDocumentFileBatch(fileList) {
  if (!fileList) {
    return { valid: false, error: 'Nenhum arquivo fornecido' };
  }
  const files = Array.isArray(fileList) ? fileList : (fileList.length !== undefined ? Array.from(fileList) : [fileList]);
  if (files.length === 0) {
    return { valid: false, error: 'Lista de arquivos vazia' };
  }

  const validFiles = [];
  const errors = [];

  for (const f of files) {
    const valRes = validateUploadFile(f);
    if (valRes.valid) {
      validFiles.push({ file: f, extension: valRes.extension });
    } else {
      errors.push(`${f?.name || 'arquivo'}: ${valRes.error}`);
    }
  }

  if (validFiles.length === 0) {
    return { valid: false, error: errors[0] || 'Nenhum arquivo válido encontrado' };
  }

  const selected = validFiles[0];
  const warning = files.length > 1 ? `Múltiplos arquivos detectados (${files.length}). Processando apenas o primeiro: ${selected.file.name}` : null;

  return {
    valid: true,
    file: selected.file,
    extension: selected.extension,
    warning,
    totalFiles: files.length
  };
}

describe('doc2fill Unified Upload Batch Handler (TDD Suite)', () => {
  it('Cenário 1 (Happy Path): processa arquivo único válido com sucesso', () => {
    const file = { name: 'nota_fiscal.pdf', size: 1024 * 50, type: 'application/pdf' };
    const res = handleDocumentFileBatch([file]);
    assert.equal(res.valid, true);
    assert.equal(res.file.name, 'nota_fiscal.pdf');
    assert.equal(res.extension, '.pdf');
    assert.equal(res.warning, null);
  });

  it('Cenário 2 (Edge Case): lida com múltiplos arquivos arrastados escolhendo o primeiro válido e avisando o usuário', () => {
    const files = [
      { name: 'documento_1.png', size: 1024 * 30, type: 'image/png' },
      { name: 'documento_2.pdf', size: 1024 * 60, type: 'application/pdf' }
    ];
    const res = handleDocumentFileBatch(files);
    assert.equal(res.valid, true);
    assert.equal(res.file.name, 'documento_1.png');
    assert.ok(res.warning && res.warning.includes('Múltiplos arquivos detectados'));
    assert.equal(res.totalFiles, 2);
  });

  it('Cenário 3 (Error Path): rejeita lote vazio, nulo ou com formatos proibidos', () => {
    assert.equal(handleDocumentFileBatch(null).valid, false);
    assert.equal(handleDocumentFileBatch([]).valid, false);

    const invalidBatch = [{ name: 'malware.exe', size: 500 }];
    const res = handleDocumentFileBatch(invalidBatch);
    assert.equal(res.valid, false);
    assert.ok(res.error.includes('não suportado'));
  });
});


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

/**
 * Validador e normalizador dos tokens oficiais do Design System (Obsidian & Flow Cyan)
 * @param {Object} tokens
 * @returns {{ valid: boolean, theme: string, tokens?: Object, error?: string }}
 */
export function validateDesignSystemTokens(tokens) {
  if (!tokens || typeof tokens !== 'object' || Object.keys(tokens).length === 0) {
    return { valid: false, theme: 'unknown', error: 'Tokens de design ausentes ou nulos' };
  }

  const bgApp = (tokens.bgApp || tokens['--bg-app'] || '').toLowerCase();
  const brandBlue = (tokens.brandBlue || tokens['--brand-blue'] || '').toLowerCase();
  const brandCyan = (tokens.brandCyan || tokens['--brand-cyan'] || '').toLowerCase();

  // Verifica se pertence ao padrão corporativo oficial Obsidian (#0A0D14)
  const isObsidian = bgApp === '#0a0d14' || bgApp.includes('0a0d14');
  const hasCyanAccent = brandCyan === '#00d2ff' || brandCyan.includes('00d2ff');
  const hasBluePrimary = brandBlue === '#0052ff' || brandBlue.includes('0052ff');

  if (isObsidian && (hasCyanAccent || hasBluePrimary)) {
    return {
      valid: true,
      theme: 'obsidian-flow',
      tokens: {
        bgApp: '#0A0D14',
        bgCard: tokens.bgCard || '#111622',
        brandBlue: '#0052FF',
        brandCyan: '#00D2FF',
        textPrimary: '#F8FAFC'
      }
    };
  }

  // Fallback seguro ou rejeição de temas legados não-conformes
  if (bgApp === '#f9fafb') {
    return { valid: false, theme: 'legacy-light-deprecated', error: 'Tema claro legado foi descontinuado em prol do Obsidian Dark' };
  }

  return {
    valid: true,
    theme: 'custom-adaptive',
    tokens: {
      bgApp: bgApp || '#0A0D14',
      brandBlue: brandBlue || '#0052FF',
      brandCyan: brandCyan || '#00D2FF'
    }
  };
}

/**
 * Validador e normalizador de classe de zoom para Split-View (S2-T1)
 * @param {number|string} level 
 * @returns {string} 'zoom-100' | 'zoom-150' | 'zoom-200'
 */
export function computePreviewZoomClass(level) {
  const parsed = parseInt(level, 10);
  if (parsed === 150) return 'zoom-150';
  if (parsed === 200) return 'zoom-200';
  return 'zoom-100';
}

/**
 * Restaura campos do formulário para o snapshot canônico original (S2-T2)
 * @param {Object} current 
 * @param {Object} original 
 * @returns {Object}
 */
export function restoreOriginalFields(current, original) {
  if (!original || typeof original !== 'object') {
    return { ...current };
  }
  return {
    tipo_documento: original.tipo_documento || 'Nota Fiscal de Serviços (NFS-e)',
    cnpj: original.cnpj || original.cpf_cnpj || '',
    fornecedor: original.fornecedor || original.razao || '',
    numero_documento: original.numero_documento || original.processo || '',
    data: original.data || '',
    valor: original.valor || '',
    descricao: original.descricao || original.descritivo || '',
    motivo: original.motivo || ''
  };
}

/**
 * Limpa todos os campos editáveis mantendo apenas o tipo padrão de documento (S2-T2)
 * @param {Object} fields 
 * @returns {Object}
 */
export function clearInteractiveFields(fields) {
  return {
    tipo_documento: 'Nota Fiscal de Serviços (NFS-e)',
    cnpj: '',
    fornecedor: '',
    numero_documento: '',
    data: '',
    valor: '',
    descricao: '',
    motivo: ''
  };
}

describe('doc2fill Design System Tokens & Brand Theme (TDD Suite)', () => {
  it('Cenário 1 (Happy Path): valida tokens oficiais Obsidian & Flow Cyan com alto contraste', () => {
    const rawTokens = {
      '--bg-app': '#0A0D14',
      '--bg-card': '#111622',
      '--brand-blue': '#0052FF',
      '--brand-cyan': '#00D2FF',
      '--text-primary': '#F8FAFC'
    };

    const res = validateDesignSystemTokens(rawTokens);
    assert.equal(res.valid, true);
    assert.equal(res.theme, 'obsidian-flow');
    assert.equal(res.tokens.bgApp, '#0A0D14');
    assert.equal(res.tokens.brandCyan, '#00D2FF');
  });

  it('Cenário 2 (Edge Case): rejeita tema claro legado e aceita tokens parciais com fallbacks', () => {
    const legacy = { bgApp: '#F9FAFB' };
    const resLegacy = validateDesignSystemTokens(legacy);
    assert.equal(resLegacy.valid, false);
    assert.equal(resLegacy.theme, 'legacy-light-deprecated');

    const partial = { bgApp: '#0a0d14', brandBlue: '#0052ff' };
    const resPartial = validateDesignSystemTokens(partial);
    assert.equal(resPartial.valid, true);
    assert.equal(resPartial.tokens.brandCyan, '#00D2FF');
  });

  it('Cenário 3 (Error Path): rejeita objeto de tokens nulo, indefinido ou vazio', () => {
    assert.equal(validateDesignSystemTokens(null).valid, false);
    assert.equal(validateDesignSystemTokens(undefined).valid, false);
    assert.equal(validateDesignSystemTokens({}).valid, false);
  });
});

describe('doc2fill S2-T1: Split-View Zoom Controls (TDD Suite)', () => {
  it('Cenário 1 (Happy Path): converte 100, 150 e 200 para suas respectivas classes CSS de zoom', () => {
    assert.equal(computePreviewZoomClass(100), 'zoom-100');
    assert.equal(computePreviewZoomClass(150), 'zoom-150');
    assert.equal(computePreviewZoomClass(200), 'zoom-200');
    assert.equal(computePreviewZoomClass('150'), 'zoom-150');
    assert.equal(computePreviewZoomClass('200'), 'zoom-200');
  });

  it('Cenário 2 (Edge Case): níveis de zoom não mapeados ou intermediários usam fallback zoom-100', () => {
    assert.equal(computePreviewZoomClass(50), 'zoom-100');
    assert.equal(computePreviewZoomClass(300), 'zoom-100');
    assert.equal(computePreviewZoomClass(''), 'zoom-100');
  });

  it('Cenário 3 (Error Path): lida com valores nulos, indefinidos ou NaN retornando zoom-100 de forma segura', () => {
    assert.equal(computePreviewZoomClass(null), 'zoom-100');
    assert.equal(computePreviewZoomClass(undefined), 'zoom-100');
    assert.equal(computePreviewZoomClass('invalido'), 'zoom-100');
  });
});

describe('doc2fill S2-T2: Edição Manual, Restauração e Limpeza de Campos (TDD Suite)', () => {
  const originalSnapshot = {
    tipo_documento: 'Nota Fiscal de Serviços (NFS-e)',
    cnpj: '00.394.544/0001-85',
    fornecedor: 'HOSPITAL SÃO LUCAS S/A',
    numero_documento: 'NF-998822',
    data: '15/03/2026',
    valor: '1.450,00',
    descricao: 'Consulta especializada e exames laboratoriais',
    motivo: 'Reembolso saúde titular CCHA'
  };

  it('Cenário 1 (Happy Path): restaura todos os campos a partir do snapshot original após edição manual', () => {
    const editedFields = {
      tipo_documento: 'Outro',
      cnpj: '11.111.111/0001-11',
      fornecedor: 'CLÍNICA MODIFICADA',
      numero_documento: 'MOD-001',
      data: '01/01/2020',
      valor: '50,00',
      descricao: 'Texto modificado',
      motivo: 'Motivo alterado'
    };

    const restored = restoreOriginalFields(editedFields, originalSnapshot);
    assert.deepEqual(restored, originalSnapshot);
  });

  it('Cenário 2 (Edge Case): clearInteractiveFields zera campos de texto e mantém tipo padrão', () => {
    const cleared = clearInteractiveFields(originalSnapshot);
    assert.equal(cleared.tipo_documento, 'Nota Fiscal de Serviços (NFS-e)');
    assert.equal(cleared.cnpj, '');
    assert.equal(cleared.fornecedor, '');
    assert.equal(cleared.numero_documento, '');
    assert.equal(cleared.data, '');
    assert.equal(cleared.valor, '');
    assert.equal(cleared.descricao, '');
    assert.equal(cleared.motivo, '');
  });

  it('Cenário 3 (Error Path): restauração com snapshot nulo ou indefinido preserva o estado atual sem estourar exceção', () => {
    const current = { fornecedor: 'Atual' };
    const resNull = restoreOriginalFields(current, null);
    assert.deepEqual(resNull, current);

    const resUndefined = restoreOriginalFields(current, undefined);
    assert.deepEqual(resUndefined, current);
  });
});



