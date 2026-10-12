import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateLicenseKey,
  validateLicenseKey,
  formatLicenseDisplay
} from '../../core/license-validator.js';

describe('Doc2Fill Offline Cryptographic License Validator Suite (TDD)', () => {
  // Cenário 1: Caminho feliz (Happy Path)
  it('Cenário 1 (Happy Path): gera e valida chave legítima amarrada ao e-mail para plano PRO e STARTER', () => {
    const email = 'procurador.marcelo@exemplo.com';
    const futureDate = '20261231'; // 31/12/2026

    // Gera chave PRO
    const proKey = generateLicenseKey(email, 'PRO', futureDate);
    assert.ok(proKey.startsWith('D2F-PRO-20261231-'), 'Chave deve conter prefixo canônico D2F-PRO');

    const proResult = validateLicenseKey(email, proKey);
    assert.strictEqual(proResult.valid, true, 'Licença PRO deve ser válida');
    assert.strictEqual(proResult.plan, 'PRO');
    assert.strictEqual(proResult.expiresAt, '2026-12-31');
    assert.ok(proResult.daysRemaining >= 0, 'Dias restantes deve ser positivo');

    // Gera chave STARTER
    const starterKey = generateLicenseKey('advogado@exemplo.com', 'STARTER', futureDate);
    const starterResult = validateLicenseKey('advogado@exemplo.com', starterKey);
    assert.strictEqual(starterResult.valid, true, 'Licença STARTER deve ser válida');
    assert.strictEqual(starterResult.plan, 'STARTER');

    // Formatação de exibição limpa
    assert.ok(formatLicenseDisplay(proResult).includes('PRO'));
  });

  // Cenário 2: Casos de borda (Edge Case)
  it('Cenário 2 (Edge Case): aceita e-mail com espaços/maiúsculas, plano BETA de 14 dias e chave vitalícia', () => {
    const emailNormal = 'usuario@exemplo.com';
    const emailComEspaco = '   Usuario@Exemplo.COM   ';
    const key = generateLicenseKey(emailNormal, 'PRO', '20261231');

    // Validação com e-mail não-higienizado deve funcionar igualmente
    const res = validateLicenseKey(emailComEspaco, key);
    assert.strictEqual(res.valid, true, 'Deve normalizar e-mail com maiúsculas e espaços');
    assert.strictEqual(res.plan, 'PRO');

    // Chave Vitalícia (LIFETIME)
    const lifetimeKey = generateLicenseKey(emailNormal, 'PRO', 'LIFETIME');
    const lifetimeRes = validateLicenseKey(emailNormal, lifetimeKey);
    assert.strictEqual(lifetimeRes.valid, true);
    assert.strictEqual(lifetimeRes.isLifetime, true);
    assert.strictEqual(lifetimeRes.expiresAt, 'Vitalícia');

    // Chave Beta de 14 dias
    const betaKey = generateLicenseKey(emailNormal, 'BETA', '20261101');
    const betaRes = validateLicenseKey(emailNormal, betaKey);
    assert.strictEqual(betaRes.valid, true);
    assert.strictEqual(betaRes.plan, 'BETA');
  });

  // Cenário 3: Tratamento de erro (Error Path)
  it('Cenário 3 (Error Path): rejeita chave usada por outro e-mail, chave expirada e formato corrompido', () => {
    const keyDoMarcelo = generateLicenseKey('marcelo@exemplo.com', 'PRO', '20261231');

    // Tentativa de uso do mesmo serial por outro usuário (Anti-Pirataria)
    const fakeRes = validateLicenseKey('outro.usuario@exemplo.com', keyDoMarcelo);
    assert.strictEqual(fakeRes.valid, false);
    assert.strictEqual(fakeRes.reason, 'ASSINATURA_INVALIDA', 'Deve impedir reuso da chave com outro e-mail');

    // Licença Expirada (data no passado)
    const expiredKey = generateLicenseKey('marcelo@exemplo.com', 'PRO', '20200101');
    const expiredRes = validateLicenseKey('marcelo@exemplo.com', expiredKey);
    assert.strictEqual(expiredRes.valid, false);
    assert.strictEqual(expiredRes.reason, 'LICENCA_EXPIRADA');

    // Chave com checksum adulterado
    const adulterada = keyDoMarcelo.substring(0, keyDoMarcelo.length - 2) + '00';
    const adulteradaRes = validateLicenseKey('marcelo@exemplo.com', adulterada);
    assert.strictEqual(adulteradaRes.valid, false);
    assert.strictEqual(adulteradaRes.reason, 'ASSINATURA_INVALIDA');

    // Formato inválido ou nulo
    assert.strictEqual(validateLicenseKey(null, null).valid, false);
    assert.strictEqual(validateLicenseKey('email@exemplo.com', 'CHAVE_QUALQUER').valid, false);
  });
});
