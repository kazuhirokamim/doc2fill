---
numero: 23
titulo: Monetizacao Hermes, Hardening Mobile e Bateria de Estresse
data: 2026-10-09
status: Aceito
autores:
  - Kazuhiro
  - Tear Maestro
  - Hermes Frictionless UI
  - Noesis Edge Case Extremist
aplica_a:
  - mobile-pwa
  - server
  - tests
  - marketing
tags:
  - monetization
  - pix-checkout
  - sse-events
  - mobile-haptic
  - stress-test
---

# ADR-023: Monetização Hermes, Hardening Mobile e Bateria de Estresse

## Contexto
O projeto **doc2fill** atingiu a maturidade funcional das Sprints 1 e 2, necessitando agora de validação empírica sob estresse com 20 documentos fiscais reais e da infraestrutura de go-to-market. Para viabilizar a monetização ágil e fricção zero no mercado brasileiro, precisamos de um fluxo de vendas de alta conversão baseado em Pix 1-Click com virada de tela em tempo real via Server-Sent Events (SSE), além de feedback háptico no scanner mobile e roteiro audiovisual de demonstração.

## Decisão
No contexto de preparação comercial e hardening do doc2fill para a Sprint 3, enfrentando a lentidão e abandono típicos de checkouts com múltiplos formulários e a necessidade de comprovar estabilidade do extrator fiscal sob alta variedade documental, decidimos por integrar confirmação háptica no PWA mobile, expandir a bateria cega de testes para 20 documentos fiscais heterogêneos comprovando acurácia superior a 90%, e implementar o checkout nativo Pix 1-Click com virada de tela via SSE na rota de vendas e entrega instantânea de licença em 2 cliques, para alcançar conversão imediata e prova irrefutável de qualidade antes do lançamento público, aceitando a simulação de webhooks bancários em ambiente de demonstração local.

### Detalhes da Decisão
1. **Confirmação Háptica no Mobile Scanner (S3-T1):**
   - Adição de vibração tátil padrão (`navigator.vibrate([40, 30, 40])`) ao receber a confirmação de upload da foto no smartphone.
2. **Bateria de Estresse de 20 Documentos Fiscais (S3-T2):**
   - Inclusão e avaliação de 20 casos heterogêneos (NFC-e de combustíveis e varejo, NFS-e de serviços e saúde, DANFE NF-e e recibos de profissionais liberais), exigindo acurácia superior a 90% nos 8 campos canônicos.
3. **Roteiro e Storyboard do Vídeo de Vendas (S3-T3):**
   - Estruturação técnica do vídeo em 4 atos objetivos (0 a 35 segundos) ancorando o valor de economia de tempo perante o CCHA.
4. **Checkout Pix 1-Click com SSE e Virada de Tela (S3-T4):**
   - Página `/checkout` com design system Obsidian Cyber-Tátil.
   - Endpoint `/api/checkout/pix` para geração de código Pix Copia e Cola e QR Code SVG.
   - Endpoint `/api/checkout/events` com Server-Sent Events (SSE) disparando a virada de tela para sucesso e exibição da chave de licença.
5. **Despacho Automático e Guias (S3-T5):**
   - Roteiro de onboarding e guia de instalação em 2 cliques.

## Consequências

### Positivas
- Experiência de compra moderna, fluida e com conversão maximizada via Pix.
- Comprovação matemática de robustez e acurácia fiscal em 20 documentos reais.
- Scanner mobile com retorno sensorial tátil imediato.

### Negativas
- Adição de rotas de checkout e SSE no servidor local de demonstração.

### Neutras/Riscos Mitigados
- Todos os dados transitórios de pagamento operam na memória efêmera local com Zero Retenção e sem armazenamento de dados bancários de clientes.
