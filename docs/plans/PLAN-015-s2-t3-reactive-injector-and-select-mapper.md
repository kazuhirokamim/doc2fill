# PLAN-015: S2-T3 e S2-T4 — Injetor de Eventos Reativos e Mapeador Semântico de Selects

## Metadados SDD
- **versao_plano:** 1.0.0
- **tipo:** feature
- **blast_radius:** baixo
- **orcamento_tokens:** 25000

---

## 1. Visão Geral e Justificativa
Portais corporativos governamentais e de reembolsos de saúde (como CCHA / AGU, SISU e sistemas em Angular Material / React) implementam reatividade através de interceptores de propriedades e observadores de eventos. A atribuição direta de valores em elementos `input` é descartada no `blur` se os setters dos protótipos originais não forem acionados com a cadeia correta de `InputEvent` e `composed: true`. Além disso, campos `<select>` apresentam variações textuais que requerem correspondência semântica tolerante com fallback seguro para a opção "Outros".

---

## 2. Opções Técnicas Avaliadas (Regra Tear #2)

### Opção 1: Simulação Completa de Teclado via Puppeteer/CDP
- **Descrição:** Utilizar a API de Depurador do Chrome (`chrome.debugger`) para enviar comandos `Input.dispatchKeyEvent`.
- **Prós:** Emulação 100% nativa em nível de SO.
- **Contras:** Exige a permissão invasiva `debugger` no Manifest V3, exibe uma barra de alerta amarela intimidadora no topo do navegador ("doc2fill começou a depurar este navegador") e quebra a experiência do usuário.

### Opção 2: Dispatch Simples de Evento 'change'
- **Descrição:** Atribuir `input.value = val` e despachar apenas `new Event('change')`.
- **Prós:** Código minimalista.
- **Contras:** Falha em formulários reativos do Angular e React; o estado interno do componente não se sincroniza e os dados desaparecem ao perder o foco.

### Opção 3 (RECOMENDADA): Injetor Reativo de Prototype Descriptor com Cadeia de Eventos Composta e Mapeador Semântico
- **Descrição:** Implementar `setInputValueWithEvents` invocando o setter nativo do protótipo (`HTMLInputElement.prototype` ou `HTMLTextAreaElement.prototype`), seguido do despacho ordenado de `Event('input')`, `InputEvent('input', { inputType: 'insertText', data: val, composed: true })`, `Event('change')` e `Event('blur')`, somado a um algoritmo de seleção semântica O(N) com fallback seguro para "Outros".
- **Prós:** Universalmente compatível com Angular Reactive Forms, React e Vue; opera dentro do Sandbox do Content Script sem permissões invasivas; mantém zero dados no DOM e acurácia total.
- **Contras:** Requer tratamento diferenciado entre inputs de texto, números, datas e elementos de seleção.

---

## 3. Não-Objetivos / Fora de Escopo
- Não alterar a interface gráfica do Sidepanel.
- Não introduzir dependências externas no Content Script.
- Não violar o limite de 700 linhas em `extension/content.js`.

---

## 4. Requisitos EARS

| Requisito | Tipo Declarado | Especificação |
| :--- | :--- | :--- |
| REQ-001 | Event | Quando o sistema injetar um valor em um campo de texto, o sistema deve acionar o setter original do protótipo HTMLInputElement ou HTMLTextAreaElement. |
| REQ-002 | Event | Quando o setter do protótipo for executado, o sistema deve despachar sequencialmente os eventos input, InputEvent com inputType insertText, change e blur com flags bubbles e composed ativas. |
| REQ-003 | State-driven | Enquanto um campo for do tipo select, o sistema deve executar correspondência semântica das opções comparando equivalências fiscais antes de recorrer ao valor literal. |
| REQ-004 | Event | Quando nenhuma opção do select corresponder ao valor do documento, o sistema deve selecionar a opção correspondente a Outros ou Outro se disponível. |
| REQ-005 | Ubiquitous | O sistema deve manter todos os métodos da engine de injeção acessíveis em globalThis.__doc2fill_content_engine para fins de teste e auditoria forense. |

---

## 5. Orçamentos Não-Funcionais
- **Limite de Linhas de Código (Regra #24):** `extension/content.js` mantido abaixo de 450 linhas (teto 700).
- **Tempo de Execução:** Injeção completa de todos os 8 campos em menos de 150ms.
- **Complexidade Assintótica:** Casamento de selects em tempo linear O(N) onde N é o número de opções do select.

---

## 6. Hotspots Compartilhados
- `extension/content.js`
- `tests/extension/content.test.js`

---

## 7. Tarefas (DAG)

## T1 — Implementação de setInputValueWithEvents e Fallback de Selects (`extension/content.js`)
- **Requisitos:** REQ-001, REQ-002, REQ-003, REQ-004, REQ-005
- **Agent:** noesis-frontend-maestro
- **model:** gemini-2.5-pro
- **effort:** médio
- **tempo:** 20m
- **Depends-on:** nenhum

## T2 — Suíte TDD Completa de Reatividade e Selects (`tests/extension/content.test.js`)
- **Requisitos:** REQ-001, REQ-002, REQ-003, REQ-004
- **Agent:** tear-qa
- **model:** gemini-2.5-pro
- **effort:** baixo
- **tempo:** 15m
- **Depends-on:** T1

---

## 8. Matriz de Rastreabilidade

| Requisito | Tarefa | Teste |
| :--- | :--- | :--- |
| REQ-001 | T1 | tests/extension/content.test.js |
| REQ-002 | T1 | tests/extension/content.test.js |
| REQ-003 | T1 | tests/extension/content.test.js |
| REQ-004 | T1 | tests/extension/content.test.js |
| REQ-005 | T1 | tests/extension/content.test.js |
