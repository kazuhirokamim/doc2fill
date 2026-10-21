// core/webrtc-peer.js - Orquestrador P2P WebRTC DataChannel (E2EE Zero Retenção)
// Permite envio direto de fotos/documentos do celular para o Sidepanel sem retenção em nuvem.

import {
  generateEcdhKeyPair,
  exportEcdhPublicKey,
  importEcdhPublicKey,
  deriveSharedAesKey,
  encryptE2EE,
  decryptE2EE
} from './e2ee-crypto.js';

export const DEFAULT_RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export const CHUNK_SIZE_BYTES = 16384; // 16 KB por fatia do canal WebRTC

/**
 * Divide payload em fatias seguras com metadados para remontagem.
 */
export function chunkPayload(payloadString, chunkSize = CHUNK_SIZE_BYTES) {
  if (!payloadString || typeof payloadString !== 'string') return [];
  const id = 'pld_' + Math.random().toString(36).substring(2, 9);
  const total = Math.ceil(payloadString.length / chunkSize);
  const chunks = [];

  for (let i = 0; i < total; i++) {
    const slice = payloadString.slice(i * chunkSize, (i + 1) * chunkSize);
    chunks.push({
      id,
      index: i,
      total,
      data: slice
    });
  }
  return chunks;
}

/**
 * Remontador de pacotes fracionados de canal P2P.
 */
export class PayloadReassembler {
  constructor() {
    this.buffers = new Map();
  }

  /**
   * Adiciona um chunk recebido. Retorna o payload completo se finalizado, ou null.
   */
  addChunk(chunk) {
    if (!chunk || !chunk.id || chunk.index === undefined || !chunk.total) return null;
    let entry = this.buffers.get(chunk.id);
    if (!entry) {
      entry = {
        total: chunk.total,
        chunks: new Array(chunk.total),
        receivedCount: 0
      };
      this.buffers.set(chunk.id, entry);
    }

    if (!entry.chunks[chunk.index]) {
      entry.chunks[chunk.index] = chunk.data;
      entry.receivedCount++;
    }

    if (entry.receivedCount === entry.total) {
      const fullPayload = entry.chunks.join('');
      this.buffers.delete(chunk.id);
      return fullPayload;
    }
    return null;
  }

  clear() {
    this.buffers.clear();
  }
}

/**
 * Sessão de Pareamento E2EE P2P
 */
export class SecurePeerSession {
  constructor(peerConnection, isInitiator = false) {
    this.pc = peerConnection;
    this.isInitiator = isInitiator;
    this.dataChannel = null;
    this.sharedAesKey = null;
    this.ecdhKeyPair = null;
    this.reassembler = new PayloadReassembler();
    this.onMessageCallback = null;
  }

  /**
   * Inicializa o par de chaves ECDH e prepara canal seguro.
   */
  async initialize() {
    this.ecdhKeyPair = await generateEcdhKeyPair();
    const publicJwk = await exportEcdhPublicKey(this.ecdhKeyPair.publicKey);
    return publicJwk;
  }

  /**
   * Processa a chave pública do peer e deriva a chave AES-GCM compartilhada.
   */
  async setPeerPublicKey(peerJwk) {
    if (!this.ecdhKeyPair) throw new Error('Sessão local não inicializada');
    const peerPubKey = await importEcdhPublicKey(peerJwk);
    this.sharedAesKey = await deriveSharedAesKey(this.ecdhKeyPair.privateKey, peerPubKey);
    return Boolean(this.sharedAesKey);
  }

  /**
   * Cifra e divide um documento para envio no DataChannel.
   */
  async prepareEncryptedChunks(rawDocumentJson) {
    if (!this.sharedAesKey) throw new Error('Canal E2EE não estabelecido (sem chave compartilhada)');
    const jsonStr = typeof rawDocumentJson === 'string' ? rawDocumentJson : JSON.stringify(rawDocumentJson);
    const encrypted = await encryptE2EE(this.sharedAesKey, jsonStr);
    const serialized = JSON.stringify(encrypted);
    return chunkPayload(serialized);
  }

  /**
   * Recebe um chunk bruto do DataChannel e decifra quando a mensagem estiver completa.
   */
  async handleIncomingChunk(chunk) {
    const fullSerialized = this.reassembler.addChunk(chunk);
    if (!fullSerialized) return null;

    if (!this.sharedAesKey) throw new Error('Chave E2EE ausente para decifrar payload recebido');
    const encryptedPayload = JSON.parse(fullSerialized);
    const decryptedJson = await decryptE2EE(this.sharedAesKey, encryptedPayload, true);
    return JSON.parse(decryptedJson);
  }
}
