// tests/server/webhook-handler.test.js
// Suíte TDD - Ingress de Webhooks de Pagamento e Emissão de Licenças ECDSA (ADR-030)
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import {
  verifyWebhookSecret,
  handleWebhookEvent,
  IdempotencyStore,
  DEFAULT_ASAAS_WEBHOOK_SECRET
} from '../../server/webhook-handler.js';
import { validateLicenseKeyAsync } from '../../core/license-validator.js';

describe('doc2fill Webhook Ingress & Idempotency Suite (TDD)', () => {
  let testStore;

  beforeEach(() => {
    testStore = new IdempotencyStore();
  });

  it('Cenário 1 (Happy Path): processa evento PAYMENT_RECEIVED e emite licença ECDSA válida', async () => {
    const asaasPayload = {
      event: 'PAYMENT_RECEIVED',
      payment: {
        id: 'pay_99887766',
        customer: 'cus_123456',
        value: 49.00,
        billingType: 'PIX',
        status: 'RECEIVED',
        description: 'Assinatura doc2fill Pro Anual - procurador.agu@example.com',
        externalReference: 'order_1001'
      }
    };

    const result = await handleWebhookEvent(asaasPayload, { idempotencyStore: testStore });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.status, 'license_issued');
    assert.strictEqual(result.email, 'procurador.agu@example.com');
    assert.strictEqual(result.plan, 'PRO');
    assert.ok(result.licenseKey.startsWith('D2F-PRO-'), 'Chave emitida deve ser do plano PRO');
    assert.ok(result.licenseKey.includes('-E_'), 'Chave deve conter assinatura assimétrica ECDSA');

    // Validação criptográfica da chave emitida contra a chave pública
    const validation = await validateLicenseKeyAsync(result.email, result.licenseKey);
    assert.strictEqual(validation.valid, true, 'Licença emitida pelo webhook deve ser 100% válida');
    assert.strictEqual(validation.plan, 'PRO');
    assert.strictEqual(validation.algorithm, 'ECDSA-P256');
  });

  it('Cenário 2 (Edge Case): idempotência descarta retry do gateway e eventos não-financeiros são ignorados', async () => {
    const asaasPayload = {
      event: 'PAYMENT_CONFIRMED',
      payment: {
        id: 'pay_retry_123',
        value: 490.00,
        billingType: 'PIX',
        customerEmail: 'medico.perito@example.com',
        description: 'Plano ENTERPRISE Vitalício'
      }
    };

    // 1º Disparo do Webhook
    const firstCall = await handleWebhookEvent(asaasPayload, { idempotencyStore: testStore });
    assert.strictEqual(firstCall.status, 'license_issued');
    assert.strictEqual(firstCall.plan, 'ENTERPRISE');
    assert.strictEqual(firstCall.isLifetime, true);

    // 2º Disparo (Retry de rede pelo Asaas)
    const secondCall = await handleWebhookEvent(asaasPayload, { idempotencyStore: testStore });
    assert.strictEqual(secondCall.success, true);
    assert.strictEqual(secondCall.status, 'already_processed');
    assert.strictEqual(secondCall.duplicate, true);
    assert.strictEqual(secondCall.licenseKey, firstCall.licenseKey, 'Deve retornar a chave já emitida sem gerar nova');

    // Evento não financeiro / informativo
    const pendingEvent = {
      event: 'PAYMENT_CREATED',
      payment: { id: 'pay_pending_456', value: 49.00 }
    };
    const ignoredCall = await handleWebhookEvent(pendingEvent, { idempotencyStore: testStore });
    assert.strictEqual(ignoredCall.success, true);
    assert.strictEqual(ignoredCall.status, 'ignored');
    assert.strictEqual(ignoredCall.reason, 'EVENT_PAYMENT_CREATED_NOT_ACTIONABLE');
  });

  it('Cenário 3 (Error Path): rejeita tokens forjados, payloads inválidos e valida endpoint HTTP', async () => {
    // 1. Verificação de token
    const validSecret = 'sandbox_test_auth_sample';
    assert.strictEqual(verifyWebhookSecret('sandbox_test_auth_sample', validSecret), true);
    assert.strictEqual(verifyWebhookSecret('token_forjado_teste', validSecret), false);
    assert.strictEqual(verifyWebhookSecret(null, validSecret), false);
    assert.strictEqual(verifyWebhookSecret('', validSecret), false);

    // 2. Payload nulo ou vazio
    const invalidResult = await handleWebhookEvent(null);
    assert.strictEqual(invalidResult.success, false);
    assert.strictEqual(invalidResult.status, 'invalid_payload');

    // 3. Teste de integração HTTP no servidor demo-server
    const serverModule = await import('../../server/demo-server.js');
    const { createAppServer } = serverModule;
    const testPort = 9088;
    const server = createAppServer(testPort);

    await new Promise((resolve) => server.listen(testPort, resolve));

    try {
      // 3.1 Requisição sem token -> deve retornar 401
      const resUnauth = await fetch(`http://127.0.0.1:${testPort}/api/webhook/asaas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'PAYMENT_RECEIVED' })
      });
      assert.strictEqual(resUnauth.status, 401, 'Requisição sem cabeçalho de token deve retornar 401');

      // 3.2 Requisição com token correto -> deve retornar 200
      const resAuth = await fetch(`http://127.0.0.1:${testPort}/api/webhook/asaas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'asaas-access-token': DEFAULT_ASAAS_WEBHOOK_SECRET
        },
        body: JSON.stringify({
          event: 'PAYMENT_RECEIVED',
          payment: {
            id: 'pay_http_test_1',
            value: 49.00,
            billingType: 'PIX',
            customerEmail: 'teste.http@example.com',
            description: 'Assinatura Pro'
          }
        })
      });
      assert.strictEqual(resAuth.status, 200, 'Requisição autenticada deve retornar 200');
      const bodyJson = await resAuth.json();
      assert.strictEqual(bodyJson.success, true);
      assert.strictEqual(bodyJson.status, 'license_issued');
      assert.ok(bodyJson.licenseKey.includes('-E_'));
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
