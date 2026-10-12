// core/history-store.js
// Armazenamento Local-First Rotativo de Histórico Recente (Zero Retenção na Nuvem)

const HISTORY_STORAGE_KEY = 'doc2fill_history';
const DEFAULT_MAX_ENTRIES = 10;

/**
 * Cria um adaptador de armazenamento em memória transitória para testes ou ambientes sem DOM.
 * @returns {Object}
 */
export function createMemoryStorage() {
  const store = new Map();
  return {
    async get(key) {
      return store.get(key) || null;
    },
    async set(key, value) {
      store.set(key, value);
    },
    async remove(key) {
      store.delete(key);
    },
    async clear() {
      store.clear();
    }
  };
}

/**
 * Resolve o adaptador de persistência adequado (custom, chrome.storage ou memória).
 * @param {Object} [customStorage]
 * @returns {Object}
 */
function resolveStorage(customStorage) {
  if (customStorage && typeof customStorage.get === 'function' && typeof customStorage.set === 'function') {
    return customStorage;
  }

  // Suporte à API nativa de extensões Chrome
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return {
      get(key) {
        return new Promise((resolve) => {
          chrome.storage.local.get([key], (result) => {
            resolve(result ? result[key] : null);
          });
        });
      },
      set(key, value) {
        return new Promise((resolve) => {
          chrome.storage.local.set({ [key]: value }, resolve);
        });
      },
      remove(key) {
        return new Promise((resolve) => {
          chrome.storage.local.remove([key], resolve);
        });
      }
    };
  }

  // Fallback padrão em memória volátil
  return createMemoryStorage();
}

/**
 * Recupera os registros do histórico local ordenados do mais recente ao mais antigo.
 * @param {Object} [storage]
 * @returns {Promise<Array<Object>>}
 */
export function getRecentHistory(storage) {
  if (storage === null) {
    return Promise.resolve([]);
  }

  const adapter = resolveStorage(storage);
  try {
    return Promise.resolve(adapter.get(HISTORY_STORAGE_KEY)).then((data) => {
      if (Array.isArray(data)) {
        return data;
      }
      return [];
    }).catch(() => []);
  } catch (_) {
    return Promise.resolve([]);
  }
}

/**
 * Salva um resumo do documento processado no histórico local com rotação LRU.
 * @param {Object} documentRecord
 * @param {Object} [storage]
 * @param {number} [maxEntries=10]
 * @returns {Promise<Object|null>}
 */
export async function saveDocumentToHistory(documentRecord, storage, maxEntries = DEFAULT_MAX_ENTRIES) {
  if (!documentRecord || typeof documentRecord !== 'object') {
    return null;
  }

  // Exige ao menos fornecedor ou valor para registrar
  if (!documentRecord.fornecedor && !documentRecord.valor) {
    return null;
  }

  const adapter = resolveStorage(storage);
  const currentList = await getRecentHistory(storage);

  const entry = {
    id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    fornecedor: String(documentRecord.fornecedor || 'Desconhecido').trim(),
    valor: String(documentRecord.valor || '0,00').trim(),
    data: String(documentRecord.data || '').trim(),
    tipo_documento: String(documentRecord.tipo_documento || 'Outro Comprovante').trim(),
    numero_documento: String(documentRecord.numero_documento || '').trim(),
    cnpj: String(documentRecord.cnpj || documentRecord.cpf_cnpj || '').trim(),
    items: Array.isArray(documentRecord.items) ? documentRecord.items : []
  };

  const limit = typeof maxEntries === 'number' && maxEntries > 0 ? maxEntries : DEFAULT_MAX_ENTRIES;
  const updatedList = [entry, ...currentList].slice(0, limit);

  try {
    await adapter.set(HISTORY_STORAGE_KEY, updatedList);
    return entry;
  } catch (_) {
    return null;
  }
}

/**
 * Purga completamente os registros do histórico local sob demanda do usuário.
 * @param {Object} [storage]
 * @returns {Promise<boolean>}
 */
export async function clearHistory(storage) {
  if (storage === null) {
    return false;
  }

  const adapter = resolveStorage(storage);
  try {
    if (typeof adapter.remove === 'function') {
      await adapter.remove(HISTORY_STORAGE_KEY);
    } else {
      await adapter.set(HISTORY_STORAGE_KEY, []);
    }
    return true;
  } catch (_) {
    return false;
  }
}
