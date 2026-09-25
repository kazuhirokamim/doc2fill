/**
 * doc2fill - Core Document Type Classifier
 * Classifica automaticamente comprovantes em NFS-e, Recibo Profissional, Boleto, Guia TISS/TUSS.
 * Zero dependências, pure JS, client-side execution.
 */

import { normalizeText } from './matcher.js';

export const DOCUMENT_TYPES = {
  NFSE: 'nfse',
  RECIBO: 'recibo',
  BOLETO: 'boleto',
  GUIA: 'guia',
  OUTROS: 'outros'
};

export const DOCUMENT_LABELS = {
  [DOCUMENT_TYPES.NFSE]: 'Nota Fiscal de Serviços (NFS-e)',
  [DOCUMENT_TYPES.RECIBO]: 'Recibo Profissional Liberal',
  [DOCUMENT_TYPES.BOLETO]: 'Boleto / Comprovante Bancário',
  [DOCUMENT_TYPES.GUIA]: 'Guia Médica (TISS/TUSS)',
  [DOCUMENT_TYPES.OUTROS]: 'Outro Comprovante'
};

/**
 * Classifica o documento pelo conteúdo textual ou nome do arquivo
 * @param {string} textConteudo Texto extraído via OCR ou parsing
 * @param {string} fileName Nome original do arquivo (opcional)
 * @returns {{ type: string, label: string, confidence: number }}
 */
export function classifyDocumentType(textConteudo, fileName = '') {
  const normText = normalizeText(textConteudo || '');
  const normFile = normalizeText(fileName || '');
  const combined = `${normText} ${normFile}`.trim();

  if (!combined) {
    return {
      type: DOCUMENT_TYPES.OUTROS,
      label: DOCUMENT_LABELS[DOCUMENT_TYPES.OUTROS],
      confidence: 0
    };
  }

  // 1. Padrão Guia Médica TISS/TUSS
  if (
    combined.includes('tiss') ||
    combined.includes('tuss') ||
    combined.includes('guia de servico') ||
    combined.includes('sadt') ||
    combined.includes('solicitacao de procedimento')
  ) {
    return {
      type: DOCUMENT_TYPES.GUIA,
      label: DOCUMENT_LABELS[DOCUMENT_TYPES.GUIA],
      confidence: 0.95
    };
  }

  // 2. Padrão Boleto Bancário (avaliado antes de recibo genérico por conta de 'recibo do sacado')
  if (
    combined.includes('linha digitavel') ||
    combined.includes('recibo do sacado') ||
    combined.includes('recibo do pagador') ||
    combined.includes('boleto') ||
    (combined.includes('vencimento') && combined.includes('cedente'))
  ) {
    return {
      type: DOCUMENT_TYPES.BOLETO,
      label: DOCUMENT_LABELS[DOCUMENT_TYPES.BOLETO],
      confidence: 0.9
    };
  }

  // 3. Padrão Nota Fiscal de Serviço (NFS-e / DANFE)
  if (
    combined.includes('nfs-e') ||
    combined.includes('nfse') ||
    combined.includes('danfe') ||
    combined.includes('nota fiscal') ||
    combined.includes('prefeitura') ||
    combined.includes('issqn') ||
    combined.includes('prestador de servicos')
  ) {
    return {
      type: DOCUMENT_TYPES.NFSE,
      label: DOCUMENT_LABELS[DOCUMENT_TYPES.NFSE],
      confidence: 0.9
    };
  }

  // 4. Padrão Recibo de Profissional Liberal
  if (
    combined.includes('recibo') ||
    combined.includes('crm') ||
    combined.includes('cro') ||
    combined.includes('crp') ||
    combined.includes('crefito') ||
    combined.includes('rpa') ||
    combined.includes('autonomo')
  ) {
    return {
      type: DOCUMENT_TYPES.RECIBO,
      label: DOCUMENT_LABELS[DOCUMENT_TYPES.RECIBO],
      confidence: 0.85
    };
  }

  return {
    type: DOCUMENT_TYPES.OUTROS,
    label: DOCUMENT_LABELS[DOCUMENT_TYPES.OUTROS],
    confidence: 0.3
  };
}
