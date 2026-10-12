---
numero: 25
titulo: Experiencia Power-User, Atalhos de Teclado, Highlighter Visual e Historico Local
data: 2026-10-12
status: Aceito
autores:
  - Kazuhiro
  - Tear Maestro
  - Noesis Frontend Maestro
  - Noesis A11y Keyboard Guard
aplica_a:
  - extension
  - core
  - tests
tags:
  - shortcuts
  - keyboard-navigation
  - visual-highlighter
  - local-history
  - indexeddb
---

# ADR-025: Experiência Power-User, Atalhos de Teclado, Highlighter Visual e Histórico Local

## Contexto
O **doc2fill** atingiu excelente robustez na extração fiscal e auto-deskew de comprovantes. No entanto, o fluxo diário de prestação de contas ainda exigia cliques constantes com o mouse para focar a extensão e acionar o botão de preenchimento. Além disso, ao preencher páginas extensas com múltiplos campos, os usuários relatavam incerteza visual imediata sobre quais inputs exatos haviam sido alterados. Por fim, a necessidade de reprocessar comprovantes repetidos gerava perda de tempo, demandando um mecanismo de histórico recente que respeitasse o princípio inegociável de Zero Retenção na Nuvem.

## Decisão
No contexto de aprimoramento da produtividade diária e experiência do usuário na Trilha A, enfrentando atritos de navegação manual por mouse, falta de certeza visual sobre campos alterados e repetição de uploads de documentos frequentes, decidimos por implementar atalhos de teclado nativos no Manifest e Sidepanel (`Alt+D`, `Ctrl+Shift+F`, `Ctrl+Enter`), um efeito Highlighter temporário suave com contorno ciano (`#00D2FF`) durante a injeção em formulários web, e um histórico rotativo local dos últimos 10 comprovantes via IndexedDB / Storage local, para alcançar máxima agilidade operacional de digitação e alta segurança perceptual com privacidade absoluta, aceitando que o histórico fica restrito ao perfil local do navegador sem sincronização remota entre dispositivos.

### Detalhes da Decisão
1. **Atalhos Nativos e Teclado (`extension/manifest.json` e `extension/sidepanel.js`):**
   - Declaração de comandos no Manifest V3 (`_execute_action` com `Alt+D` e `fill_active_form` com `Ctrl+Shift+F`).
   - Captura de `Ctrl+Enter` / `Cmd+Enter` dentro do Sidepanel para acionar o botão de injeção imediata.
2. **Highlighter Visual de Campos Injetados (`extension/content.js`):**
   - Função `highlightFilledElement(el, durationMs)` com outline suave ciano `#00D2FF` e box-shadow temporário de 1.5s, restaurando o estilo prévio sem sujar o DOM da página hospedeira.
3. **Histórico Local de Documentos (`core/history-store.js`):**
   - Gerenciamento local dos últimos 10 documentos processados com descarte automático de itens excedentes (LRU).
   - Botão e método de exclusão manual instantânea para controle do usuário.

## Consequências

### Positivas
- Redução significativa do tempo de preenchimento para operadores frequentes (fluxo 100% via teclado).
- Feedback visual imediato e agradável, eliminando dúvidas sobre campos afetados.
- Reabertura instantânea dos últimos 10 comprovantes sem novo envio de arquivo.
- Princípio de Zero Retenção na Nuvem integralmente preservado.

### Negativas
- Armazenamento limitado à máquina local (não sincroniza entre navegadores ou perfis distintos).

### Neutras/Riscos Mitigados
- A aplicação do destaque visual é não-destrutiva e restaura o estilo original do formulário alvo após 1500ms.
