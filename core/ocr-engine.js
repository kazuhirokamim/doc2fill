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
    .replace(/\bDPROGARIA\b/gi, 'DROGARIA')
    .replace(/\bFIBCAL\b/gi, 'FISCAL')
    .replace(/\bCONSUMIGOR\b/gi, 'CONSUMIDOR')
    .replace(/\bAUXILIZA\b/gi, 'AUXILIAR')
    .replace(/\bELETR[OÔ]NIC\b/gi, 'ELETRÔNICA')
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
 * Verifica se o buffer ou string base64 é um arquivo PDF.
 * @param {Buffer|string} input Buffer ou Data URL
 * @returns {boolean}
 */
export function isPdfBuffer(input) {
  if (!input) return false;
  if (typeof input === 'string') {
    if (input.startsWith('data:application/pdf')) return true;
    if (input.startsWith('%PDF')) return true;
    if (input.includes('base64,')) {
      const sample = input.split(',')[1].substring(0, 30);
      try {
        const decoded = Buffer.from(sample, 'base64').toString('latin1');
        return decoded.startsWith('%PDF');
      } catch (_) {
        return false;
      }
    }
    return false;
  }
  if (Buffer.isBuffer(input) || input instanceof Uint8Array) {
    if (input.length < 4) return false;
    return input[0] === 0x25 && input[1] === 0x50 && input[2] === 0x44 && input[3] === 0x46; // %PDF
  }
  return false;
}

/**
 * Converte a primeira página de um PDF em buffer de imagem PNG utilizando utilitários locais do SO (sips / pdftoppm).
 * Opera exclusivamente em memória/arquivos temporários efêmeros com destruição imediata (Zero Retenção).
 * @param {Buffer} pdfBuffer Buffer binário do PDF
 * @returns {Promise<Buffer|null>} Buffer PNG resultante ou null
 */
export async function convertPdfToImageBuffer(pdfBuffer) {
  if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer)) return null;

  try {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const os = await import('node:os');
    const cp = await import('node:child_process');

    const tempId = `doc2fill_pdf_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const tempDir = os.tmpdir();
    const tempPdfPath = path.join(tempDir, `${tempId}.pdf`);
    const tempPngPath = path.join(tempDir, `${tempId}.png`);

    fs.writeFileSync(tempPdfPath, pdfBuffer);

    try {
      // 1. Tenta utilitário nativo macOS 'sips'
      cp.execFileSync('/usr/bin/sips', ['-s', 'format', 'png', tempPdfPath, '--out', tempPngPath], {
        stdio: 'pipe',
        timeout: 10000
      });

      if (fs.existsSync(tempPngPath)) {
        const pngBuf = fs.readFileSync(tempPngPath);
        return pngBuf;
      }
    } catch (sipsErr) {
      // 2. Se falhar ou estiver em Linux, tenta pdftoppm
      try {
        const outPrefix = path.join(tempDir, `${tempId}_page`);
        cp.execFileSync('pdftoppm', ['-png', '-f', '1', '-l', '1', tempPdfPath, outPrefix], {
          stdio: 'pipe',
          timeout: 10000
        });
        const generatedFile = `${outPrefix}-1.png`;
        if (fs.existsSync(generatedFile)) {
          const pngBuf = fs.readFileSync(generatedFile);
          try { fs.unlinkSync(generatedFile); } catch (_) {}
          return pngBuf;
        }
      } catch (_) {}
    } finally {
      // Zero Retenção: Expurga arquivos temporários imediatamente
      try { if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath); } catch (_) {}
      try { if (fs.existsSync(tempPngPath)) fs.unlinkSync(tempPngPath); } catch (_) {}
    }
  } catch (err) {
    console.warn('[doc2fill ocr] Falha na conversão de PDF para imagem:', err.message);
  }

  return null;
}

/**
 * Executa o reconhecimento óptico de caracteres em um buffer de imagem via Tesseract.js (Node.js)
 * Converte automaticamente arquivos PDF escaneados para imagem PNG em memória efêmera.
 * @param {Buffer|string} imageBufferOrBase64 Buffer ou string Data URL base64 da imagem/PDF
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
  } else if (typeof imageBufferOrBase64 === 'string') {
    inputData = Buffer.from(imageBufferOrBase64, 'base64');
  }

  if (Buffer.isBuffer(inputData) && inputData.length === 0) {
    return { text: '', confidence: 0 };
  }

  // Se a entrada for PDF, converte para imagem antes de chamar o Tesseract
  if (isPdfBuffer(inputData)) {
    const convertedImg = await convertPdfToImageBuffer(inputData);
    if (convertedImg) {
      inputData = convertedImg;
    } else {
      console.warn('[doc2fill ocr] Não foi possível converter PDF em imagem. Tesseract requer formato de imagem.');
      return { text: '', confidence: 0, error: 'Formato PDF requer conversão para imagem' };
    }
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

