// core/browser-ocr.js
// Motor de Visão Computacional Client-Side (Browser Fallback para quando localhost:3333 estiver offline)
import { cleanOcrText, processOcrText } from './ocr-engine.js';

function loadImageFromBase64(base64DataUrl) {
  return new Promise((resolve) => {
    if (typeof Image === 'undefined') { resolve(null); return; }
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = base64DataUrl;
  });
}

async function detectNativeBarcodes(imgElement) {
  if (!imgElement || typeof globalThis.BarcodeDetector === 'undefined') return '';
  try {
    const detector = new globalThis.BarcodeDetector({
      formats: ['qr_code', 'code_128', 'itf', 'ean_13', 'pdf417']
    });
    const barcodes = await detector.detect(imgElement);
    if (!Array.isArray(barcodes) || barcodes.length === 0) return '';

    const extractedParts = [];
    for (const bc of barcodes) {
      if (bc && bc.rawValue) {
        extractedParts.push(bc.rawValue);
        const keyMatch = bc.rawValue.match(/\b(\d{44})\b/);
        if (keyMatch) extractedParts.push(`CHAVE DE ACESSO: ${keyMatch[1]}`);
      }
    }
    return extractedParts.join('\n');
  } catch (_) {
    return '';
  }
}

export async function performBrowserClientOcr(base64Image, fileName = 'documento.jpg') {
  if (!base64Image || typeof base64Image !== 'string') {
    return { success: false, text: '', data: {}, source: 'invalid_input' };
  }

  let combinedText = '';
  let sourceUsed = 'browser_heuristic';

  const imgEl = await loadImageFromBase64(base64Image);
  if (imgEl) {
    const barcodeText = await detectNativeBarcodes(imgEl);
    if (barcodeText) {
      combinedText += barcodeText + '\n';
      sourceUsed = 'chrome_barcode_detector';
    }
  }

  if (typeof globalThis.Tesseract !== 'undefined' && globalThis.Tesseract.recognize) {
    try {
      const ret = await globalThis.Tesseract.recognize(base64Image, 'por');
      if (ret?.data?.text) {
        combinedText += '\n' + cleanOcrText(ret.data.text);
        sourceUsed = 'browser_tesseract_wasm';
      }
    } catch (_) {}
  }

  const cleaned = cleanOcrText(combinedText);
  const parsedData = processOcrText(cleaned, fileName);

  return {
    success: Boolean(cleaned.length > 0 || parsedData.cpf_cnpj || parsedData.valor),
    text: cleaned,
    data: parsedData,
    source: sourceUsed
  };
}
