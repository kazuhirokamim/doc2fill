// extension/offscreen-client.js - Gerenciador do Ciclo de Vida do Documento Offscreen
// Permite que o Sidepanel execute OCR em segundo plano sem congelar o DOM principal.

let isCreatingOffscreen = false;

/**
 * Garante que o documento offscreen do Chrome esteja ativo e pronto para receber mensagens.
 * @param {string} path Caminho do HTML offscreen (relativo à extensão)
 * @returns {Promise<boolean>}
 */
export async function ensureOffscreenDocument(path = 'offscreen.html') {
  if (typeof chrome === 'undefined' || !chrome.offscreen || !chrome.offscreen.createDocument) {
    return false;
  }

  try {
    const offscreenUrl = chrome.runtime.getURL(path);

    // 1. Verifica se já existe um documento offscreen ativo
    if (typeof chrome.runtime.getContexts === 'function') {
      const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
        documentUrls: [offscreenUrl]
      });
      if (existingContexts && existingContexts.length > 0) {
        return true;
      }
    }

    if (isCreatingOffscreen) return true;
    isCreatingOffscreen = true;

    // 2. Cria o documento offscreen isolado
    await chrome.offscreen.createDocument({
      url: path,
      reasons: ['WORKERS', 'BLOBS', 'DOM_PARSER'],
      justification: 'Processamento de visão computacional e OCR desacoplado da interface'
    });

    isCreatingOffscreen = false;
    return true;
  } catch (err) {
    isCreatingOffscreen = false;
    // Se o documento já existe, o Chrome lança erro esperado
    if (err && err.message && err.message.includes('Only a single offscreen document')) {
      return true;
    }
    console.warn('[doc2fill] Aviso ao preparar offscreen document:', err?.message || err);
    return false;
  }
}

/**
 * Envia uma imagem para reconhecimento OCR na janela offscreen com timeout de segurança.
 * @param {string} base64Image Imagem codificada em base64
 * @param {string} fileName Nome do arquivo para inferência de tipo
 * @param {number} timeoutMs Tempo limite antes de desistir (default 15s)
 * @returns {Promise<Object>}
 */
export async function executeOffscreenOcr(base64Image, fileName = 'documento.jpg', timeoutMs = 15000) {
  if (!base64Image || typeof base64Image !== 'string') {
    return { success: false, text: '', data: {}, source: 'invalid_image', error: 'Imagem base64 vazia' };
  }

  // 1. Assegura existência do documento offscreen
  const hasOffscreen = await ensureOffscreenDocument('offscreen.html');
  if (!hasOffscreen) {
    return { success: false, text: '', data: {}, source: 'offscreen_unavailable', error: 'API chrome.offscreen indisponível' };
  }

  // 2. Despacha mensagem com timeout defensivo
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve({
          success: false,
          text: '',
          data: {},
          source: 'offscreen_timeout',
          error: `Timeout de processamento (${timeoutMs}ms) excedido`
        });
      }
    }, timeoutMs);

    try {
      chrome.runtime.sendMessage(
        {
          target: 'offscreen',
          type: 'RECOGNIZE_IMAGE',
          base64Image,
          fileName
        },
        (response) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);

          if (chrome.runtime.lastError) {
            resolve({
              success: false,
              text: '',
              data: {},
              source: 'offscreen_message_error',
              error: chrome.runtime.lastError.message
            });
            return;
          }

          if (response && response.success !== undefined) {
            resolve(response);
          } else {
            resolve({
              success: false,
              text: '',
              data: {},
              source: 'offscreen_empty_response',
              error: 'Resposta vazia ou inválida do worker'
            });
          }
        }
      );
    } catch (err) {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve({
          success: false,
          text: '',
          data: {},
          source: 'offscreen_dispatch_error',
          error: err?.message || 'Falha ao despachar mensagem'
        });
      }
    }
  });
}
