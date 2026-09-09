# PLAN-002: Ativação Limpa sob Demanda e Eliminação da Miniatura Flutuante Residual

## 1. Visão Geral e Problema
* **Contexto**: A extensão do doc2fill é construída sobre Manifest V3 com Side Panel nativo configurado em `background.js`.
* **Problema Relatado**:
  1. O script de conteúdo (`extension/content.js`) injetava automaticamente uma pílula/botão flutuante (`doc2fill-floating-trigger`) no canto inferior direito de todas as páginas web (`<all_urls>`).
  2. A miniatura flutuante permanecia fixa no canto da tela mesmo com outros aplicativos ou vídeos em tela cheia (ex: YouTube em fullscreen, Netflix, dashboards).
  3. Ao fechar o drawer/painel in-page, a miniatura continuava visível.
* **Objetivo**:
  1. Ao fechar o painel do doc2fill, **absolutamente nada** deve permanecer visível na página web ou no navegador.
  2. A ativação do painel deve ocorrer **exclusivamente sob demanda** quando o usuário clicar no ícone da extensão na barra do Chrome ou usar o atalho de teclado dedicado.
  3. Manter o DOM de páginas de terceiros 100% imaculado e livre de poluição visual.

---

## 2. Três Opções Técnicas Avaliadas (Regra #2)

### Opção 1 (Recomendada): Side Panel Nativo Exclusivo + Content Script Silencioso
* **Mecanismo**:
  - Elimina a auto-injeção de `injectFloatingTrigger()` em `extension/content.js`.
  - A interface primária opera 100% no **Side Panel oficial do Chrome Manifest V3** (`chrome.sidePanel`), que abre ao clicar no ícone da extensão na barra de ferramentas do navegador.
  - Por ser uma interface nativa do navegador (externa ao DOM da página), fechá-la garante que **nada** apareça ou permaneça na página web visitada.
  - O `content.js` atua como um listener silencioso e headless para comandos de autofill (`DOC2FILL_EXECUTE`), exibindo apenas um toast transitório que se autodestrói por completo (`remove()`) após 3 segundos quando o preenchimento é efetuado.
  - Caso o drawer in-page seja acionado como fallback de emergência em navegadores sem suporte a side panel, o botão de fechar destrói o elemento do DOM (`drawer.remove()`) sem manter nenhuma miniatura residual.
* **Prós**:
  - Zero intrusão visual em qualquer site (inclusive YouTube em tela cheia).
  - 100% alinhado com as diretrizes de UX e segurança da Chrome Web Store.
  - Performance máxima (zero overhead ou modificação do DOM na carga de páginas).
* **Contras**:
  - Exige que o usuário clique no ícone da extensão na barra ou acione o atalho.

### Opção 2: Restrição de Injeção a Portais Fiscais + Ocultação em Tela Cheia
* **Mecanismo**:
  - Restringe `content_scripts` no `manifest.json` apenas a URLs específicas (`*gov.br`, `*agu.gov.br`, etc.).
  - Adiciona listener de `fullscreenchange` para esconder o trigger quando o navegador entrar em tela cheia.
* **Prós**:
  - Impede a exibição no YouTube.
* **Contras**:
  - Ainda mantém a miniatura persistente nos portais fiscais, violando a exigência de "não aparecer mais nada ao fechar".
  - Inflexível para novos portais governamentais não mapeados.

### Opção 3: Injeção Dinâmica sob Demanda via Context Menu / Action
* **Mecanismo**:
  - Remove `content_scripts` estáticos e injeta scripts dinamicamente via `chrome.scripting.executeScript`.
* **Prós**:
  - Scripts só rodam se invocados.
* **Contras**:
  - Complexidade desnecessária para gerenciar injeções concorrentes quando o Side Panel nativo já resolve perfeitamente a separação.

---

## 3. Estratégia de TDD (Mínimo 3 Cenários por Suíte)

Será atualizada a suíte de testes em `tests/extension/content.test.js`:
1. **Cenário 1 (Happy Path)**: `content.js` inicializa em página limpa sem injetar nenhum nó flutuante persistente no DOM.
2. **Cenário 2 (Edge Case)**: Fechamento de modal/drawer de fallback remove e limpa completamente qualquer nó do DOM (`element.remove()`), deixando a página 100% limpa sem resíduos.
3. **Cenário 3 (Error Path)**: Requisições de fechamento ou autofill sem dados válidos não recriam elementos fantasmas nem deixam elementos órfãos.

---

## 4. Modificações de Código Planejadas
1. `extension/content.js`:
   - Remover chamada e definição de injeção automática de `injectFloatingTrigger()`.
   - Modificar fechamento de drawer in-page para destruição completa (`remove()`).
   - Garantir que o toast de notificação seja limpo e removido do DOM após o fade out.
2. `tests/extension/content.test.js`:
   - Adicionar asserções TDD testando o ciclo de vida e a ausência de nós residuais no DOM.
3. `docs/adr/ADR-004-user-initiated-clean-activation.md`:
   - Registrar a decisão de arquitetura.
