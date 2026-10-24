// core/browser-ocr.js
// Motor de Visão Computacional Client-Side (Browser Fallback com Auto-Rotação, Otsu e Avaliação de Confiança)
import { cleanOcrText, processOcrText } from './ocr-engine.js';
import {
  detectExifOrientation,
  getRotationDegreesFromOrientation,
  rotateCanvasByDegrees,
  computeOtsuThreshold,
  applyOtsuBinarizationToPixels,
  estimateSkewAngleFromProjection,
  calculateRotatedDimensions
} from './image-preprocessor.js';
import { extractFirstPdfImageAsDataUrl } from './pdf-stream-decoder.js';
import { evaluateOcrConfidence } from './cloud-ocr-client.js';

function base64ToUint8Array(base64Str) {
  if (!base64Str || typeof base64Str !== 'string') return null;
  try {
    const raw = base64Str.includes(',') ? base64Str.split(',')[1] : base64Str;
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(raw, 'base64');
    }
    if (typeof atob === 'function') {
      const binary = atob(raw);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    }
  } catch (_) {}
  return null;
}

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

export function upscaleAndEnhanceImageElement(imgEl, minTargetDim = 1600, options = {}) {
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
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(imgEl, 0, 0, targetW, targetH);

  try {
    const imgData = ctx.getImageData(0, 0, targetW, targetH);
    const d = imgData.data;

    // 1. Aplica binarização adaptativa Otsu se habilitado
    if (options.applyOtsu !== false) {
      applyOtsuBinarizationToPixels(d);
    } else {
      const factor = (259 * (1.5 + 255)) / (255 * (259 - 1.5));
      for (let i = 0; i < d.length; i += 4) {
        const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        const contrasted = factor * (gray - 128) + 128;
        const clamped = contrasted > 255 ? 255 : (contrasted < 0 ? 0 : contrasted);
        d[i] = clamped;
        d[i + 1] = clamped;
        d[i + 2] = clamped;
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // 2. Aplica deskew se solicitado e dimensões viáveis
    if (options.applyDeskew) {
      const grayPixels = new Uint8Array(targetW * targetH);
      for (let i = 0, j = 0; i < d.length; i += 4, j++) {
        grayPixels[j] = d[i] < 128 ? 1 : 0; // 1 = texto escuro para variância de projeção
      }
      const skewAngle = estimateSkewAngleFromProjection(grayPixels, targetW, targetH, -12, 12, 1);
      if (Math.abs(skewAngle) >= 1) {
        canvas = rotateCanvasByDegrees(canvas, -skewAngle);
      }
    }
  } catch (_) {}

  return canvas;
}

export async function performBrowserClientOcr(base64Image, fileName = 'documento.jpg') {
  if (!base64Image || typeof base64Image !== 'string') {
    return { success: false, text: '', data: {}, source: 'invalid_input' };
  }

  let effectiveImage = base64Image;

  // Se a entrada for um PDF escaneado (data:application/pdf ou nome .pdf), tenta extrair imagem embutida
  if (base64Image.startsWith('data:application/pdf') || base64Image.startsWith('%PDF-') || fileName.toLowerCase().endsWith('.pdf')) {
    const extractedImg = extractFirstPdfImageAsDataUrl(base64Image);
    if (extractedImg) {
      effectiveImage = extractedImg;
    }
  }

  let combinedText = '';
  let sourceUsed = 'browser_heuristic';
  let ocrTargetInput = effectiveImage;

  const imgEl = await loadImageFromBase64(effectiveImage);
  if (imgEl) {
    const barcodeText = await detectNativeBarcodes(imgEl);
    if (barcodeText) {
      combinedText += barcodeText + '\n';
      sourceUsed = 'chrome_barcode_detector';
    }
    let upscaledCanvas = upscaleAndEnhanceImageElement(imgEl, 1600, { applyOtsu: true, applyDeskew: false });
    if (upscaledCanvas) {
      const bytes = base64ToUint8Array(effectiveImage);
      if (bytes) {
        const orientation = detectExifOrientation(bytes);
        const rotationDegrees = getRotationDegreesFromOrientation(orientation);
        if (rotationDegrees > 0) {
          upscaledCanvas = rotateCanvasByDegrees(upscaledCanvas, rotationDegrees);
        }
      }
      ocrTargetInput = upscaledCanvas;
    }
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
  const confidence = evaluateOcrConfidence(parsedData, cleaned);

  return {
    success: Boolean(cleaned.length > 0 || parsedData.cpf_cnpj || parsedData.valor),
    confidence,
    needsCloudBoost: confidence < 70,
    text: cleaned,
    data: parsedData,
    source: sourceUsed
  };
}
