// tests/core/webrtc-e2ee.test.js
// Suíte TDD - Sprint C: Mobile Serverless WebRTC P2P (E2EE Zero Retenção)
import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  generateEcdhKeyPair,
  exportEcdhPublicKey,
  importEcdhPublicKey,
  deriveSharedAesKey,
  encryptE2EE,
  decryptE2EE
} from '../../core/e2ee-crypto.js';
import {
  chunkPayload,
  PayloadReassembler,
  SecurePeerSession
} from '../../core/webrtc-peer.js';

describe('doc2fill Sprint C: WebRTC P2P & E2EE Crypto Suite (TDD)', () => {
  it('Cenário 1 (Happy Path): derivação de chave ECDH mútua e cifragem/decifragem AES-GCM 256 bits', async () => {
    // 1. Peer A (Extensão Chrome) e Peer B (Mobile PWA) geram pares ECDH efêmeros
    const aliceKeys = await generateEcdhKeyPair();
    const bobKeys = await generateEcdhKeyPair();

    // 2. Exportam e trocam chaves públicas em formato JWK
    const alicePubJwk = await exportEcdhPublicKey(aliceKeys.publicKey);
    const bobPubJwk = await exportEcdhPublicKey(bobKeys.publicKey);

    // 3. Importam chave do par e derivam o segredo simétrico compartilhado
    const aliceImportedBob = await importEcdhPublicKey(bobPubJwk);
    const bobImportedAlice = await importEcdhPublicKey(alicePubJwk);

    const aliceSharedAes = await deriveSharedAesKey(aliceKeys.privateKey, aliceImportedBob);
    const bobSharedAes = await deriveSharedAesKey(bobKeys.privateKey, bobImportedAlice);

    assert.ok(aliceSharedAes, 'Alice deve ter chave AES derivada');
    assert.ok(bobSharedAes, 'Bob deve ter chave AES derivada');

    // 4. Bob cifra documento com dados sensíveis (LGPD / Sigilo)
    const sensitiveDoc = {
      tipo_documento: 'Cupom Fiscal',
      cnpj: '12.345.678/0001-95',
      valor: 'R$ 380,50',
      beneficiario: 'Advogado da União (AGU)',
      timestamp: Date.now()
    };
    const encrypted = await encryptE2EE(bobSharedAes, JSON.stringify(sensitiveDoc));

    assert.ok(encrypted.iv, 'Deve conter IV aleatório de 12 bytes');
    assert.ok(encrypted.ciphertext, 'Deve conter ciphertext codificado');
    assert.notStrictEqual(encrypted.ciphertext, JSON.stringify(sensitiveDoc), 'Texto não deve trafegar em claro');

    // 5. Alice decifra os dados
    const decryptedStr = await decryptE2EE(aliceSharedAes, encrypted, true);
    const recoveredDoc = JSON.parse(decryptedStr);

    assert.deepStrictEqual(recoveredDoc, sensitiveDoc, 'Documento decifrado deve ser idêntico ao original');
  });

  it('Cenário 2 (Edge Case): fatiamento em chunks de 16KB, remontagem e detecção de adulteração de ciphertext', async () => {
    // 1. Sessão SecurePeerSession de ponta a ponta
    const extensionSession = new SecurePeerSession(null, true);
    const mobileSession = new SecurePeerSession(null, false);

    const extPubJwk = await extensionSession.initialize();
    const mobPubJwk = await mobileSession.initialize();

    await extensionSession.setPeerPublicKey(mobPubJwk);
    await mobileSession.setPeerPublicKey(extPubJwk);

    // 2. Simula payload grande (64KB de imagem base64 simulada)
    const largeDummyImage = 'data:image/jpeg;base64,' + 'A'.repeat(65000);
    const docPayload = {
      name: 'recibo_longo.jpg',
      image: largeDummyImage,
      valor: '1.200,00'
    };

    // 3. Mobile prepara fatias cifradas
    const chunks = await mobileSession.prepareEncryptedChunks(docPayload);
    assert.ok(chunks.length >= 4, 'Payload de 65KB deve ser fatiado em pelo menos 4 chunks de 16KB');

    // 4. Extensão recebe chunks em ordem e remonta
    let finalDecrypted = null;
    for (const chunk of chunks) {
      const res = await extensionSession.handleIncomingChunk(chunk);
      if (res) finalDecrypted = res;
    }

    assert.ok(finalDecrypted, 'Deve remontar e decifrar o payload completo');
    assert.strictEqual(finalDecrypted.name, 'recibo_longo.jpg');
    assert.strictEqual(finalDecrypted.image.length, largeDummyImage.length);

    // 5. Detecção de adulteração (Integridade criptográfica AES-GCM)
    const validEncrypted = await encryptE2EE(mobileSession.sharedAesKey, 'teste_integridade');
    const tamperedCiphertext = validEncrypted.ciphertext.slice(0, -4) + 'XXXX';
    const tamperedPayload = { iv: validEncrypted.iv, ciphertext: tamperedCiphertext };

    await assert.rejects(
      async () => {
        await decryptE2EE(extensionSession.sharedAesKey, tamperedPayload);
      },
      /operation failed|tag mismatch|cipher/i,
      'Adulteração do ciphertext deve falhar na validação da tag GCM'
    );
  });

  it('Cenário 3 (Error Path): chamadas defensivas com payload nulo, sem chave compartilhada ou fatiamento inválido', async () => {
    // 1. Fatiamento com string vazia
    const emptyChunks = chunkPayload('');
    assert.deepStrictEqual(emptyChunks, []);

    // 2. Remontador com chunks inválidos
    const reassembler = new PayloadReassembler();
    assert.strictEqual(reassembler.addChunk(null), null);
    assert.strictEqual(reassembler.addChunk({}), null);

    // 3. Decifragem sem IV ou dados
    const dummyKey = await deriveSharedAesKey(
      (await generateEcdhKeyPair()).privateKey,
      (await generateEcdhKeyPair()).publicKey
    );

    await assert.rejects(
      async () => {
        await decryptE2EE(dummyKey, {});
      },
      /Payload E2EE inválido/
    );

    // 4. Sessão sem chave tentando cifrar
    const uninitializedSession = new SecurePeerSession(null);
    await assert.rejects(
      async () => {
        await uninitializedSession.prepareEncryptedChunks({ teste: 1 });
      },
      /Canal E2EE não estabelecido/
    );
  });
});
