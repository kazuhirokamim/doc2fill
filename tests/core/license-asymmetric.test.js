// tests/core/license-asymmetric.test.js
// Suíte TDD - Sprint D: Licenciamento Digital Assimétrico ECDSA (NIST P-256) (REQ-004)
import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  generateAsymmetricLicenseKeyAsync,
  validateLicenseKeyAsync,
  generateLicenseKey,
  DOC2FILL_PUBLIC_ECDSA_KEY
} from '../../core/license-validator.js';

describe('doc2fill Sprint D: Licenciamento Digital Assimétrico ECDSA (TDD Suite)', () => {
  it('Cenário 1 (Happy Path): gera chave ECDSA assinada com chave privada e valida com chave pública', async () => {
    const email = 'procurador.federal@agu.gov.br';
    const plan = 'PRO';
    const expiresAt = '20281231';

    const licenseKey = await generateAsymmetricLicenseKeyAsync(email, plan, expiresAt);

    assert.ok(licenseKey.startsWith('D2F-PRO-20281231-E_'), 'Chave deve conter prefixo ECDSA E_');

    const result = await validateLicenseKeyAsync(email, licenseKey);

    assert.strictEqual(result.valid, true, 'Licença ECDSA legítima deve ser válida');
    assert.strictEqual(result.plan, 'PRO');
    assert.strictEqual(result.expiresAt, '2028-12-31');
    assert.strictEqual(result.algorithm, 'ECDSA-P256');
    assert.ok(result.daysRemaining > 300, 'Deve computar dias restantes');

    // Teste com plano Vitalício
    const lifetimeKey = await generateAsymmetricLicenseKeyAsync(email, 'ENTERPRISE', 'LIFETIME');
    const lifetimeRes = await validateLicenseKeyAsync(email, lifetimeKey);
    assert.strictEqual(lifetimeRes.valid, true);
    assert.strictEqual(lifetimeRes.isLifetime, true);
    assert.strictEqual(lifetimeRes.daysRemaining, Infinity);
  });

  it('Cenário 2 (Edge Case): rejeita assinaturas forjadas, adulteração de e-mail e preserva suporte a HMAC legado', async () => {
    const email = 'advogado@ccha.org.br';
    const plan = 'PRO';
    const expiresAt = '20270501';

    const legitimateKey = await generateAsymmetricLicenseKeyAsync(email, plan, expiresAt);

    // 1. Adulteração do e-mail (usar a chave de outro usuário)
    const forgedEmailRes = await validateLicenseKeyAsync('hacker@pirate.org', legitimateKey);
    assert.strictEqual(forgedEmailRes.valid, false, 'Não deve validar para e-mail diferente do portador');
    assert.strictEqual(forgedEmailRes.reason, 'ASSINATURA_ECDSA_INVALIDA');

    // 2. Adulteração da validade no payload da chave
    const forgedValidityKey = legitimateKey.replace('20270501', '20991231');
    const forgedValRes = await validateLicenseKeyAsync(email, forgedValidityKey);
    assert.strictEqual(forgedValRes.valid, false, 'Não deve validar se a data for adulterada na chave');
    assert.strictEqual(forgedValRes.reason, 'ASSINATURA_ECDSA_INVALIDA');

    // 3. Suporte a chave legada HMAC (retrocompatibilidade transparente)
    const legacyHmacKey = generateLicenseKey('legado@doc2fill.com', 'STARTER', 'LIFETIME');
    const legacyRes = await validateLicenseKeyAsync('legado@doc2fill.com', legacyHmacKey);
    assert.strictEqual(legacyRes.valid, true, 'Deve validar chaves HMAC legadas com sucesso');
    assert.strictEqual(legacyRes.plan, 'STARTER');
  });

  it('Cenário 3 (Error Path): chamadas defensivas com licença expirada, parâmetros nulos ou assinatura corrompida', async () => {
    const email = 'teste@expirado.com';

    // 1. Licença com data no passado (expirada)
    const expiredKey = await generateAsymmetricLicenseKeyAsync(email, 'PRO', '20200101');
    const expiredRes = await validateLicenseKeyAsync(email, expiredKey);
    assert.strictEqual(expiredRes.valid, false);
    assert.strictEqual(expiredRes.reason, 'LICENCA_EXPIRADA');

    // 2. Parâmetros inválidos ou nulos
    const nullRes = await validateLicenseKeyAsync(null, null);
    assert.strictEqual(nullRes.valid, false);
    assert.strictEqual(nullRes.reason, 'PARAMETROS_INVALIDOS');

    // 3. Assinatura base64url corrompida
    const corruptKey = 'D2F-PRO-20281231-E_assinatura_truncada_invalida';
    const corruptRes = await validateLicenseKeyAsync(email, corruptKey);
    assert.strictEqual(corruptRes.valid, false);
  });
});
