// core/cloud-ocr-client.js
// Cliente de Visão Computacional Cloud-Boost (Google Cloud Vision & Gemini Flash)
// Arquitetura Híbrida: Local-First com Turbo Opt-in e Zero Retenção no Backend.

import { processOcrText } from './ocr-engine.js';
import { normalizeCanonicalDocumentFields } from './document-parser.js';

export const GOOGLE_VISION_ENDPOINT = 'https://vision.googleapis.com/v1/images:annotate';
export const MIN_LOCAL_CONFIDENCE_THRESHOLD = 70;

/**
 * Prepara o payload JSON exigido pela Google Cloud Vision REST API.
 * Remove prefixo data URL (ex: 'data:image/jpeg;base64,') se presente.
 * @param {string} base64Image Imagem codificada em base64
 * @returns {object} Objeto pronto para serialização JSON
 */
export function formatGoogleVisionPayload(base64Image) {
  if (!base64Image || typeof base64Image !== 'string') {
    return { requests: [] };
  }

  const cleanBase64 = base64Image.includes(',')
    ? base64Image.split(',')[1]
    : base64Image;

  return {
    requests: [
      {
        image: {
          content: cleanBase64
        },
        features: [
          {
            type: 'DOCUMENT_TEXT_DETECTION'
          }
        ],
        imageContext: {
          languageHints: ['pt', 'en']
        }
      }
    ]
  };
}

/**
 * Extrai o texto contínuo consolidado a partir da resposta JSON do Google Cloud Vision.
 * @param {object} visionResponse Resposta serializada da API
 * @returns {string} Texto extraído do documento
 */
export function parseGoogleVisionResponse(visionResponse) {
  if (!visionResponse || typeof visionResponse !== 'object') {
    return '';
  }

  const responses = visionResponse.responses;
  if (!Array.isArray(responses) || responses.length === 0) {
    return '';
  }

  const first = responses[0];
  if (first.fullTextAnnotation && typeof first.fullTextAnnotation.text === 'string') {
    return first.fullTextAnnotation.text;
  }

  if (Array.isArray(first.textAnnotations) && first.textAnnotations.length > 0) {
    return first.textAnnotations[0].description || '';
  }

  return '';
}

/**
 * Avalia heuristicamente a completude e qualidade dos campos extraídos do documento.
 * Pontua presença de CNPJ/CPF, Valor monetário, Número do documento, Data e Fornecedor.
 * @param {object} parsedData Dados estruturados extraídos
 * @param {string} [rawText=''] Texto original
 * @returns {number} Score de confiança de 0 a 100
 */
export function evaluateOcrConfidence(parsedData = {}, rawText = '') {
  let score = 20; // Base inicial para detecção
  if (!parsedData || typeof parsedData !== 'object') return 0;

  // CNPJ / CPF válido e identificado
  if (parsedData.cpf_cnpj || parsedData.cnpj || parsedData.cpf) {
    score += 25;
  }

  // Valor total monetário formatado
  if (parsedData.valor && parsedData.valor.trim() !== '') {
    score += 20;
  }

  // Número do documento / NF / Chave
  if (parsedData.numero_documento || parsedData.chave_acesso) {
    score += 15;
  }

  // Data de emissão ou competência
  if (parsedData.data && parsedData.data.trim() !== '') {
    score += 10;
  }

  // Fornecedor ou Razão Social
  if (parsedData.fornecedor || parsedData.razao || parsedData.nome) {
    score += 10;
  }

  // Densidade de texto
  if (typeof rawText === 'string' && rawText.length > 100) {
    score = Math.min(100, score + 10);
  }

  return Math.min(100, score);
}

/**
 * Dispara requisição HTTP para a Google Cloud Vision API utilizando a chave informada.
 * Opera exclusivamente em memória (RAM) efêmera com Zero Retenção de dados no servidor.
 * @param {object} options
 * @param {string} options.base64Image Imagem em base64
 * @param {string} options.apiKey Chave de API Google Cloud Vision
 * @param {Function} [options.fetchFn=globalThis.fetch] Função fetch (injetável para testes)
 * @param {number} [options.timeoutMs=10000] Timeout em milissegundos
 * @returns {Promise<{ success: boolean, text: string, error?: string }>}
 */
export async function performCloudVisionOcr({
  base64Image,
  apiKey,
  fetchFn = globalThis.fetch,
  timeoutMs = 10000
}) {
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
    return { success: false, text: '', error: 'API_KEY_MISSING' };
  }

  if (!base64Image) {
    return { success: false, text: '', error: 'IMAGE_MISSING' };
  }

  const payload = formatGoogleVisionPayload(base64Image);
  const url = `${GOOGLE_VISION_ENDPOINT}?key=${encodeURIComponent(apiKey.trim())}`;

  let timeoutId = null;
  try {
    let signal;
    if (typeof AbortController !== 'undefined') {
      const controller = new AbortController();
      signal = controller.signal;
      timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    }

    const response = await fetchFn(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify(payload),
      signal
    });

    if (timeoutId) clearTimeout(timeoutId);

    if (!response.ok) {
      const statusText = response.statusText || `Status ${response.status}`;
      return {
        success: false,
        text: '',
        error: `HTTP_${response.status}: ${statusText}`
      };
    }

    const json = await response.json();
    const text = parseGoogleVisionResponse(json);

    return {
      success: Boolean(text && text.trim().length > 0),
      text: text || '',
      error: text ? null : 'EMPTY_CLOUD_RESPONSE'
    };
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId);
    return {
      success: false,
      text: '',
      error: err?.message || 'CLOUD_VISION_FETCH_ERROR'
    };
  }
}

/**
 * Orquestrador da Engine Híbrida de Escaneamento:
 * Avalia a extração do motor local. Se a confiança for suficiente, entrega de imediato.
 * Se a confiança for baixa (< minConfidenceThreshold) e houver chave configurada,
 * aciona o Cloud Boost com fallback suave para o resultado local caso a rede falhe.
 * @param {object} params
 * @param {object} params.localResult Resultado { text, confidence, data } do motor local
 * @param {string} params.base64Image Imagem original
 * @param {string} [params.fileName='documento.jpg']
 * @param {string} [params.apiKey=null] Chave do Google Cloud Vision
 * @param {Function} [params.cloudFetcher=null] Função customizada de chamada cloud (opcional)
 * @param {number} [params.minConfidenceThreshold=70] Limiar mínimo de aceitação local
 * @returns {Promise<object>} Objeto com { source, confidence, text, data, warning? }
 */
export async function requestHybridOcr({
  localResult,
  base64Image,
  fileName = 'documento.jpg',
  apiKey = null,
  cloudFetcher = null,
  minConfidenceThreshold = MIN_LOCAL_CONFIDENCE_THRESHOLD
}) {
  const localText = localResult?.text || '';
  const parsedLocal = localResult?.data || processOcrText(localText, fileName);
  const localConfidence = typeof localResult?.confidence === 'number'
    ? localResult.confidence
    : evaluateOcrConfidence(parsedLocal, localText);

  // 1. Caminho Feliz Local-First: Qualidade local suficiente
  if (localConfidence >= minConfidenceThreshold || (!apiKey && !cloudFetcher)) {
    return {
      source: 'local',
      confidence: localConfidence,
      text: localText,
      data: normalizeCanonicalDocumentFields(parsedLocal),
      needsCloudBoost: localConfidence < minConfidenceThreshold
    };
  }

  // 2. Acionamento do Cloud Boost
  try {
    let cloudResult = null;
    if (typeof cloudFetcher === 'function') {
      cloudResult = await cloudFetcher(base64Image);
    } else if (apiKey) {
      cloudResult = await performCloudVisionOcr({ base64Image, apiKey });
    }

    if (cloudResult && cloudResult.text && cloudResult.text.trim().length > 0) {
      const parsedCloud = processOcrText(cloudResult.text, fileName);
      const cloudConfidence = evaluateOcrConfidence(parsedCloud, cloudResult.text);

      return {
        source: 'cloud_boost',
        confidence: Math.max(cloudConfidence, localConfidence),
        text: cloudResult.text,
        data: normalizeCanonicalDocumentFields(parsedCloud),
        needsCloudBoost: false
      };
    }

    // Se Cloud retornou vazio ou erro suave, fallback para local
    return {
      source: 'local_fallback',
      confidence: localConfidence,
      text: localText,
      data: normalizeCanonicalDocumentFields(parsedLocal),
      warning: cloudResult?.error || 'Nuvem retornou sem texto. Mantido resultado local.',
      needsCloudBoost: true
    };
  } catch (err) {
    // 3. Fallback defensivo para o motor local
    return {
      source: 'local_fallback',
      confidence: localConfidence,
      text: localText,
      data: normalizeCanonicalDocumentFields(parsedLocal),
      warning: `Falha na requisição cloud (${err?.message || err}). Mantido motor local.`,
      needsCloudBoost: true
    };
  }
}
