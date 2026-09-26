// core/ocr-engine.js - Motor Local de OCR e Extração de Documentos CCHA (Zero Retenção)
import { parseDocumentFields } from './document-parser.js';

/**
 * Higieniza o texto bruto devolvido pelo OCR, normalizando espaços, quebras e artefatos de scanner.
 * @param {string} text Texto bruto do OCR
 * @returns {string} Texto normalizado
 */
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

/**
 * Processa o texto extraído por OCR e estrutura os campos conforme o modelo do CCHA.
 * @param {string} rawText Texto bruto extraído da imagem
 * @param {string} [fileName='documento.jpg'] Nome original do arquivo
 * @returns {object} Objeto com os campos mapeados e metadados
 */
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

/**
 * Executa o reconhecimento óptico de caracteres em um buffer de imagem via Tesseract.js (Node.js)
 * @param {Buffer|string} imageBufferOrBase64 Buffer ou string Data URL base64 da imagem
 * @param {string} [lang='por'] Código do idioma do OCR (padrão: português)
 * @returns {Promise<{ text: string, confidence: number }>}
 */
export async function performOcr(imageBufferOrBase64, lang = 'por') {
  if (!imageBufferOrBase64) {
    return { text: '', confidence: 0 };
  }

  let inputData = imageBufferOrBase64;
  if (typeof imageBufferOrBase64 === 'string' && imageBufferOrBase64.startsWith('data:')) {
    const base64Data = imageBufferOrBase64.split(',')[1];
    inputData = Buffer.from(base64Data, 'base64');
  }

  try {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker(lang);
    const ret = await worker.recognize(inputData);
    await worker.terminate();

    return {
      text: cleanOcrText(ret.data?.text || ''),
      confidence: ret.data?.confidence || 0
    };
  } catch (err) {
    console.warn('[doc2fill ocr] Erro ao processar OCR com Tesseract:', err.message);
    return { text: '', confidence: 0, error: err.message };
  }
}
