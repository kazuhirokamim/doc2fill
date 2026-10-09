# ⚡ MASTER PLAN DOC2FILL — ROADMAP DE ENGENHARIA DE 3 SEMANAS (MVP), MONETIZAÇÃO & PROTOCOLO SEMANAL

**Documento Estratégico & Técnico de Execução Ágil (Kazuhiro & Lucas)**  
**Versão:** 3.0.0 (Unificação do Master Plan, Manual Diário e Protocolo de Registro de Semanas)  
**Governança:** Metodologia Scrum Semanal + Kanban Rígido (WIP Limits & Regra de 1 Dia por Tarefa)  
**Orquestração:** Modo Maestro Tear (TDD 3 Cenários + 4 Lanes Golden & Green) & Swarm Cognitivo Noesis  
**Meta Suprema:** MVP localmente estável e infalível em **3 semanas** (21 dias), viabilizando tração comercial e faturamento recorrente até o encerramento de 2026.

---

## 1. Diagnóstico do Abismo & Padrão de Engenharia

### 1.1. Diagnóstico Forense dos 4 Pontos de Quebra
1. **Descompasso Drag-and-Drop vs. Input Nativo:** O evento `onDrop` capturava o arquivo, mas perdia a cadeia de listeners assíncronos do Sidepanel.
2. **Mutação Direta de Estado sem Reatividade:** Atribuições imperativas sem ciclo de detecção não refletiam no DOM de páginas modernas (Angular, React, Vue).
3. **Discrepância Estrutural de Chaves:** O OCR retornava saídas heterogêneas (`nr_documento`, `cnpj_prestador`), enquanto os formulários de destino (portal CCHA) exigem chaves canônicas específicas.
4. **Bloqueio de Eventos Nativos:** Atribuir `input.value = x` diretamente pelo JS não acionava os manipuladores de validação reativa do formulário destino.

### 1.2. Padrão Inegociável de Injeção no DOM Destino:
```javascript
// Disparo forçado de eventos nativos para frameworks reativos (Angular / React / Vue)
function setInputValueWithEvents(input, value) {
  const previousValue = input.value;
  const prototype = Object.getPrototypeOf(input);
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
  
  if (descriptor && descriptor.set) {
    descriptor.set.call(input, value);
  } else {
    input.value = value;
  }

  // 1. Evento de Input (com inputType insertText)
  input.dispatchEvent(new InputEvent('input', {
    bubbles: true,
    cancelable: true,
    composed: true,
    data: value,
    inputType: 'insertText'
  }));

  // 2. Evento de Change
  input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));

  // 3. Evento de Blur para acionar validações 'touched'
  input.dispatchEvent(new Event('blur', { bubbles: true, composed: true }));
}
```

---

## 2. Matriz de Escopo Rígido de MVP (Trade-off Estrutural)

| Funcionalidade | Escopo Obrigatório do MVP (3 Semanas) | Fica para a V2 (Pós-Validação Comercial) |
| :--- | :--- | :--- |
| **Entrada de Arquivos** | Clique e drag-and-drop de JPG, PNG e PDF com feedback visual claro. | Suporte a formatos exóticos (TIFF, BMP legados, ZIP). |
| **Motor OCR & Parsing** | 8 campos essenciais (Tipo, CNPJ/CPF, Razão, Número, Data, Valor, Descritivo, Motivo). | Reconhecimento universal de dezenas de certidões judiciais raras. |
| **Preenchimento** | Preenchimento reativo automático instantâneo com eventos nativos forçados. | Animações complexas de digitação visual supérfluas. |
| **Interface do Operador** | Split-view lado a lado (visualização da foto + campos editáveis) com edição manual. | Histórico persistente de alterações e trilha multi-usuário. |
| **Sincronização Mobile** | PWA leve via QR Code para escanear com a câmera do celular e enviar via relay local. | App nativo publicado na Apple App Store / Google Play. |
| **Anti-Glosa & Regras** | Validação sintática e sugestão legal básica fundamentada na Lei 13.327/2016. | Motor semântico preditivo baseado em IA gerativa em nuvem. |
| **Gestão de Acesso** | Licenciamento simples via chave local com decremento de quota em SQLite local. | RBAC complexo, múltiplos papéis hierárquicos e SSO corporativo. |

---

## 3. 📋 Protocolo de Registro Semanal (Weekly Ledger)

Para auditar o progresso e manter comprovação técnica indiscutível, cada uma das 3 semanas será registrada no diretório:
`docs/semanas/SEMANA-<XX>-<SLUG>.md`

### Template Oficial de Registro Semanal:
```markdown
# 📝 Registro Semanal Doc2Fill — Semana [XX]
**Período:** [DD/MM/AAAA] a [DD/MM/AAAA]  
**Sprint:** [Sprint 1 | Sprint 2 | Sprint 3]  
**Status do Portão:** [Green & Golden | Em Homologação]

### 1. Entregáveis & Tarefas Concluídas
- [x] [ID-Tarefa]: [Descrição da entrega atômica]

### 2. Evidências Técnicas
- **Arquivos Criados/Modificados:** `caminho/do/arquivo.js`
- **Cobertura de Testes:** 100% verde (`npm test` passando em X ms)
- **Documentos Fiscais Validados:** [Lista de notas e cupons testados]

### 3. Vereditos das 4 Lanes Tear
- [x] **Lane CODE (GOLDEN):** Aprovado por tear-code-reviewer (0 Críticos, 0 Majors)
- [x] **Lane SECURITY (PASS):** Zero retenção de imagens ou dados em nuvem
- [x] **Lane LGPD (PASS):** Processamento 100% efêmero em RAM e Local-First
- [x] **Lane PERFORMANCE (PASS):** Leitura de arquivo e OCR local < 3 segundos

### 4. Próxima Sprint
- [Metas da semana seguinte]
```

---

## 4. O Cronograma Completo de 3 Semanas com Prompts Diários de Invocação

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                   ROADMAP DE 3 SEMANAS DOC2FILL (SCRUM & KANBAN)                 │
├────────────────────┬─────────────────────────────────────────────────────────────┤
│ SPRINT             │ META SUPREMA & ENTREGÁVEL DETERMINÍSTICO                     │
├────────────────────┼─────────────────────────────────────────────────────────────┤
│ Semana 1 (Sprint 1)│ Resolução do Core, Drag-and-Drop & Pipeline Funcional        │
│                    │ Meta: "Foto/PDF arrastado = 8 campos extraídos e exibidos"  │
│                    │ Registro: docs/semanas/SEMANA-01-CORE-PIPELINE.md           │
├────────────────────┼─────────────────────────────────────────────────────────────┤
│ Semana 2 (Sprint 2)│ Experiência E2E, Split-View & Autofill no Navegador         │
│                    │ Meta: "Botão Preencher aciona o portal com eventos nativos" │
│                    │ Registro: docs/semanas/SEMANA-02-E2E-AUTOFILL.md            │
├────────────────────┼─────────────────────────────────────────────────────────────┤
│ Semana 3 (Sprint 3)│ Estabilização Mobile, Teste Cego com 20 Notas & Go-to-Market│
│                    │ Meta: "Produto blindado, vídeo demo gravado e vendas ativas"│
│                    │ Registro: docs/semanas/SEMANA-03-MONETIZACAO-VENDAS.md      │
└────────────────────┴─────────────────────────────────────────────────────────────┘
```

---

# 📅 SPRINT 1 (Semana 1) — Resolução do Core & Pipeline Funcional
*Arquivo de Registro Semanal:* `docs/semanas/SEMANA-01-CORE-PIPELINE.md`

### 🔹 DIA 1 (Segunda) — Tarefa S1-T1: Unificação do Handler de Upload (`handleDocumentFile`) & Aprimoramento do Motor OCR (+20% Acurácia)
* **Subagentes:** `noesis-frontend-maestro`, `noesis-backend-maestro` e `tear-frontend`
* **Prompt para o Antigravity:**
```text
Ative o noesis-frontend-maestro, o noesis-backend-maestro e o tear-frontend para a tarefa S1-T1 do Doc2Fill.
Objetivo: 
1. Unificar os handlers de Drag-and-Drop (onDrop) e seleção nativa (onChange) na função 'handleDocumentFile' no Sidepanel.
2. Aprimorar o motor OCR ('core/ocr-engine.js') para aumentar a acurácia em pelo menos 20%:
   - Pré-processamento de imagem determinístico em buffer/canvas (grayscale ponderado + realce de contraste/binarização adaptativa contra sombras e papel térmico amarelado);
   - Calibração de parâmetros Tesseract (preserve_interword_spaces='1' e PSM ajustado);
   - Reconhecimento sintático de Chave de Acesso SEFAZ de 44 dígitos para extração determinística de CNPJ, Data, Tipo e Número.
Diretrizes Tear:
1. Primeiro, crie a suíte TDD em tests/ com os 3 cenários: arquivo válido (PNG/PDF), arquivo corrompido/nulo e múltiplos arquivos arrastados simultaneamente, mais testes de pré-processamento e extração de chave SEFAZ.
2. Implemente o handler unificado e os aprimoramentos do OCR garantindo tempo de execução < 3s e Zero Retenção.
3. Garanta que todos os testes passem verdes.
```

### 🔹 DIA 2 (Terça) — Tarefa S1-T2: Normalizador Canônico de Esquemas (`core/document-parser.js`)
* **Subagentes:** `noesis-backend-maestro` e `noesis-domain-core`
* **Prompt para o Antigravity:**
```text
Ative o noesis-backend-maestro e o noesis-domain-core para a tarefa S1-T2 do Doc2Fill.
Objetivo: Criar o normalizador canônico em 'core/document-parser.js'.
Requisitos:
- Receber dados brutos de OCR ou PDF e normalizar para exatamente 8 campos: tipo_documento, cpf_cnpj, fornecedor, numero_documento, data, valor, descritivo, motivo.
- Higienizar pontuações, normalizar acentos e validar datas (DD/MM/AAAA e ISO).
- Aplicar TDD com casos de borda: CNPJ com zeros à esquerda, valores monetários com vírgula/ponto e campos ausentes retornando string vazia segura (sem undefined/null).
```

### 🔹 DIA 3 (Quarta) — Tarefa S1-T3: Feedback Visual & Estados de Carregamento
* **Subagentes:** `noesis-bento-tactile-designer` e `tear-frontend`
* **Prompt para o Antigravity:**
```text
Ative o noesis-bento-tactile-designer e o tear-frontend para a tarefa S1-T3 do Doc2Fill.
Objetivo: Construir os estados de carregamento reativo do Sidepanel.
Requisitos:
- Microinteração visual clara com Obsidian Badges informando o status: 'Lendo PDF...', 'Executando OCR local...', 'Pronto para preenchimento'.
- Desabilitar a dropzone durante o processamento para evitar submissões concorrentes.
- Acessibilidade WCAG AA (Aria-live region informando aos leitores de tela a transição de estado).
```

### 🔹 DIA 4 (Quinta) — Tarefa S1-T4: Tratamento de Exceções & Sanitização de Imagens
* **Subagentes:** `noesis-error-path-inquisitor` e `tear-qa`
* **Prompt para o Antigravity:**
```text
Ative o noesis-error-path-inquisitor e o tear-qa para a tarefa S1-T4 do Doc2Fill.
Objetivo: Blindagem e tratamento de falhas no pipeline de extração.
Requisitos:
- Criar testes forçando: imagem 100% preta/ruído, PDF protegido por senha e payload vazio.
- O sistema não deve lançar exceções não tratadas no console; deve exibir card de alerta amigável: 'Não foi possível identificar o texto. Preencha manualmente ou envie outra foto'.
- Provar a resiliência rodando a suíte de testes.
```

### 🔹 DIA 5 (Sexta) — Tarefa S1-T5: Suíte TDD de Integração & Homologação Sprint 1
* **Subagentes:** `noesis-reviewer-maestro`, `tear-code-reviewer`, `tear-security`
* **Prompt para o Antigravity:**
```text
Ative o noesis-reviewer-maestro e execute o portão completo de 4 lanes do Tear para fechar a Sprint 1 do Doc2Fill:
1. Rodar 'npm test' e validar 100% dos testes verdes;
2. Despachar tear-code-reviewer para auditoria na Lane CODE (GOLDEN);
3. Despachar tear-security para verificar que nenhum dado de documento é retido ou logado indevidamente (Zero Retention);
4. Gerar o registro oficial em docs/semanas/SEMANA-01-CORE-PIPELINE.md.
```

---

# 📅 SPRINT 2 (Semana 2) — Experiência E2E, Split-View & Injeção Reativa
*Arquivo de Registro Semanal:* `docs/semanas/SEMANA-02-E2E-AUTOFILL.md`

### 🔹 DIA 6 (Segunda) — Tarefa S2-T1: Split-View & Visualização Lado a Lado
* **Subagentes:** `noesis-bento-tactile-designer` e `tear-frontend`
* **Prompt para o Antigravity:**
```text
Ative o noesis-bento-tactile-designer e o tear-frontend para a tarefa S2-T1 do Doc2Fill.
Objetivo: Implementar a visualização Split-View no Sidepanel.
Requisitos:
- Painel esquerdo: Miniatura com zoom/pan da foto da nota ou PDF digital;
- Painel direito: Os 8 campos de formulário canônicos com destaque sutil nos campos extraídos com alta confiança;
- Layout responsivo que colapsa confortavelmente na largura padrão do Sidepanel do Chrome (400px a 500px).
```

### 🔹 DIA 7 (Terça) — Tarefa S2-T2: Edição Manual & Fallback Desbloqueado
* **Subagentes:** `noesis-frontend-maestro` e `tear-frontend`
* **Prompt para o Antigravity:**
```text
Ative o noesis-frontend-maestro e o tear-frontend para a tarefa S2-T2 do Doc2Fill.
Objetivo: Habilitar edição manual reativa e bidirecional no Sidepanel.
Requisitos:
- Inputs livres com máscaras não-bloqueantes para CPF/CNPJ, Data e Moeda (R$);
- Botão rápido 'Limpar Campo' e 'Restaurar Extração Original';
- Testes unitários comprovando que a edição manual atualiza o payload de injeção imediatamente.
```

### 🔹 DIA 8 (Quarta) — Tarefa S2-T3: Injetor de Eventos Reativos no Content Script
* **Subagentes:** `noesis-frontend-maestro` e `noesis-system-io-runtime`
* **Prompt para o Antigravity:**
```text
Ative o noesis-frontend-maestro e o noesis-system-io-runtime para a tarefa S2-T3 do Doc2Fill.
Objetivo: Aperfeiçoar o injetor de eventos em 'extension/content.js'.
Requisitos:
- Implementar 'setInputValueWithEvents' utilizando prototype property descriptor setter;
- Despachar 'InputEvent' com inputType 'insertText', seguido de 'change' e 'blur' (bubbles: true, composed: true);
- Garantir que páginas construídas em Angular, React e Vue mantenham os dados salvos sem sumir após clique fora.
```

### 🔹 DIA 9 (Quinta) — Tarefa S2-T4: Mapeador Semântico Avançado de Selects
* **Subagentes:** `noesis-domain-core` e `tear-backend`
* **Prompt para o Antigravity:**
```text
Ative o noesis-domain-core e o tear-backend para a tarefa S2-T4 do Doc2Fill.
Objetivo: Criar algoritmo de correspondência semântica para campos de seleção (<select>).
Requisitos:
- Mapear variações como 'NF-e', 'NFC-e', 'Nota Fiscal Eletrônica', 'DANFE', 'Recibo de Pagamento' para as opções exatas do CCHA;
- Complexidade O(N) com tolerância a caixa alta/baixa e espaços extras;
- Suíte TDD cobrindo selects com opções dinâmicas e fallback seguro para 'Outros' quando não houver correspondência exata.
```

### 🔹 DIA 10 (Sexta) — Tarefa S2-T5: Teste E2E no Portal CCHA & Fechamento Sprint 2
* **Subagentes:** `noesis-reviewer-maestro`, `tear-code-reviewer`, `noesis-saci-hunter`
* **Prompt para o Antigravity:**
```text
Ative o noesis-reviewer-maestro e o noesis-saci-hunter para fechar a Sprint 2 do Doc2Fill:
1. Executar simulação de preenchimento E2E no simulador do Portal CCHA (/portal);
2. Caçar ativamente falhas de foco, perda de dados ou selects resetados;
3. Rodar 'npm test' e gravar as 4 lanes do Tear;
4. Gerar o registro oficial em docs/semanas/SEMANA-02-E2E-AUTOFILL.md.
```

---

# 📅 SPRINT 3 (Semana 3) — Mobile, Estresse, Vídeo Demo & Vendas (Hermes)
*Arquivo de Registro Semanal:* `docs/semanas/SEMANA-03-MONETIZACAO-VENDAS.md`

### 🔹 DIA 11 (Segunda) — Tarefa S3-T1: Otimização do Scanner Mobile PWA
* **Subagentes:** `noesis-system-io-runtime` e `tear-backend`
* **Prompt para o Antigravity:**
```text
Ative o noesis-system-io-runtime e o tear-backend para a tarefa S3-T1 do Doc2Fill.
Objetivo: Otimizar o PWA mobile de captura ('mobile-pwa/').
Requisitos:
- Downscale inteligente de fotos de alta resolução no Canvas do celular para largura máxima de 1600px;
- Compressão JPEG com qualidade 0.85 mantendo legibilidade do texto e tamanho < 300KB;
- Transmissão instantânea para o servidor local efêmero com confirmação háptica de envio.
```

### 🔹 DIA 12 (Terça) — Tarefa S3-T2: Bateria de Estresse com 20 Notas Reais
* **Subagentes:** `noesis-edge-case-extremist` e `noesis-saci-hunter`
* **Prompt para o Antigravity:**
```text
Ative o noesis-edge-case-extremist e o noesis-saci-hunter para a tarefa S3-T2 do Doc2Fill.
Objetivo: Auditoria de estresse e taxa de acerto com documentos fiscais reais.
Requisitos:
- Submeter a bateria de 20 comprovantes fiscais heterogêneos;
- Medir a acurácia nos 8 campos essenciais (Meta: > 90%);
- Isolar qualquer documento que falhar e gerar relatório de ajustes finos nas expressões regulares de parsing.
```

### 🔹 DIA 13 (Quarta) — Tarefa S3-T3: Roteiro & Ativo de Demonstração (Vídeo de 30s)
* **Subagentes:** `hermes-creative-director` e `tear-brand-architect`
* **Prompt para o Antigravity:**
```text
Ative o hermes-creative-director e o tear-brand-architect para a tarefa S3-T3 do Doc2Fill.
Objetivo: Roteiro e storyboard para o vídeo de vendas e demonstração do produto (30 a 45 segundos).
Estrutura:
- Hook (0-5s): "Ainda perde 15 minutos digitando nota por nota no CCHA?";
- Problema & Dor (5-12s): Acúmulo de notas amassadas e risco de glosa por digitação errada;
- Solução Mágica (12-25s): Foto no celular -> QR Code -> Preenchimento automático em 6 segundos;
- Chamada para Ação (25-35s): Link para garantir acesso no Lote 1 de fundadores.
```

### 🔹 DIA 14 (Quinta) — Tarefa S3-T4: Landing Page de Conversão & Checkout Pix 1-Click
* **Subagentes:** `hermes-frictionless-ui`, `hermes-conversion-psych` e `hermes-transact-guard`
* **Prompt para o Antigravity:**
```text
Ative o hermes-frictionless-ui, hermes-conversion-psych e hermes-transact-guard para a tarefa S3-T4.
Objetivo: Construir a página de vendas e checkout de 1 clique para o Doc2Fill.
Requisitos:
- Oferta Fundador: R$ 197,00/mês ou R$ 1.970,00/ano (2 meses grátis);
- Checkout 1-step com Pix Copia e Cola instantâneo e virada de tela via SSE na confirmação bancária;
- Gatilhos de escassez real (Apenas 20 licenças no Lote 1 de Outubro).
```

### 🔹 DIA 15 (Sexta) — Tarefa S3-T5: Entrega Automática & Início das Vendas
* **Subagentes:** `hermes-dispatch-orchestrator`, `hermes-support-sentinel` e `tear-product-owner`
* **Prompt para o Antigravity:**
```text
Ative o hermes-dispatch-orchestrator e o hermes-support-sentinel para a tarefa S3-T5 do Doc2Fill.
Objetivo: Conectar o despacho automático pós-pagamento.
Requisitos:
- Envio instantâneo do link de download da extensão + manual de instalação em 2 cliques;
- Recibo com autenticação e defesa anti-chargeback;
- Mensagem de boas-vindas humanizada no WhatsApp para onboarding imediato do cliente;
- Fechar o registro final em docs/semanas/SEMANA-03-MONETIZACAO-VENDAS.md.
```

---

## 5. Checklist Final de Prontidão Comercial

- [ ] O fluxo de arrastar imagem/PDF, processar o OCR e visualizar os 8 campos no Sidepanel roda em < 3 segundos localmente.
- [ ] O clique em "Preencher no CCHA" preenche todos os campos correspondentes no portal ativo sem sumir após o clique do mouse.
- [ ] O usuário consegue editar manualmente qualquer dado incorreto no Sidepanel antes de disparar o autofill.
- [ ] O scanner mobile via QR Code conecta em < 500ms na rede local e transmite a imagem tratada com sucesso.
- [ ] Suíte de testes automatizados com cobertura > 80% e zero testes falhando (`npm test` 100% verde).
- [ ] Vídeo demonstrativo de 30 a 45 segundos gravado e pronto para envio.
- [ ] Os 3 registros semanais preenchidos em `docs/semanas/`.
