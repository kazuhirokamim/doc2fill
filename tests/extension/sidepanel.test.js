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

  if (!sanitized.cnpj && !sanitized.razao) {
    return { valid: false, error: 'Nota fiscal precisa de ao menos CNPJ ou Razão Social' };
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
