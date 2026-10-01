# 🚀 Guia Prático Dia a Dia: Execução de Tarefas Atômicas no Doc2Fill
### *Padrão Antigravity + Tear + Noesis + Hermes*

---

## 🧭 O Ritual Diário Universal (Como Executar Qualquer Dia em 4 Passos)

Em qualquer dia de sprint, você só precisa seguir este ciclo padrão de 4 passos no chat do Antigravity:

```
[Passo 1: Abertura & Reprompt] ➔ Convocar Especialista + Padrão EARS
                  │
                  ▼
[Passo 2: TDD Antes do Código] ➔ Teste com 3 Cenários (Feliz, Borda, Erro)
                  │
                  ▼
[Passo 3: Código de Produção]  ➔ Implementação (< 700 linhas) + Testes Verdes
                  │
                  ▼
[Passo 4: Portão das 4 Lanes]  ➔ Auditoria Adversarial (Code, Sec, LGPD, Perf)
```

---

# 📅 SEMANA 1 (SPRINT 1) — Resolução do Core & Pipeline Funcional

---

### 🔹 DIA 1 (Segunda) — Tarefa S1-T1: Unificação do Handler de Upload (`handleDocumentFile`)
* **Objetivo:** Garantir que arrastar (Drag-and-Drop) ou selecionar um arquivo dispare o mesmo pipeline unificado com logs de depuração.
* **Agentes Especialistas:** `noesis-frontend-maestro` e `tear-frontend`.
* **Prompt para copiar e colar no Antigravity:**
```text
Ative o noesis-frontend-maestro e o tear-frontend para a tarefa S1-T1 do Doc2Fill.
Objetivo: Unificar os handlers de Drag-and-Drop (onDrop) e seleção nativa (onChange) na função 'handleDocumentFile' no Sidepanel.
Diretrizes Tear:
1. Primeiro, crie a suíte TDD em tests/ com os 3 cenários: arquivo válido (PNG/PDF), arquivo corrompido/nulo e múltiplos arquivos arrastados simultaneamente.
2. Implemente o handler unificado garantindo preventDefault, sanitização de extensão e emissão de evento de início de leitura.
3. Garanta que todos os testes passem verdes.
```

---

### 🔹 DIA 2 (Terça) — Tarefa S1-T2: Normalizador Canônico de Esquemas (`core/document-parser.js`)
* **Objetivo:** Traduzir todas as saídas de PDF e OCR para os 8 campos padronizados imutáveis do CCHA.
* **Agentes Especialistas:** `noesis-backend-maestro` e `noesis-domain-core`.
* **Prompt para copiar e colar no Antigravity:**
```text
Ative o noesis-backend-maestro e o noesis-domain-core para a tarefa S1-T2 do Doc2Fill.
Objetivo: Criar o normalizador canônico em 'core/document-parser.js'.
Requisitos:
- Receber dados brutos de OCR ou PDF e normalizar para exatamente 8 campos: tipo_documento, cpf_cnpj, fornecedor, numero_documento, data, valor, descritivo, motivo.
- Higienizar pontuações, normalizar acentos e validar datas (DD/MM/AAAA e ISO).
- Aplicar TDD com casos de borda: CNPJ com zeros à esquerda, valores monetários com vírgula/ponto e campos ausentes retornando string vazia segura (sem undefined/null).
```

---

### 🔹 DIA 3 (Quarta) — Tarefa S1-T3: Feedback Visual & Estados de Carregamento
* **Objetivo:** Adicionar spinner de loading, barra de progresso do OCR e desabilitar novo upload enquanto processa.
* **Agentes Especialistas:** `noesis-bento-tactile-designer` e `tear-frontend`.
* **Prompt para copiar e colar no Antigravity:**
```text
Ative o noesis-bento-tactile-designer e o tear-frontend para a tarefa S1-T3 do Doc2Fill.
Objetivo: Construir os estados de carregamento reativo do Sidepanel.
Requisitos:
- Microinteração visual clara com Obsidian Badges informando o status: 'Lendo PDF...', 'Executando OCR local...', 'Pronto para preenchimento'.
- Desabilitar a dropzone durante o processamento para evitar submissões concorrentes.
- Acessibilidade WCAG AA (Aria-live region informando aos leitores de tela a transição de estado).
```

---

### 🔹 DIA 4 (Quinta) — Tarefa S1-T4: Tratamento de Exceções & Sanitização de Imagens
* **Objetivo:** Lidar com imagens de baixa qualidade, PDFs corrompidos e timeouts do Tesseract com fallback amigável.
* **Agentes Especialistas:** `noesis-error-path-inquisitor` e `tear-qa`.
* **Prompt para copiar e colar no Antigravity:**
```text
Ative o noesis-error-path-inquisitor e o tear-qa para a tarefa S1-T4 do Doc2Fill.
Objetivo: Blindagem e tratamento de falhas no pipeline de extração.
Requisitos:
- Criar testes forçando: imagem 100% preta/ruído, PDF protegido por senha e payload vazio.
- O sistema não deve lançar exceções não tratadas no console; deve exibir card de alerta amigável: 'Não foi possível identificar o texto. Preencha manualmente ou envie outra foto'.
- Provar a resiliência rodando a suíte de testes.
```

---

### 🔹 DIA 5 (Sexta) — Tarefa S1-T5: Suíte TDD de Integração & Homologação Sprint 1
* **Objetivo:** Rodar bateria de testes com 10 documentos reais e fechar o portão das 4 lanes da Sprint 1.
* **Agentes Especialistas:** `noesis-reviewer-maestro`, `tear-code-reviewer`, `tear-security`.
* **Prompt para copiar e colar no Antigravity:**
```text
Ative o noesis-reviewer-maestro e execute o portão completo de 4 lanes do Tear para fechar a Sprint 1 do Doc2Fill:
1. Rodar 'npm test' e validar 100% dos testes verdes;
2. Despachar tear-code-reviewer para auditoria na Lane CODE (GOLDEN);
3. Despachar tear-security para verificar que nenhum dado de documento é retido ou logado indevidamente (Zero Retention);
4. Apresentar o laudo de prontidão para a Sprint 2.
```

---

# 📅 SEMANA 2 (SPRINT 2) — Experiência E2E, Split-View & Injeção Reativa

---

### 🔹 DIA 6 (Segunda) — Tarefa S2-T1: Split-View & Visualização Lado a Lado
* **Objetivo:** Exibir thumbnail/preview do documento original ao lado dos 8 campos para conferência rápida.
* **Agentes Especialistas:** `noesis-bento-tactile-designer` e `tear-frontend`.
* **Prompt para copiar e colar no Antigravity:**
```text
Ative o noesis-bento-tactile-designer e o tear-frontend para a tarefa S2-T1 do Doc2Fill.
Objetivo: Implementar a visualização Split-View no Sidepanel.
Requisitos:
- Painel esquerdo: Miniatura com zoom/pan da foto da nota ou PDF digital;
- Painel direito: Os 8 campos de formulário canônicos com destaque sutil nos campos extraídos com alta confiança;
- Layout responsivo que colapsa confortavelmente na largura padrão do Sidepanel do Chrome (400px a 500px).
```

---

### 🔹 DIA 7 (Terça) — Tarefa S2-T2: Edição Manual & Fallback Desbloqueado
* **Objetivo:** Permitir que o operador edite livremente qualquer campo no Sidepanel antes de disparar o autofill.
* **Agentes Especialistas:** `noesis-frontend-maestro` e `tear-frontend`.
* **Prompt para copiar e colar no Antigravity:**
```text
Ative o noesis-frontend-maestro e o tear-frontend para a tarefa S2-T2 do Doc2Fill.
Objetivo: Habilitar edição manual reativa e bidirecional no Sidepanel.
Requisitos:
- Inputs livres com máscaras não-bloqueantes para CPF/CNPJ, Data e Moeda (R$);
- Botão rápido 'Limpar Campo' e 'Restaurar Extração Original';
- Testes unitários comprovando que a edição manual atualiza o payload de injeção imediatamente.
```

---

### 🔹 DIA 8 (Quarta) — Tarefa S2-T3: Injetor de Eventos Reativos no Content Script
* **Objetivo:** Injetar os dados no formulário CCHA disparando prototype setter e eventos compostos nativos.
* **Agentes Especialistas:** `noesis-frontend-maestro` e `noesis-system-io-runtime`.
* **Prompt para copiar e colar no Antigravity:**
```text
Ative o noesis-frontend-maestro e o noesis-system-io-runtime para a tarefa S2-T3 do Doc2Fill.
Objetivo: Aperfeiçoar o injetor de eventos em 'extension/content.js'.
Requisitos:
- Implementar 'setInputValueWithEvents' utilizando prototype property descriptor setter;
- Despachar 'InputEvent' com inputType 'insertText', seguido de 'change' e 'blur' (bubbles: true, composed: true);
- Garantir que páginas construídas em Angular, React e Vue mantenham os dados salvos sem sumir após clique fora.
```

---

### 🔹 DIA 9 (Quinta) — Tarefa S2-T4: Mapeador Semântico Avançado de Selects
* **Objetivo:** Fazer match inteligente de tipos de documento em tags `<select>` e comboboxes.
* **Agentes Especialistas:** `noesis-domain-core` e `tear-backend`.
* **Prompt para copiar e colar no Antigravity:**
```text
Ative o noesis-domain-core e o tear-backend para a tarefa S2-T4 do Doc2Fill.
Objetivo: Criar algoritmo de correspondência semântica para campos de seleção (<select>).
Requisitos:
- Mapear variações como 'NF-e', 'NFC-e', 'Nota Fiscal Eletrônica', 'DANFE', 'Recibo de Pagamento' para as opções exatas do CCHA;
- Complexidade O(N) com tolerância a caixa alta/baixa e espaços extras;
- Suíte TDD cobrindo selects com opções dinâmicas e fallback seguro para 'Outros' quando não houver correspondência exata.
```

---

### 🔹 DIA 10 (Sexta) — Tarefa S2-T5: Teste E2E no Portal CCHA & Fechamento Sprint 2
* **Objetivo:** Simular o fluxo completo de ponta a ponta no portal simulador e congelar a versão MVP da extensão.
* **Agentes Especialistas:** `noesis-reviewer-maestro`, `tear-code-reviewer`, `noesis-saci-hunter`.
* **Prompt para copiar e colar no Antigravity:**
```text
Ative o noesis-reviewer-maestro e o noesis-saci-hunter para fechar a Sprint 2 do Doc2Fill:
1. Executar simulação de preenchimento E2E no simulador do Portal CCHA (/portal);
2. Caçar ativamente falhas de foco, perda de dados ou selects resetados;
3. Rodar 'npm test' e gravar as 4 lanes do Tear;
4. Emitir o selo de prontidão da extensão para integração com o Mobile e Vendas.
```

---

# 📅 SEMANA 3 (SPRINT 3) — Mobile, Estresse, Vídeo Demo & Vendas (Hermes)

---

### 🔹 DIA 11 (Segunda) — Tarefa S3-T1: Otimização do Scanner Mobile PWA
* **Objetivo:** Otimizar captura de foto no celular com auto-foco, compressão em Canvas (< 300KB) e envio via WebSocket em < 500ms.
* **Agentes Especialistas:** `noesis-system-io-runtime` e `tear-backend`.
* **Prompt para copiar e colar no Antigravity:**
```text
Ative o noesis-system-io-runtime e o tear-backend para a tarefa S3-T1 do Doc2Fill.
Objetivo: Otimizar o PWA mobile de captura ('mobile-pwa/').
Requisitos:
- Downscale inteligente de fotos de alta resolução no Canvas do celular para largura máxima de 1600px;
- Compressão JPEG com qualidade 0.85 mantendo legibilidade do texto e tamanho < 300KB;
- Transmissão instantânea para o servidor local efêmero com confirmação háptica de envio.
```

---

### 🔹 DIA 12 (Terça) — Tarefa S3-T2: Bateria de Estresse com 20 Notas Reais
* **Objetivo:** Teste cego com 20 comprovantes reais (cupons amassados, recibos médicos, notas fiscais).
* **Agentes Especialistas:** `noesis-edge-case-extremist` e `noesis-saci-hunter`.
* **Prompt para copiar e colar no Antigravity:**
```text
Ative o noesis-edge-case-extremist e o noesis-saci-hunter para a tarefa S3-T2 do Doc2Fill.
Objetivo: Auditoria de estresse e taxa de acerto com documentos fiscais reais.
Requisitos:
- Submeter a bateria de 20 comprovantes fiscais heterogêneos;
- Medir a acurácia nos 8 campos essenciais (Meta: > 90%);
- Isolar qualquer documento que falhar e gerar relatório de ajustes finos nas expressões regulares de parsing.
```

---

### 🔹 DIA 13 (Quarta) — Tarefa S3-T3: Roteiro & Ativo de Demonstração (Vídeo de 30s)
* **Objetivo:** Criar a estrutura e gravar o vídeo demonstrativo comercial ("Do celular ao CCHA em 6 segundos").
* **Agentes Especialistas:** `hermes-creative-director` e `tear-brand-architect`.
* **Prompt para copiar e colar no Antigravity:**
```text
Ative o hermes-creative-director e o tear-brand-architect para a tarefa S3-T3 do Doc2Fill.
Objetivo: Roteiro e storyboard para o vídeo de vendas e demonstração do produto (30 a 45 segundos).
Estrutura:
- Hook (0-5s): "Ainda perde 15 minutos digitando nota por nota no CCHA?";
- Problema & Dor (5-12s): Acúmulo de notas amassadas e risco de glosa por digitação errada;
- Solução Mágica (12-25s): Foto no celular -> QR Code -> Preenchimento automático em 6 segundos;
- Chamada para Ação (25-35s): Link para garantir acesso no Lote 1 de fundadores.
```

---

### 🔹 DIA 14 (Quinta) — Tarefa S3-T4: Landing Page de Conversão & Checkout Pix 1-Click
* **Objetivo:** Construir checkout instantâneo via Pix com o Swarm Hermes para faturar R$ 197/mês por licença.
* **Agentes Especialistas:** `hermes-frictionless-ui`, `hermes-conversion-psych` e `hermes-transact-guard`.
* **Prompt para copiar e colar no Antigravity:**
```text
Ative o hermes-frictionless-ui, hermes-conversion-psych e hermes-transact-guard para a tarefa S3-T4.
Objetivo: Construir a página de vendas e checkout de 1 clique para o Doc2Fill.
Requisitos:
- Oferta Fundador: R$ 197,00/mês ou R$ 1.970,00/ano (2 meses grátis);
- Checkout 1-step com Pix Copia e Cola instantâneo e virada de tela via SSE na confirmação bancária;
- Gatilhos de escassez real (Apenas 20 licenças no Lote 1 de Outubro).
```

---

### 🔹 DIA 15 (Sexta) — Tarefa S3-T5: Entrega Automática & Início das Vendas
* **Objetivo:** Configurar envio automático da extensão (.zip) e instrução por WhatsApp/E-mail e iniciar abordagem.
* **Agentes Especialistas:** `hermes-dispatch-orchestrator`, `hermes-support-sentinel` e `tear-product-owner`.
* **Prompt para copiar e colar no Antigravity:**
```text
Ative o hermes-dispatch-orchestrator e o hermes-support-sentinel para a tarefa S3-T5 do Doc2Fill.
Objetivo: Conectar o despacho automático pós-pagamento.
Requisitos:
- Envio instantâneo do link de download da extensão + manual de instalação em 2 cliques;
- Recibo com autenticação e defesa anti-chargeback;
- Mensagem de boas-vindas humanizada no WhatsApp para onboarding imediato do cliente.
```

---

## 💡 Como Usar Amanhã Cedo:
Basta abrir o Antigravity, ir até a pasta `/Users/user/.gemini/antigravity/scratch/kazuhiro/doc2fill`, copiar o prompt da tarefa que você deseja executar e colar aqui!
