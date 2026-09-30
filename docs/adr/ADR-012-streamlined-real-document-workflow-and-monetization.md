---
numero: 12
titulo: Fluxo Real de Documentos sem Mocks e Arquitetura de Monetização Q4/2026
data: 2026-09-29
status: Aceito
autores:
  - Kazuhiro
  - Tear Maestro
aplica_a:
  - extension
  - core
  - mobile-pwa
  - server
tags:
  - real-documents
  - zero-mocks
  - sidepanel
  - monetization
  - q4-2026
---

# ADR-012: Fluxo Real de Documentos sem Mocks e Arquitetura de Monetização Q4/2026

## Contexto
O projeto **doc2fill** tem como propósito central a extração automatizada de dados fiscais (cupons fiscais térmicos, NFS-e, recibos profissionais) e o preenchimento automático no portal CCHA e sistemas análogos.

Identificou-se que a presença de uma aba de demonstração fictícia ("Teste Rápido") com dados pré-carregados (Dr. Lucas Silva / R$ 14.850,00) estava poluindo o fluxo de testes, gerando confusão operacional e mascarando falhas reais no pipeline de OCR e drag-and-drop. Além disso, para transformar o projeto em um produto viável e lucrativo até o final de 2026, faz-se necessária uma arquitetura formal de quotas, tiers de assinatura e distribuição ágil (Extensão Chrome + PWA Mobile).

## Decisão
No contexto de simplificação do fluxo de entrada de documentos do doc2fill e preparação da arquitetura comercial para o Q4/2026, enfrentando poluição de testes por dados mockados na aba "Teste Rápido" e necessidade de estruturação de receita recorrente até dezembro, decidimos por expurgar definitivamente a aba de testes rápidos tornando a aba de arquivos reais (PDF/Foto) a principal e padronizar o modelo de distribuição híbrida (Extensão Chrome + PWA Mobile) com controle de quotas mensais sem retenção de dados, para alcançar um fluxo de trabalho 100% fidedigno e monetizável com planos comerciais pagos, aceitando a remoção de atalhos sintéticos de demonstração na interface de produção.

### Detalhes da Decisão
1. **Zero Mocks em Produção (Real Document First)**: Expurgo da aba `tab-demo` e da função `btnLoadSample`. A interface inicia na aba `tab-file` para drag-and-drop direto de arquivos reais (PDF/Imagem) ou seleção via câmera do celular (`tab-qr`).
2. **Distribuição Híbrida sem Atrito**:
   - **Extensão Chrome**: Distribuição inicial via pacote assinado (developer mode) para early adopters em Outubro e publicação na Chrome Web Store em Novembro.
   - **Scanner Mobile**: PWA instalável no smartphone via leitura do QR Code efêmero. Essa decisão elimina a necessidade imediata de submissão a lojas móveis (App Store / Google Play) em 2026, evitando comissões de 30% e viabilizando cobrança por Pix e cartão já no primeiro mês de operação.
3. **Controle de Quotas e Licenciamento (Zero Retenção)**: O backend valida a licença/token e computa a quota mensal de leituras (15 no Free, 120 no Starter, 500 no Pro, 2.000 no Enterprise). Nenhum dado do documento fiscal é gravado em disco ou banco de dados.

## Consequências

### Positivas
- Eliminação definitiva de falsos positivos e mocks que interferiam nos testes com documentos reais.
- O usuário e os testadores entram diretamente no fluxo real de trabalho ao abrir o sidepanel.
- Viabilização de vendas imediatas e faturamento no Q4/2026 sem dependência de aprovações externas burocráticas nas lojas móveis.
- Conformidade total com a LGPD e o princípio de Zero Retenção.

### Negativas
- Demonstrações para novos prospects exigem o upload de um arquivo real (PDF ou foto) em vez de um clique em botão pré-preenchido.

### Neutras/Riscos Mitigados
- Risco de atrito na primeira experiência mitigado fornecendo arquivo PDF de teste real de cupom fiscal na documentação do projeto.
- Risco de rejeição na Chrome Web Store mitigado pela conformidade estrita com o Manifest V3 e o CSP sem eval.
