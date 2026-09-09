---
numero: 5
titulo: Content Script 100% Headless com Zero Injeção de Nós no DOM e Desacoplamento Total de UI
data: 2026-09-09
status: Aceito
autores:
  - Kazuhiro
aplica_a:
  - extension
tags:
  - extension
  - architecture
  - sidepanel
  - headless
  - clean-dom
---

# ADR-005: Content Script 100% Headless com Zero Injeção de Nós no DOM e Desacoplamento Total de UI

## Contexto
Mesmo após a remoção da auto-injeção de gatilhos na v0.2.0, um card flutuante (`#doc2fill-inpage-drawer`) continuava a ser renderizado na página web ao acionar a extensão. A investigação forense revelou que `background.js` continha um listener (`chrome.action.onClicked`) que, ao capturar erro em `chrome.sidePanel.open` (ocorrência comum quando o painel já está sendo aberto de forma nativa pela flag `openPanelOnActionClick`), disparava uma mensagem de fallback `DOC2FILL_TOGGLE_DRAWER` para o `content.js`.

O script de conteúdo então injetava um modal fixo de 320px no canto inferior direito do HTML da página. Ao fechar o Side Panel nativo pelo "X" do Chrome, o card permanecia na página web, gerando sobreposição indevida em vídeos (ex: YouTube) e confusão de usabilidade.

## Decisão
Decidimos por:
1. **Extirpar completamente o canal de fallback in-page**: Remover `DOC2FILL_TOGGLE_DRAWER` do `background.js` e `content.js`.
2. **Transformar o Content Script em um Executor 100% Headless**:
   - Zero chamadas a `document.createElement` ou `document.body.appendChild` em `content.js`.
   - O script atua estritamente como agente preenchedor de formulários, ouvindo mensagens `DOC2FILL_EXECUTE`, localizando inputs e manipulando seus valores diretamente.
   - O feedback de status é 100% centralizado no Side Panel nativo (`btnAutofill.textContent = "✓ Formulário Preenchido!"`) e nos anéis esmeralda suaves aplicados aos próprios inputs (`highlightSuccessField`).
3. **Expurgo Preventivo Contínuo**: No carregamento, o `content.js` varre e remove imediatamente qualquer elemento legado remanescente (`#doc2fill-floating-trigger`, `#doc2fill-inpage-drawer`, `#doc2fill-toast`).

## Consequências

### Positivas
* **Imunidade Absoluta a Resíduos Visuais**: É tecnicamente impossível que o `content.js` deixe qualquer elemento no canto inferior direito, pois o código de injeção foi 100% removido.
* **Desacoplamento Arquitetural**: UI pertence exclusivamente ao Side Panel nativo; Content Script é uma camada invisível de automação de formulários.
* **Compatibilidade Completa com YouTube / Streaming / Jogos**: 0 mutações estruturais na árvore do DOM.
* **Segurança e CSP**: Menor superfície de ataque e ausência de nós dinâmicos flutuantes.

### Negativas
* Em navegadores ou modos onde o Chrome Side Panel não seja suportado de forma alguma, o fallback abre a extensão em aba dedicada em vez de desenhar um modal in-page.
