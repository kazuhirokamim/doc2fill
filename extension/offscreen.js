// extension/offscreen.js - Worker de OCR e IA Local em Janela Offscreen (Chrome MV3)
import { performBrowserClientOcr } from './core/browser-ocr.js';
import { cleanOcrText, processOcrText } from './core/ocr-engine.js';

/**
 * Consulta a API de IA local (Gemini Nano) caso disponível no navegador (Chrome 128+ com window.ai).
 * @param {string} textContext Texto bruto extraído do documento
 * @returns {Promise<string>}
 */
export async function promptGeminiNanoIfAvailable(textContext) {
  if (!textContext || typeof textContext !== 'string') return '';
  if (typeof globalThis.ai !== 'undefined' && globalThis.ai.languageModel) {
    try {
      const caps = await globalThis.ai.languageModel.capabilities();
      if (caps && (caps.available === 'readily' || caps.available === 'after-download')) {
        const session = await globalThis.ai.languageModel.create({
          systemPrompt: 'Você é um assistente especialista em extrair dados fiscais e médicos (CNPJ, CPF, Data, Valor, Chave de Acesso, N° Documento, TUSS). Responda com os dados identificados.'
        });
        const prompt = `Analise o seguinte texto OCR e extraia os campos fiscais:\n\n${textContext.slice(0, 2000)}`;
        const result = await session.prompt(prompt);
        if (typeof session.destroy === 'function') session.destroy();
        return result || '';
      }
    } catch (_) {}
  }
  return '';
}

/**
 * Processa requisições de OCR no ambiente Offscreen desacoplado da interface.
 * @param {Object} message Payload contendo { base64Image, fileName }
 * @returns {Promise<Object>}
 */
export async function handleOffscreenOcrRequest(message) {
  const { base64Image, fileName = 'documento.jpg' } = message || {};
  if (!base64Image || typeof base64Image !== 'string') {
    return {
      success: false,
      text: '',
      data: {},
      source: 'offscreen_invalid_input',
      error: 'Imagem base64 ausente ou inválida'
    };
  }

  // 1. Executa visão computacional via BarcodeDetector / Tesseract WASM no contexto offscreen
  const ocrResult = await performBrowserClientOcr(base64Image, fileName);

  // 2. Se houver texto extraído, tenta refinamento via Gemini Nano nativo
  if (ocrResult && ocrResult.text) {
    const nanoEnrichment = await promptGeminiNanoIfAvailable(ocrResult.text);
    if (nanoEnrichment) {
      ocrResult.nanoText = nanoEnrichment;
      ocrResult.source = (ocrResult.source || 'client_ocr') + '+gemini_nano';
      const enrichedParsed = processOcrText(`${ocrResult.text}\n${nanoEnrichment}`, fileName);
      ocrResult.data = { ...(ocrResult.data || {}), ...enrichedParsed };
    }
  }

  return {
    ...ocrResult,
    offscreen: true
  };
}

/**
 * Inicializa o listener de mensagens do Chrome Runtime.
 */
export function initOffscreenListener() {
  if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message && message.target === 'offscreen' && message.type === 'RECOGNIZE_IMAGE') {
        handleOffscreenOcrRequest(message)
          .then((res) => sendResponse(res))
          .catch((err) => {
            sendResponse({
              success: false,
              text: '',
              data: {},
              source: 'offscreen_exception',
              error: err?.message || 'Erro interno no worker offscreen'
            });
          });
        return true; // Mantém o canal de resposta assíncrona aberto
      }
    });
  }
}

initOffscreenListener();
