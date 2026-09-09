---
numero: 4
titulo: Ativação Exclusivamente sob Demanda e Eliminação Total de Miniaturas e Triggers Flutuantes no DOM
data: 2026-09-09
status: Proposto
autores:
  - Kazuhiro
aplica_a:
  - extension
tags:
  - extension
  - ux
  - sidepanel
  - manifest-v3
  - clean-dom
---

# ADR-004: Ativação Exclusivamente sob Demanda e Eliminação Total de Miniaturas e Triggers Flutuantes no DOM

## Contexto
Durante o uso cotidiano do navegador com a extensão `doc2fill` instalada, observou-se que o script de conteúdo (`content.js`) injetava automaticamente um gatilho de ação flutuante (`#doc2fill-floating-trigger`) no canto inferior direito de todas as páginas da web.

Essa miniatura visual causava severos inconvenientes de experiência:
1. Permanece fixa sobreposta a vídeos em tela cheia (como no YouTube), jogos e dashboards interativos.
2. Ao abrir e fechar a interface do `doc2fill`, a miniatura continuava presente na página.
3. Poluição indevida do DOM em páginas que nada têm a ver com preenchimento de certidões e notas fiscais.

## Decisão
Decidimos por:
1. **Eliminar completamente a injeção automática de qualquer gatilho ou miniatura flutuante** no carregamento das páginas (`document_idle`).
2. Adotar como canal exclusivo de ativação o **Side Panel nativo do Chrome (Manifest V3)**, acionado diretamente pelo clique do usuário no ícone da extensão na barra de ferramentas do navegador.
3. Manter o `content.js` em modo estritamente silencioso e headless, respondendo apenas a mensagens de preenchimento (`DOC2FILL_EXECUTE`) disparadas pelo Side Panel.
4. Garantir que caso qualquer elemento visual temporário (ex: toast de sucesso ou fallback de emergência) seja renderizado na página, seu fechamento ou conclusão remova sumariamente o nó do DOM (`element.remove()`), restaurando o estado 100% imaculado da página.

## Consequências

### Positivas
* **Zero poluição visual**: YouTube em tela cheia, streaming, jogos e portais corporativos permanecem 100% livres de elementos flutuantes indesejados.
* **Privacidade e Discrição**: O usuário controla exatamente quando quer abrir a ferramenta via barra de ferramentas do Chrome.
* **Performance Superior**: Eliminação de nós e estilos fixos inseridos desnecessariamente no DOM de todas as páginas visitadas.
* **Conformidade Estrita com Diretrizes do Chrome Web Store**: Uso das APIs nativas (`chrome.sidePanel`) projetadas para essa finalidade.

### Negativas
* O usuário precisa clicar no ícone da barra de ferramentas do Chrome ou utilizar atalho de teclado para abrir o painel.
