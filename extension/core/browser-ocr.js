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

export function upscaleAndEnhanceImageElement(imgEl, minTargetDim = 1600) {
  if (!imgEl) return null;
  const w = imgEl.naturalWidth || imgEl.width || 0;
  const h = imgEl.naturalHeight || imgEl.height || 0;
  if (w === 0 || h === 0) return null;

  const maxDim = Math.max(w, h);
  let scale = 1.0;
  if (maxDim < minTargetDim) {
    scale = Math.min(4.0, minTargetDim / maxDim);
  }

  const targetW = Math.round(w * scale);
  const targetH = Math.round(h * scale);

  let canvas;
  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(targetW, targetH);
  } else if (typeof document !== 'undefined' && document.createElement) {
    canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
  } else {
    return null;
  }

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(imgEl, 0, 0, targetW, targetH);

  try {
    const imgData = ctx.getImageData(0, 0, targetW, targetH);
    const d = imgData.data;
    const factor = (259 * (1.5 + 255)) / (255 * (259 - 1.5));
    for (let i = 0; i < d.length; i += 4) {
      const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      const contrasted = factor * (gray - 128) + 128;
      const clamped = contrasted > 255 ? 255 : (contrasted < 0 ? 0 : contrasted);
      d[i] = clamped;
      d[i + 1] = clamped;
      d[i + 2] = clamped;
    }
    ctx.putImageData(imgData, 0, 0);
  } catch (_) {}

  return canvas;
}

export async function performBrowserClientOcr(base64Image, fileName = 'documento.jpg') {
  if (!base64Image || typeof base64Image !== 'string') {
    return { success: false, text: '', data: {}, source: 'invalid_input' };
  }

  let combinedText = '';
  let sourceUsed = 'browser_heuristic';
  let ocrTargetInput = base64Image;

  const imgEl = await loadImageFromBase64(base64Image);
  if (imgEl) {
    const barcodeText = await detectNativeBarcodes(imgEl);
    if (barcodeText) {
      combinedText += barcodeText + '\n';
      sourceUsed = 'chrome_barcode_detector';
    }
    const upscaledCanvas = upscaleAndEnhanceImageElement(imgEl);
    if (upscaledCanvas) ocrTargetInput = upscaledCanvas;
  }

  if (typeof globalThis.Tesseract !== 'undefined') {
    try {
      let ocrTextResult = '';
      if (typeof chrome !== 'undefined' && chrome.runtime?.getURL && typeof globalThis.Tesseract.createWorker === 'function') {
        const worker = await globalThis.Tesseract.createWorker('por', 1, {
          workerPath: chrome.runtime.getURL('vendor/worker.min.js'),
          corePath: chrome.runtime.getURL('vendor/tesseract-core-simd-lstm.wasm.js'),
          langPath: chrome.runtime.getURL('vendor/'),
          gzip: false
        });
        const ret = await worker.recognize(ocrTargetInput);
        ocrTextResult = ret?.data?.text || '';
        await worker.terminate();
      } else if (typeof globalThis.Tesseract.recognize === 'function') {
        const ret = await globalThis.Tesseract.recognize(ocrTargetInput, 'por');
        ocrTextResult = ret?.data?.text || '';
      }

      if (ocrTextResult) {
        combinedText += '\n' + cleanOcrText(ocrTextResult);
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
