// extension/core/ocr-engine.js - Espelho do Motor Core para a Extensão (ADR-007)
import { parseDocumentFields } from './document-parser.js';

export function cleanOcrText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/\r\n/g, '\n')
    .replace(/C\.P\.F/gi, 'CPF')
    .replace(/V\s*a\s*l\s*o\s*r/gi, 'Valor')
    .replace(/[ \t]+/g, ' ')
    .replace(/(\n\s*){3,}/g, '\n\n')
    .trim();
}

export function processOcrText(rawText, fileName = 'documento.jpg') {
  if (!rawText || typeof rawText !== 'string') {
    return {
      rawText: '',
      cpf: null,
      nome: null,
      razao: null,
      processo: null,
      valor: null,
      data: null,
      agencia: null,
      conta: null,
      banco: null,
      pix: null,
      matricula: null,
      tipo_documento: null,
      ...parseDocumentFields('', fileName)
    };
  }

  const cleaned = cleanOcrText(rawText);
  const parsed = parseDocumentFields(cleaned, fileName);

  return {
    rawText: cleaned,
    cpf: parsed.cpf || null,
    nome: parsed.razao || null,
    razao: parsed.razao || null,
    processo: parsed.processo || null,
    valor: parsed.valor || null,
    data: parsed.data || null,
    agencia: parsed.agencia || null,
    conta: parsed.conta || null,
    banco: parsed.banco || null,
    pix: parsed.pix || null,
    matricula: parsed.matricula || null,
    tipo_documento: parsed.tipo_documento || 'Requerimento de Honorários',
    ...parsed
  };
}
