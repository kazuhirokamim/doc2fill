/**
 * doc2fill - Core Document Type Classifier
 * Classifica automaticamente comprovantes em Nota Fiscal, Cupom Fiscal, Recibo, Boleto, Fatura, Comprovante de Pagamento, Guia Médica e Declaração.
 * Zero dependências, pure JS, client-side execution.
 */

import { normalizeText } from './matcher.js';

export const DOCUMENT_TYPES = {
  NFSE: 'nfse',
  CUPOM: 'cupom',
  RECIBO: 'recibo',
  BOLETO: 'boleto',
  FATURA: 'fatura',
  COMPROVANTE: 'comprovante',
  GUIA: 'guia',
  DECLARACAO: 'declaracao',
  OUTROS: 'outros'
};

export const DOCUMENT_LABELS = {
  [DOCUMENT_TYPES.NFSE]: 'Nota Fiscal de Serviços (NFS-e)',
  [DOCUMENT_TYPES.CUPOM]: 'Cupom Fiscal (NFC-e / SAT)',
  [DOCUMENT_TYPES.RECIBO]: 'Recibo Profissional Liberal',
  [DOCUMENT_TYPES.BOLETO]: 'Boleto / Comprovante Bancário',
  [DOCUMENT_TYPES.FATURA]: 'Fatura / Concessionária',
  [DOCUMENT_TYPES.COMPROVANTE]: 'Comprovante de Pagamento',
  [DOCUMENT_TYPES.GUIA]: 'Guia Médica (TISS/TUSS)',
  [DOCUMENT_TYPES.DECLARACAO]: 'Declaração',
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

  // 2. Padrão Comprovante de Pagamento (PIX, TED, Transferência bancária)
  if (
    combined.includes('comprovante de pagamento') ||
    combined.includes('comprovante pix') ||
    combined.includes('pagamento pix') ||
    combined.includes('comprovante de transferencia') ||
    combined.includes('transacao realizada') ||
    combined.includes('autenticacao bancaria') ||
    (combined.includes('comprovante') && (combined.includes('pix') || combined.includes('ted') || combined.includes('doc')))
  ) {
    return {
      type: DOCUMENT_TYPES.COMPROVANTE,
      label: DOCUMENT_LABELS[DOCUMENT_TYPES.COMPROVANTE],
      confidence: 0.95
    };
  }

  // 3. Padrão Boleto Bancário
  if (
    combined.includes('linha digitavel') ||
    combined.includes('recibo do sacado') ||
    combined.includes('recibo do pagador') ||
    combined.includes('boleto') ||
    combined.includes('ficha de compensacao') ||
    (combined.includes('vencimento') && combined.includes('cedente'))
  ) {
    return {
      type: DOCUMENT_TYPES.BOLETO,
      label: DOCUMENT_LABELS[DOCUMENT_TYPES.BOLETO],
      confidence: 0.9
    };
  }

  // 4. Padrão Cupom Fiscal (NFC-e / SAT / ECF)
  if (
    combined.includes('cupom fiscal') ||
    combined.includes('cupom_fiscal') ||
    combined.includes('nfc-e') ||
    combined.includes('nfce') ||
    combined.includes('sat') ||
    combined.includes('extrato sat') ||
    combined.includes('danfe nfc-e')
  ) {
    return {
      type: DOCUMENT_TYPES.CUPOM,
      label: DOCUMENT_LABELS[DOCUMENT_TYPES.CUPOM],
      confidence: 0.92
    };
  }

  // 5. Padrão Fatura (Concessionária, Cartão, Serviços Mensais)
  if (
    combined.includes('fatura') ||
    combined.includes('conta mensal') ||
    combined.includes('concessionaria') ||
    combined.includes('telecomunicacoes') ||
    combined.includes('energia eletrica') ||
    combined.includes('demonstrativo de fatura')
  ) {
    return {
      type: DOCUMENT_TYPES.FATURA,
      label: DOCUMENT_LABELS[DOCUMENT_TYPES.FATURA],
      confidence: 0.9
    };
  }

  // 6. Padrão Declaração
  if (
    combined.includes('declaracao') ||
    combined.includes('termo de declaracao') ||
    combined.includes('declaracao de quitacao') ||
    combined.includes('atesto de prestacao') ||
    combined.includes('declaramos para os devidos fins')
  ) {
    return {
      type: DOCUMENT_TYPES.DECLARACAO,
      label: DOCUMENT_LABELS[DOCUMENT_TYPES.DECLARACAO],
      confidence: 0.9
    };
  }

  // 7. Padrão Nota Fiscal de Serviço / Mercadoria (NFS-e / NF-e / DANFE)
  if (
    combined.includes('nfs-e') ||
    combined.includes('nfse') ||
    combined.includes('nf-e') ||
    combined.includes('danfe') ||
    combined.includes('danfse') ||
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

  // 8. Padrão Recibo de Profissional Liberal / RPA
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
