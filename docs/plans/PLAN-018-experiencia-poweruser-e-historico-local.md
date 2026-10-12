# PLAN-018: Trilha A — Experiência Power-User, Atalhos de Teclado, Highlighter Visual e Histórico Local

- **status:** Proposto
- **autor:** Equipe Doc2Fill
- **data:** 12/10/2026
- **tearform:** respostas/018.md
- **adr:** docs/adr/ADR-025-experiencia-poweruser-e-historico-local.md

## Metadados SDD
- **versao_plano:** 1.0.0
- **tipo:** feature
- **blast_radius:** médio
- **orcamento_tokens:** 35000

---

## 1. Visão Geral e Justificativa
A Trilha A expande a produtividade diária dos usuários do doc2fill, eliminando atritos de operação repetitiva através de três pilares: (1) atalhos globais de teclado no navegador e no Sidepanel (`Alt+D`, `Ctrl+Shift+F`, `Ctrl+Enter`), (2) confirmação visual imediata com efeito Highlighter (`#00D2FF`) nos campos preenchidos na página alvo, e (3) histórico rotativo local dos últimos 10 documentos processados em memória local segura (IndexedDB / storage local), preservando integralmente o princípio de Zero Retenção na Nuvem.

---

## 2. Opções Técnicas Avaliadas (Regra Tear #2)

### Opção 1: Histórico em Servidor Remoto / Nuvem com Autenticação
- **Descrição:** Salvar o histórico dos comprovantes em banco de dados na nuvem (ex: PostgreSQL ou Firebase).
- **Prós:** Sincronização entre múltiplos computadores do mesmo usuário.
- **Contras:** Viola diretamente o princípio basilar de **Zero Retenção** e privacidade local; aumenta custos de infraestrutura e expõe dados fiscais a riscos de segurança e conformidade LGPD.

### Opção 2: Apenas Atalhos Simples via Event Listeners Globais sem Declaração no Manifest
- **Descrição:** Registrar atalhos apenas por `window.addEventListener('keydown')` na página web ativa.
- **Prós:** Fácil de implementar.
- **Contras:** Conflita com atalhos de portais bancários e ERPs (como o Protheus ou SAP que usam F2 a F12); não funciona quando o foco está fora da janela do navegador ou no Sidepanel.

### Opção 3 (RECOMENDADA): Comandos Nativos Manifest V3 + Highlighter Não-Destrutivo + Armazenamento Local LRU (IndexedDB)
- **Descrição:**
  1. Declarar comandos oficiais no `manifest.json` com `_execute_action` (`Alt+D`) e `fill_active_form` (`Ctrl+Shift+F`), além de captura de `Ctrl+Enter` no Sidepanel.
  2. Implementar `highlightFilledElement` no `extension/content.js` com transição suave CSS e restauração automática do estilo original após 1.5s.
  3. Criar `core/history-store.js` com interface assíncrona local mantendo estritamente os últimos 10 documentos via rotação LRU, com opção de limpeza total a qualquer momento.
- **Prós:**
  - 100% Local-First e zero transmissão de dados (LGPD / Zero Retenção).
  - Atalhos nativos respeitados pelo Chrome sem interceptação intrusiva de teclas de ERPs.
  - Segurança perceptual com feedback visual de 60 FPS.
  - Todos os arquivos mantidos abaixo de 350 linhas per Regra #24.
- **Contras:**
  - O histórico fica restrito ao perfil local do navegador atual.

---

## 3. Não-Objetivos / Fora de Escopo
- Não sincronizar o histórico local com servidores externos ou bancos na nuvem.
- Não persistir o arquivo binário pesado das imagens no histórico (apenas metadados textuais essenciais).
- Não violar o orçamento de 700 linhas por arquivo de código per Regra #24.

---

## 4. Requisitos EARS

| Requisito | Tipo Declarado | Especificação |
| :--- | :--- | :--- |
| REQ-001 | Event | Quando o usuário pressionar a combinação de teclas de atalho configurada, o sistema deve acionar a injeção automática de dados na página ativa. |
| REQ-002 | Event | Quando um campo de formulário for preenchido com sucesso, o sistema deve aplicar temporariamente um destaque visual com borda ciano no elemento. |
| REQ-003 | Ubiquitous | O sistema deve salvar localmente o resumo dos últimos documentos processados limitando o histórico a no máximo 10 registros. |
| REQ-004 | Unwanted | Se o usuário solicitar a limpeza do histórico ou se dados forem inválidos, então o sistema deve purgar os registros locais com segurança sem lançar exceções. |

---

## 5. Orçamentos Não-Funcionais
- **Limite de Linhas de Código (Regra #24):** Cada arquivo novo ou estendido mantido abaixo de 500 linhas (teto global 700 linhas).
- **Duração do Destaque Visual:** Efeito Highlighter visível por exatamente 1500ms com transição suave.
- **Limite de Armazenamento Local:** Teto estrito de 10 registros com tamanho total inferior a 50KB.

---

## 6. Hotspots Compartilhados
- `extension/manifest.json`
- `extension/sidepanel.js`
- `extension/content.js`
- `core/history-store.js`
- `tests/core/history-store.test.js`
- `tests/extension/highlighter.test.js`

---

## 7. Tarefas (DAG)

## T1 — Armazenamento Local Rotativo de Histórico (`core/history-store.js`)
- **Requisitos:** REQ-003, REQ-004
- **Agent:** tear-database
- **model:** gemini-2.5-pro
- **effort:** médio
- **tempo:** 20m
- **Depends-on:** nenhum

## T2 — Highlighter Visual de Injeção no Content Script (`extension/content.js`)
- **Requisitos:** REQ-002
- **Agent:** noesis-frontend-maestro
- **model:** gemini-2.5-pro
- **effort:** médio
- **tempo:** 15m
- **Depends-on:** nenhum

## T3 — Atalhos de Teclado no Manifest e Sidepanel (`extension/manifest.json` e `extension/sidepanel.js`)
- **Requisitos:** REQ-001
- **Agent:** noesis-a11y-keyboard-guard
- **model:** gemini-2.5-pro
- **effort:** baixo
- **tempo:** 15m
- **Depends-on:** T1, T2

---

## 8. Matriz de Rastreabilidade

| Requisito | Tarefa | Teste |
| :--- | :--- | :--- |
| REQ-001 | T3 | tests/extension/sidepanel.test.js |
| REQ-002 | T2 | tests/extension/highlighter.test.js |
| REQ-003 | T1 | tests/core/history-store.test.js |
| REQ-004 | T1 | tests/core/history-store.test.js |
