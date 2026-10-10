# PLAN-014: S2-T1 e S2-T2 — Split-View de Conferência Visual e Edição Manual Reativa

## Metadados SDD
- **versao_plano:** 1.0.0
- **tipo:** feature
- **blast_radius:** baixo
- **orcamento_tokens:** 25000

---

## 1. Visão Geral e Justificativa
A eficácia do preenchimento fiscal depende da conferência humana rápida e sem atritos. Atualmente, o operador vê apenas caixas de texto com os dados extraídos, precisando confiar cegamente no OCR ou abrir o arquivo em outra janela. Implementar um componente retrátil de Split-View com pré-visualização de imagem/PDF em memória efêmera acoplado aos controles de edição manual (restauração de extração original e limpeza rápida) eleva a acurácia para 100% e confere total autoridade ao operador antes da injeção no portal CCHA.

---

## 2. Opções Técnicas Avaliadas (Regra Tear #2)

### Opção 1: Janela Popup Flutuante Externa
- **Descrição:** Abrir a imagem em uma nova aba do Chrome ou janela popup separada via `window.open`.
- **Prós:** Nenhum impacto de layout no Sidepanel.
- **Contras:** Quebra o fluxo cognitivo do operador; requer permissões adicionais de popup no Chrome; distrai o usuário alternando abas.

### Opção 2: Modal em Tela Cheia no Sidepanel
- **Descrição:** Exibir a imagem em um modal que cobre todo o formulário.
- **Prós:** Imagem em tamanho grande.
- **Contras:** Impede a conferência simultânea campo a campo com os dados editáveis.

### Opção 3 (RECOMENDADA): Split-View Retrátil com Zoom Tátil Integrado
- **Descrição:** Adicionar um container retrátil no topo do card de formulário do Sidepanel com visualizador de imagem, controles táteis de zoom (100%, 150%, 200%) e botões de ação rápida de restauração e limpeza manual, operando exclusivamente em memória efêmera.
- **Prós:** Conferência visual instantânea lado a lado; adaptação ergonômica à largura de 400px a 500px do Sidepanel; zero permissões invasivas e Zero Retenção.
- **Contras:** Requer estilização CSS cuidadosa com rolagem independente.

---

## 3. Não-Objetivos / Fora de Escopo
- Não alterar os IDs canônicos existentes dos 8 campos de formulário.
- Não enviar a imagem para servidores externos (Zero Retenção mantida).
- Não introduzir dependências pesadas de bibliotecas de manipulação de imagem.

---

## 4. Requisitos EARS

| Requisito | Tipo Declarado | Especificação |
| :--- | :--- | :--- |
| REQ-001 | Event | Quando um arquivo de imagem ou comprovante for carregado, o sistema deve renderizar a miniatura visual no container de Split-View com controles de zoom. |
| REQ-002 | Event | Quando o operador clicar no botão de zoom, o sistema deve redimensionar dinamicamente a pré-visualização da imagem entre 100%, 150% e 200%. |
| REQ-003 | Event | Quando o operador clicar em 'Restaurar Dados Originais', o sistema deve repovoar os 8 campos com os valores da última extração automática. |
| REQ-004 | Event | Quando o operador clicar em 'Limpar Campos', o sistema deve esvaziar os campos permitindo digitação manual imediata. |
| REQ-005 | Ubiquitous | O sistema deve injetar no portal de destino os valores atualizados em tempo real pelos campos do DOM no momento do clique em preencher. |

---

## 5. Orçamentos Não-Funcionais
- **Limite de Linhas de Código (Regra #24):** `sidepanel.js` (< 650 linhas) e `sidepanel.css` (< 600 linhas).
- **Tempo de Resposta Visual:** Transição de zoom e colapso em menos de 100ms a 60 FPS.
- **Segurança & Memória:** Imagem carregada via DataURL efêmero sem gravação em disco.

---

## 6. Hotspots Compartilhados
- `extension/sidepanel.html`
- `extension/sidepanel.css`
- `extension/sidepanel.js`
- `tests/extension/sidepanel.test.js`

---

## 7. Tarefas (DAG)

## T1 — Estrutura HTML e CSS do Split-View (`extension/sidepanel.html` e `extension/sidepanel.css`)
- **Requisitos:** REQ-001, REQ-002
- **Agent:** noesis-bento-tactile-designer
- **model:** gemini-2.5-pro
- **effort:** médio
- **tempo:** 20m
- **Depends-on:** nenhum

## T2 — Lógica de Zoom, Ações de Restauração e Limpeza (`extension/sidepanel.js`)
- **Requisitos:** REQ-002, REQ-003, REQ-004, REQ-005
- **Agent:** tear-frontend
- **model:** gemini-2.5-pro
- **effort:** médio
- **tempo:** 25m
- **Depends-on:** T1

## T3 — Suíte TDD dos 3 Cenários de Edição e Split-View (`tests/extension/sidepanel.test.js`)
- **Requisitos:** REQ-001, REQ-003, REQ-004, REQ-005
- **Agent:** tear-qa
- **model:** gemini-2.5-pro
- **effort:** baixo
- **tempo:** 15m
- **Depends-on:** T2

---

## 8. Matriz de Rastreabilidade

| Requisito | Tarefa | Teste |
| :--- | :--- | :--- |
| REQ-001 | T1 | tests/extension/sidepanel.test.js |
| REQ-002 | T2 | tests/extension/sidepanel.test.js |
| REQ-003 | T2 | tests/extension/sidepanel.test.js |
| REQ-004 | T2 | tests/extension/sidepanel.test.js |
| REQ-005 | T2 | tests/extension/sidepanel.test.js |
