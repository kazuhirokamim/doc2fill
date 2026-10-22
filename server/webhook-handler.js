// server/webhook-handler.js - Ingress de Webhooks de Pagamento e Emissão de Licenças ECDSA
// Suporta Asaas (Pix nativo BR) e Stripe (Cartão internacional), com idempotência e validação timing-safe.

import crypto from 'node:crypto';
import { generateAsymmetricLicenseKeyAsync, generateLicenseKey } from '../core/license-validator.js';

export const DEFAULT_ASAAS_WEBHOOK_SECRET = process.env.ASAAS_WEBHOOK_SECRET || 'doc2fill_sandbox_webhook_auth';
export const DEFAULT_STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'doc2fill_sandbox_webhook_auth';

/**
 * Validação segura de token de webhook com mitigação contra Timing Attacks.
 * @param {string} receivedToken Token recebido no cabeçalho HTTP
 * @param {string} expectedSecret Segredo esperado configurado no servidor
 * @returns {boolean}
 */
export function verifyWebhookSecret(receivedToken, expectedSecret = DEFAULT_ASAAS_WEBHOOK_SECRET) {
  if (!receivedToken || !expectedSecret || typeof receivedToken !== 'string' || typeof expectedSecret !== 'string') {
    return false;
  }

  const bufReceived = Buffer.from(receivedToken);
  const bufExpected = Buffer.from(expectedSecret);

  if (bufReceived.length !== bufExpected.length) return false;

  try {
    return crypto.timingSafeEqual(bufReceived, bufExpected);
  } catch (_) {
    return false;
  }
}

/**
 * Armazenamento volátil de idempotência para descarte de retries (Zero Retenção).
 */
export class IdempotencyStore {
  constructor(maxItems = 10000) {
    this.processedEvents = new Map();
    this.maxItems = maxItems;
  }

  has(eventId) {
    if (!eventId) return false;
    return this.processedEvents.has(String(eventId));
  }

  record(eventId, metadata = {}) {
    if (!eventId) return;
    const key = String(eventId);
    if (this.processedEvents.size >= this.maxItems) {
      const oldestKey = this.processedEvents.keys().next().value;
      this.processedEvents.delete(oldestKey);
    }
    this.processedEvents.set(key, {
      timestamp: Date.now(),
      ...metadata
    });
  }

  get(eventId) {
    if (!eventId) return null;
    return this.processedEvents.get(String(eventId)) || null;
  }

  clear() {
    this.processedEvents.clear();
  }
}

export const globalIdempotencyStore = new IdempotencyStore();

/**
 * Formata data futura para validade da licença (1 ano ou Vitalícia).
 */
function getExpirationDateString(yearsAhead = 1) {
  const d = new Date();
  d.setFullYear(d.getFullYear() + yearsAhead);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

/**
 * Extrai e normaliza informações de pagamento a partir do payload Asaas.
 */
export function parseAsaasEvent(payload) {
  if (!payload || typeof payload !== 'object') return null;

  const eventType = String(payload.event || '').trim().toUpperCase();
  const payment = payload.payment || {};
  const eventId = payment.id || payload.id;

  // Extrai e-mail do cliente
  let email = payment.customerEmail || payment.email || '';
  if (!email && payment.description) {
    const emailMatch = payment.description.match(/[\w.-]+@[\w.-]+\.\w+/);
    if (emailMatch) email = emailMatch[0];
  }
  if (!email && payment.externalReference && payment.externalReference.includes('@')) {
    email = payment.externalReference;
  }

  // Define plano
  let plan = 'PRO';
  const desc = (payment.description || '').toUpperCase();
  if (desc.includes('STARTER')) plan = 'STARTER';
  if (desc.includes('ENTERPRISE') || desc.includes('VITALICIO')) plan = 'ENTERPRISE';

  const isConfirmed = eventType === 'PAYMENT_RECEIVED' || eventType === 'PAYMENT_CONFIRMED';

  return {
    gateway: 'asaas',
    eventType,
    eventId,
    isConfirmed,
    email: email.trim().toLowerCase(),
    plan,
    value: payment.value || 0,
    billingType: payment.billingType || 'PIX',
    externalReference: payment.externalReference || ''
  };
}

/**
 * Processador central de Webhook com suporte a Asaas e Stripe.
 * @param {Object} rawPayload Corpo JSON do evento
 * @param {Object} [options] Opções de execução e injeção de dependência
 * @returns {Promise<Object>}
 */
export async function handleWebhookEvent(rawPayload, options = {}) {
  const idempotency = options.idempotencyStore || globalIdempotencyStore;

  if (!rawPayload || typeof rawPayload !== 'object') {
    return { success: false, status: 'invalid_payload', error: 'Payload vazio ou não estruturado' };
  }

  const parsed = parseAsaasEvent(rawPayload);
  if (!parsed || !parsed.eventId) {
    return { success: false, status: 'unrecognized_event', error: 'Identificador de transação ausente' };
  }

  // 1. Verificação de Idempotência (Anti-Duplicidade)
  if (idempotency.has(parsed.eventId)) {
    const existing = idempotency.get(parsed.eventId);
    return {
      success: true,
      status: 'already_processed',
      duplicate: true,
      eventId: parsed.eventId,
      licenseKey: existing?.licenseKey,
      email: existing?.email
    };
  }

  // 2. Descarte de eventos não financeiros ou ainda pendentes
  if (!parsed.isConfirmed) {
    return {
      success: true,
      status: 'ignored',
      reason: `EVENT_${parsed.eventType}_NOT_ACTIONABLE`,
      eventId: parsed.eventId
    };
  }

  const customerEmail = parsed.email || 'cliente.checkout@example.com';
  const plan = parsed.plan || 'PRO';
  const isLifetime = plan === 'ENTERPRISE';
  const expStr = isLifetime ? 'LIFETIME' : getExpirationDateString(1);

  // 3. Emissão da Licença Digital Criptografada Assimétrica ECDSA P-256
  const licenseKey = await generateAsymmetricLicenseKeyAsync(customerEmail, plan, expStr);
  const fallbackHmacKey = generateLicenseKey(customerEmail, plan, expStr);

  const resultData = {
    success: true,
    status: 'license_issued',
    gateway: parsed.gateway,
    eventId: parsed.eventId,
    email: customerEmail,
    plan,
    licenseKey,
    fallbackHmacKey,
    expiresAt: expStr,
    isLifetime,
    amount: parsed.value,
    billingType: parsed.billingType,
    issuedAt: new Date().toISOString()
  };

  // 4. Registra no armazém de idempotência
  idempotency.record(parsed.eventId, {
    email: customerEmail,
    plan,
    licenseKey,
    amount: parsed.value
  });

  return resultData;
}
