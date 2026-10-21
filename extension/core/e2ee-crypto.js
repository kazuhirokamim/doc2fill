// core/e2ee-crypto.js - Criptografia de Ponta a Ponta (E2EE) Zero-Knowledge
// Utiliza ECDH (P-256) para troca de chaves e AES-256-GCM para tráfego cifrado efêmero.
// Compatível com Node.js (v18+), Chrome Extensions MV3 e navegadores móveis (PWA).

const subtle = (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle)
  ? globalThis.crypto.subtle
  : null;

/**
 * Converte Uint8Array para string Base64URL segura.
 */
export function bytesToBase64Url(bytes) {
  if (!bytes) return '';
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const base64 = typeof btoa === 'function' ? btoa(binary) : Buffer.from(binary, 'binary').toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Converte string Base64URL para Uint8Array.
 */
export function base64UrlToBytes(base64url) {
  if (!base64url || typeof base64url !== 'string') return new Uint8Array(0);
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4 === 0 ? '' : '='.repeat(4 - (base64.length % 4));
  const binary = typeof atob === 'function' ? atob(base64 + pad) : Buffer.from(base64 + pad, 'base64').toString('binary');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Gera par de chaves efêmero ECDH (P-256) para sessão P2P.
 * @returns {Promise<{ publicKey: CryptoKey, privateKey: CryptoKey }>}
 */
export async function generateEcdhKeyPair() {
  if (!subtle) throw new Error('WebCrypto subtle indisponível no ambiente');
  return await subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  );
}

/**
 * Exporta chave pública ECDH em formato JWK.
 */
export async function exportEcdhPublicKey(key) {
  if (!subtle) throw new Error('WebCrypto subtle indisponível');
  return await subtle.exportKey('jwk', key);
}

/**
 * Importa chave pública ECDH a partir de formato JWK.
 */
export async function importEcdhPublicKey(jwk) {
  if (!subtle) throw new Error('WebCrypto subtle indisponível');
  return await subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    []
  );
}

/**
 * Deriva chave simétrica compartilhada AES-GCM de 256 bits via ECDH.
 */
export async function deriveSharedAesKey(privateKey, peerPublicKey) {
  if (!subtle) throw new Error('WebCrypto subtle indisponível');
  return await subtle.deriveKey(
    { name: 'ECDH', public: peerPublicKey },
    privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Cifra payload (texto ou Uint8Array) com AES-256-GCM gerando IV de 12 bytes aleatórios.
 * @param {CryptoKey} aesKey Chave simétrica derivada
 * @param {string|Uint8Array} data Dados em texto ou binário
 * @returns {Promise<{ iv: string, ciphertext: string }>}
 */
export async function encryptE2EE(aesKey, data) {
  if (!subtle) throw new Error('WebCrypto subtle indisponível');
  const rawBytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const iv = (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues)
    ? globalThis.crypto.getRandomValues(new Uint8Array(12))
    : new Uint8Array(12);

  const encryptedBuf = await subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    rawBytes
  );

  return {
    iv: bytesToBase64Url(new Uint8Array(iv)),
    ciphertext: bytesToBase64Url(new Uint8Array(encryptedBuf))
  };
}

/**
 * Decifra payload cifrado com AES-256-GCM e valida integridade.
 * @param {CryptoKey} aesKey Chave simétrica derivada
 * @param {{ iv: string, ciphertext: string }} payload Objeto cifrado
 * @param {boolean} [asString=true] Retorna string UTF-8 se true, senão Uint8Array
 * @returns {Promise<string|Uint8Array>}
 */
export async function decryptE2EE(aesKey, payload, asString = true) {
  if (!subtle) throw new Error('WebCrypto subtle indisponível');
  if (!payload || !payload.iv || !payload.ciphertext) {
    throw new Error('Payload E2EE inválido');
  }

  const ivBytes = base64UrlToBytes(payload.iv);
  const cipherBytes = base64UrlToBytes(payload.ciphertext);

  const decryptedBuf = await subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes },
    aesKey,
    cipherBytes
  );

  const decryptedBytes = new Uint8Array(decryptedBuf);
  return asString ? new TextDecoder().decode(decryptedBytes) : decryptedBytes;
}
