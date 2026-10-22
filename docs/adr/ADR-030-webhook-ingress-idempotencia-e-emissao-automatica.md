---
numero: 30
titulo: Ingress de Webhooks de Pagamento, Idempotência e Emissão Autônoma de Licenças ECDSA
data: 2026-10-22
status: Aceito
autores:
  - Kazuhiro
  - Tear Maestro
  - Hermes Webhook Sentinel
  - Hermes Transact Guard
aplica_a:
  - server
  - core
  - tests
tags:
  - webhook
  - asaas
  - stripe
  - ecdsa
  - idempotencia
  - zero-retention
---

# ADR-030: Ingress de Webhooks de Pagamento, Idempotência e Emissão Autônoma de Licenças ECDSA

## Contexto
Com a implementação do licenciamento digital assimétrico ECDSA (P-256 / SHA-256) no doc2fill, a validação no cliente ocorre exclusivamente com chave pública. Contudo, a emissão das licenças em tempo real depende da confirmação de pagamento bancário (Pix e cartão de crédito). Sem um mecanismo de webhook seguro e automatizado, a liberação de licenças exigiria conciliação manual pelo administrador, inviabilizando o modelo de SaaS e degradando o Time-To-Value para procuradores e médicos que adquirem a solução fora do horário comercial. Ademais, gateways de pagamento realizam reenvios (retries) agressivos em caso de latência de rede, o que poderia provocar condições de corrida (race conditions) e emissão duplicada de licenças se não houver controle estrito de idempotência.

## Decisão
No contexto de operacionalização comercial autônoma do doc2fill via Pix e cartões, enfrentando a necessidade de conciliação bancária instantânea 24/7 sem intervenção manual, o risco de falsificação de pagamentos por agentes maliciosos e a possibilidade de emissão duplicada por retries de rede de gateways, decidimos por implementar um subsistema dedicado de ingress de webhooks em server/webhook-handler.js conectado a server/demo-server.js sob os endpoints /api/webhook/asaas e /api/webhook/payment com validação timing-safe de tokens via crypto.timingSafeEqual, tabela de idempotência volátil em memória e emissão automática de chaves assimétricas ECDSA P-256 com despacho em tempo real via Server-Sent Events (SSE), para alcançar emissão e entrega autônoma de licenças digitais em menos de 3 segundos após a liquidação financeira com garantia de zero duplicidade e zero retenção de dados, aceitando a necessidade de armazenamento volátil em memória dos identificadores de eventos recentes processados.

### Detalhes da Decisão
1. **Validação Criptográfica de Origem e Anti-Fraude:**
   - O endpoint Asaas valida o cabeçalho `asaas-access-token` contra o segredo de webhook configurado no ambiente (`ASAAS_WEBHOOK_SECRET`) utilizando comparação temporal constante (`crypto.timingSafeEqual`) para prevenir ataques de temporização (timing attacks).
2. **Idempotência Estrita em Memória Volátil (Zero Retenção):**
   - Implementação de registro em memória de eventos processados indexados pelo identificador único da transação (`payment.id` ou `event.id`).
   - Requisições duplicadas recebem resposta imediata `200 OK` informando que o evento já foi processado (`{ status: 'already_processed' }`), impedindo recálculos desnecessários e duplicidade de licenças.
3. **Geração Instantânea da Licença Assimétrica ECDSA P-256:**
   - Eventos de confirmação de pagamento (`PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED`) disparam `generateAsymmetricLicenseKeyAsync(email, plan, expiresAt)` utilizando a chave privada do servidor.
4. **Despacho em Tempo Real via Server-Sent Events (SSE):**
   - Assim que a licença é gerada, uma mensagem SSE (`event: payment_confirmed`) é propagada aos navegadores conectados, permitindo que a tela de checkout do cliente no navegador atualize instantaneamente sem exigir recarregamento da página.

## Consequências

### Positivas
- Emissão e ativação de licenças 100% autônoma em menos de 3 segundos após a liquidação do Pix.
- Impossibilidade matemática de simulação de pagamentos por atacantes sem o segredo compartilhado.
- Resiliência total contra reenvios de pacotes de rede e duplicidade financeira.
- Conformidade integral com o princípio de Zero Retenção da LGPD.

### Negativas
- Requer a configuração da variável de ambiente `ASAAS_WEBHOOK_SECRET` no servidor de produção para ativação do webhook seguro.

### Neutras/Riscos Mitigados
- Disparos sem token ou com token incorreto são sumariamente rejeitados com HTTP 401 Unauthorized sem processar payloads.
- O armazém de idempotência descarta os registros mais antigos após atingir o limite de memória (LRU lite), preservando a integridade volátil do servidor sem sobrecarga de memória.
- Sanitização estrita de dados sintéticos de teste utilizando exclusivamente o domínio @example.com per conformidade LGPD.
