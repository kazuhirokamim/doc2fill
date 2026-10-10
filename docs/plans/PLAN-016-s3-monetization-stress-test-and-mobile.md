# PLAN-016: Sprint 3 — Hardening Mobile, Bateria de 20 Notas, Vídeo Demo e Checkout Pix 1-Click

## Metadados SDD
- **versao_plano:** 1.0.0
- **tipo:** feature
- **blast_radius:** médio
- **orcamento_tokens:** 35000

---

## 1. Visão Geral e Justificativa
A Sprint 3 é a fase culminante de estabilização técnica e prontidão comercial do doc2fill. Ela une o estresse algorítmico do Noesis (garantindo que o extrator processe 20 tipos heterogêneos de documentos fiscais com acurácia superior a 90%) com o arsenal de conversão e monetização do Swarm Hermes (PWA mobile com confirmação háptica de envio, vídeo demonstrativo de 30-45s, landing page com checkout Pix 1-Click e entrega de licença automatizada).

---

## 2. Opções Técnicas Avaliadas (Regra Tear #2)

### Opção 1: Gateway de Pagamento Externo com Iframe (Stripe / Mercado Pago Hosted)
- **Descrição:** Redirecionar o usuário para checkout externo hospedado por terceiros.
- **Prós:** Menos código de frontend no projeto.
- **Contras:** Aumenta a taxa de abandono de carrinho (quebra visual); exige credenciais de produção de gateway antes dos testes locais; não permite a virada de tela em 60 FPS com Server-Sent Events.

### Opção 2: Cobrança Manual por WhatsApp
- **Descrição:** Exibir apenas um botão de WhatsApp para o comprador solicitar chave.
- **Prós:** Zero código de checkout.
- **Contras:** Fricção enorme para o comprador; impossível escalar além de poucos clientes por dia; quebra a promessa de entrega em 2 cliques.

### Opção 3 (RECOMENDADA): Checkout Nativo Pix 1-Click Local-First com SSE e Virada de Tela (Swarm Hermes)
- **Descrição:** Implementar uma página de checkout integrada no design system Obsidian com Pix Copia e Cola instantâneo, QR Code SVG gerado na hora, canal SSE (`/api/checkout/events`) para virada de tela em tempo real no momento do pagamento, e despacho automatizado de chave de ativação.
- **Prós:** Conversão máxima sem fricção; compatível com demonstrações locais e produção; zero retenção de dados sensíveis; experiência visual de alto impacto.
- **Contras:** Requer implementação do endpoint de SSE e sincronização de eventos.

---

## 3. Não-Objetivos / Fora de Escopo
- Não integrar gateways de cartão de crédito internacionais nesta fase (foco exclusivo em Pix 1-Click no Brasil).
- Não persistir comprovantes de pagamento em disco (memória efêmera com Zero Retenção).
- Não violar o limite de 700 linhas por arquivo de código.

---

## 4. Requisitos EARS

| Requisito | Tipo Declarado | Especificação |
| :--- | :--- | :--- |
| REQ-001 | Event | Quando a foto da nota for enviada com sucesso pelo PWA mobile, o sistema deve emitir vibração háptica tátil no dispositivo. |
| REQ-002 | Ubiquitous | O sistema deve processar o lote de 20 documentos fiscais reais atingindo taxa de acurácia global superior a 90% nos 8 campos canônicos. |
| REQ-003 | State-driven | Enquanto o comprador estiver na tela de checkout Pix, o sistema deve manter conexão aberta via SSE para detectar a confirmação bancária. |
| REQ-004 | Event | Quando a confirmação de pagamento for recebida pelo SSE, o sistema deve virar a tela para o estado de sucesso e exibir a licença gerada e link de download. |
| REQ-005 | Ubiquitous | O sistema deve disponibilizar rota de checkout e materiais comerciais com licença e onboarding em dois cliques. |

---

## 5. Orçamentos Não-Funcionais
- **Limite de Linhas de Código (Regra #24):** Todos os arquivos de código mantidos estritamente abaixo de 700 linhas.
- **Tempo de Virada de Tela:** Confirmação e animação pós-pagamento em menos de 200ms após o evento.
- **Tamanho Máximo de Imagem:** Compressão e downscale no canvas mantendo payload menor que 300KB.

---

## 6. Hotspots Compartilhados
- `mobile-pwa/scanner.js`
- `server/demo-server.js`
- `tests/benchmark/test_benchmark_ocr_pipeline.py`
- `docs/marketing/ROTEIRO-VIDEO-DEMO-30S.md`

---

## 7. Tarefas (DAG)

## T1 — Confirmação Háptica no Mobile Scanner (`mobile-pwa/scanner.js`)
- **Requisitos:** REQ-001
- **Agent:** noesis-system-io-runtime
- **model:** gemini-2.5-pro
- **effort:** baixo
- **tempo:** 10m
- **Depends-on:** nenhum

## T2 — Bateria de Estresse com 20 Notas Fiscais (`tests/benchmark/`)
- **Requisitos:** REQ-002
- **Agent:** noesis-edge-case-extremist
- **model:** gemini-2.5-pro
- **effort:** médio
- **tempo:** 25m
- **Depends-on:** nenhum

## T3 — Roteiro de Demonstração e Vendas de 30-45s (`docs/marketing/`)
- **Requisitos:** REQ-005
- **Agent:** hermes-creative-director
- **model:** gemini-2.5-pro
- **effort:** médio
- **tempo:** 15m
- **Depends-on:** nenhum

## T4 — Landing Page e Checkout Pix 1-Click com SSE (`server/demo-server.js` e `demo-portal/checkout.html`)
- **Requisitos:** REQ-003, REQ-004
- **Agent:** hermes-frictionless-ui
- **model:** gemini-2.5-pro
- **effort:** médio
- **tempo:** 25m
- **Depends-on:** T1

## T5 — Homologação da Sprint 3 (`docs/semanas/SEMANA-03-MONETIZACAO-VENDAS.md`)
- **Requisitos:** REQ-001, REQ-002, REQ-003, REQ-004, REQ-005
- **Agent:** tear-code-reviewer
- **model:** gemini-2.5-pro
- **effort:** baixo
- **tempo:** 10m
- **Depends-on:** T1, T2, T3, T4

---

## 8. Matriz de Rastreabilidade

| Requisito | Tarefa | Teste |
| :--- | :--- | :--- |
| REQ-001 | T1 | tests/mobile/scanner-ocr.test.js |
| REQ-002 | T2 | tests/benchmark/test_benchmark_ocr_pipeline.py |
| REQ-003 | T4 | tests/server/demo-server.test.js |
| REQ-004 | T4 | tests/server/demo-server.test.js |
| REQ-005 | T4 | tests/server/demo-server.test.js |
