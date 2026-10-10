# PLAN-011: Reformulação da Identidade Visual e Varredura Epistêmica de UI/UX do Frontend

## Metadados SDD
- **versao_plano:** 1.0.0
- **tipo:** feature
- **blast_radius:** médio
- **orcamento_tokens:** 35000

---

## 1. Visão Geral e Justificativa
Após auditoria e varredura do frontend do Doc2Fill com as lentes dos agentes Tear e Noesis (`tear-brand-architect`, `noesis-bento-tactile-designer`, `noesis-frontend-maestro`, `noesis-a11y-keyboard-guard`), identificou-se a necessidade de alinhar 100% o design do produto ao Brandboard oficial e logotipo vetorial, eliminando elementos destoantes (emojis genéricos de sistema, tema claro com aspecto de rascunho, badges amarelos que parecem avisos de erro) e implementando uma interface Obsidian Dark minimalista, com superfícies Bento, alto contraste tipográfico e interações táteis suaves, preservando rigorosamente todos os contratos funcionais de DOM existentes.

---

## 2. Opções Técnicas Avaliadas (Regra Tear #2)

### Opção 1: Ajuste Cosmético Pontual no Tema Claro Existente
- **Descrição:** Apenas alterar a cor dos botões principais para azul e substituir o emoji do header por texto simples, mantendo o fundo `#F9FAFB`.
- **Prós:** Menor volume de linhas CSS alteradas.
- **Contras:** Destoa brutalmente do Brandboard corporativo oficial (Obsidian Dark `#0A0D14`); mantém o cansaço visual para operadores e a percepção de protótipo incompleto.

### Opção 2: Adoção de Biblioteca CSS Externa (ex: Tailwind CDN ou Bootstrap Dark)
- **Descrição:** Importar uma folha de estilos completa externa via CDN no Sidepanel e PWA.
- **Prós:** Componentes pré-fabricados.
- **Contras:** Viola diretamente a política CSP estrita do Manifest V3 do Google Chrome; adiciona peso desnecessário e risco de conflito com os seletores da suíte de testes.

### Opção 3 (RECOMENDADA): Design System Obsidian Minimalista & Táctil Autocontido
- **Descrição:** Implementar um Design System nativo e autocontido em CSS puro com tokens semânticos baseados na marca oficial (`#0A0D14`, `#111622`, `#0052FF`, `#00D2FF`, `#F8FAFC`, `#64748B`), criar assets vetoriais SVG de alta precisão para o logotipo oficial (documento + checkmark + cursor) e ícones de interface, refatorar o Sidepanel da extensão, o Mobile PWA Scanner e o assistente do simulador, garantindo conformidade com o Manifest V3 e WCAG AA.
- **Prós:** 100% alinhado à marca corporativa, zero violação de CSP, velocidade máxima de renderização sem dependências externas e zero regressão nos 136 testes.
- **Contras:** Requer desenho cuidadoso dos vetores SVG e parametrização detalhada dos tokens de cor e espaçamento.

---

## 3. Não-Objetivos / Fora de Escopo
- Não alterar nomes de IDs funcionais de inputs e botões (`field-tipo-doc`, `field-cnpj`, `field-razao`, `field-num-doc`, `field-data`, `field-valor`, `field-descricao`, `field-motivo`, `btn-autofill`).
- Não modificar a lógica interna de parsing, matching ou tradução clínica anti-glosa já validada.
- Não introduzir bibliotecas CSS externas ou scripts remotos via CDN.

---

## 4. Requisitos EARS

| Requisito | Tipo Declarado | Especificação |
| :--- | :--- | :--- |
| REQ-001 | Ubiquitous | O sistema deve aplicar a paleta oficial Obsidian Dark (#0A0D14) com superfícies Bento (#111622) e realces em Connection Blue (#0052FF) e Flow Cyan (#00D2FF). |
| REQ-002 | Ubiquitous | O sistema deve exibir o símbolo e logomarca vetorial SVG oficial do doc2fill no cabeçalho do Sidepanel e no Mobile PWA, substituindo emojis de sistema. |
| REQ-003 | State-Driven | Enquanto o usuário arrastar um arquivo sobre a dropzone, o sistema deve fornecer feedback visual luminoso com borda iluminada em Flow Cyan (#00D2FF). |
| REQ-004 | Ubiquitous | O sistema deve manter todos os IDs de elementos e contratos de DOM inalterados para garantir compatibilidade com as suítes de teste de integração. |
| REQ-005 | Ubiquitous | O sistema deve atender ao padrão de acessibilidade WCAG AA com taxa de contraste de texto superior a 4.5:1 em elementos informativos e 7:1 no texto principal. |

---

## 5. Orçamentos Não-Funcionais
- **Limite de Linhas por Arquivo (Regra #24):** Menos de 700 linhas em `extension/sidepanel.css`, `extension/sidepanel.html` e `mobile-pwa/index.html`.
- **Performance de Renderização:** 60 FPS nas transições de abas e drag-and-drop.
- **Tamanho dos Assets:** SVG vetorial otimizado com menos de 4 KB.
- **Acessibilidade:** Padrão WCAG 2.1 nível AA garantido.

---

## 6. Hotspots Compartilhados
- `extension/sidepanel.html`
- `extension/sidepanel.css`
- `mobile-pwa/index.html`
- `demo-portal/index.html`
- `extension/icons/icon-symbol.svg`

---

## 7. Tarefas (DAG)

## T1 — Assets Vetoriais da Marca Oficial (`extension/icons/icon-symbol.svg`)
- **Requisitos:** REQ-001, REQ-002
- **Agent:** tear-brand-architect
- **model:** gemini-2.5-pro
- **effort:** baixo
- **tempo:** 15m
- **Depends-on:** nenhum

## T2 — Refatoração do Sidepanel HTML & CSS da Extensão (`extension/sidepanel.*`)
- **Requisitos:** REQ-001, REQ-002, REQ-003, REQ-004, REQ-005
- **Agent:** tear-frontend
- **model:** gemini-2.5-pro
- **effort:** médio
- **tempo:** 30m
- **Depends-on:** T1

## T3 — Harmonização do Mobile Scanner PWA (`mobile-pwa/index.html`)
- **Requisitos:** REQ-001, REQ-002, REQ-005
- **Agent:** tear-frontend
- **model:** gemini-2.5-pro
- **effort:** médio
- **tempo:** 20m
- **Depends-on:** T1

## T4 — Harmonização do Banner de Injeção no Simulador (`demo-portal/index.html`)
- **Requisitos:** REQ-001, REQ-004
- **Agent:** tear-frontend
- **model:** gemini-2.5-pro
- **effort:** baixo
- **tempo:** 15m
- **Depends-on:** T2

## T5 — Validação de Regressão e Portão Green dos 136 Testes
- **Requisitos:** REQ-004
- **Agent:** tear-qa
- **model:** gemini-2.5-pro
- **effort:** baixo
- **tempo:** 15m
- **Depends-on:** T2, T3, T4

---

## 8. Matriz de Rastreabilidade

| Requisito | Tarefa | Teste |
| :--- | :--- | :--- |
| REQ-001 | T1, T2, T3, T4 | tests/extension/sidepanel.test.js |
| REQ-002 | T1, T2, T3 | tests/extension/sidepanel.test.js |
| REQ-003 | T2 | tests/extension/sidepanel.test.js |
| REQ-004 | T2, T4 | tests/extension/content.test.js, tests/portal/portal.test.js |
| REQ-005 | T2, T3 | tests/extension/sidepanel.test.js |
