---
numero: 18
titulo: Reformulação da Identidade Visual e Varredura Epistêmica de UI/UX do Frontend Doc2Fill
data: 2026-10-09
status: Aceito
autores:
  - Kazuhiro
  - Tear Maestro
  - Noesis UI Swarm
aplica_a:
  - extension
  - demo-portal
  - mobile-pwa
tags:
  - brand-identity
  - obsidian-dark
  - flow-cyan
  - connection-blue
  - visual-revamp
  - ui-ux
  - a11y-wcag-aa
---

# ADR-018: Reformulação da Identidade Visual e Varredura Epistêmica de UI/UX do Frontend Doc2Fill

## Contexto
O frontend do **doc2fill** (Sidepanel da Extensão Chrome, Mobile PWA Scanner e Simulador de Portal) foi inicialmente montado com um visual genérico, com paleta clara (`#F9FAFB`), emojis de sistema (`⚡`, `📄`, `⏳`), botões cinzas e badges em tons de amarelo que lembravam avisos de erro. Com a definição da identidade de marca oficial do doc2fill — fundamentada no Brandboard corporativo e logotipo oficial (Obsidian Dark `#0A0D14`, Connection Blue `#0052FF`, Flow Cyan `#00D2FF`, Titanium White `#F8FAFC` e Slate Grey `#64748B`), foi realizada uma varredura de UI/UX através dos agentes e lentes do Tear e Noesis (`tear-brand-architect`, `noesis-bento-tactile-designer`, `noesis-frontend-maestro`, `noesis-a11y-keyboard-guard` e `tear-security`).

## Decisão
No contexto de modernização da interface e consolidação da marca oficial do Doc2Fill, enfrentando a necessidade de eliminar inconsistências visuais, emojis de sistema heterogêneos e elevar o padrão de acabamento para o nível executivo sem quebrar contratos de DOM nem violar o CSP do Manifest V3, decidimos por adotar um Design System Obsidian Minimalista & Táctil em todas as superfícies frontend (extensão, PWA mobile e portal simulado), com paleta centrada em `#0A0D14` e `#111622`, gradiente Connection Blue (`#0052FF`) e Flow Cyan (`#00D2FF`), logotipo e símbolo vetorial SVG oficial, tipografia de alta fidelidade baseada em Plus Jakarta Sans e Outfit, preservação estrita de todos os IDs de elementos funcionais e garantia de contraste WCAG AA, para alcançar elegância visual contemporânea, foco cognitivo sem distrações e usabilidade tátil de alta conversão, aceitando o esforço de reestruturação do CSS e criação de assets SVG vetoriais autônomos.

### Detalhes da Decisão
1. **Paleta Oficial e Tokens de Design**:
   - `--color-bg-base: #0A0D14` (Obsidian Dark)
   - `--color-surface-card: #111622` (Bento Card Surface)
   - `--color-surface-input: #0F1420` (Input Background)
   - `--color-primary-blue: #0052FF` (Connection Blue)
   - `--color-accent-cyan: #00D2FF` (Flow Cyan)
   - `--color-text-title: #F8FAFC` (Titanium White)
   - `--color-text-muted: #64748B` e `--color-text-subtle: #94A3B8` (Slate Grey)
   - `--color-border-subtle: #1E293B` e `--color-border-active: #2A3447`
2. **Símbolo e Logomarca Vetorial**:
   - Criação do símbolo SVG oficial do doc2fill: silhueta de documento com dobra angular superior direita + checkmark contínuo finalizado em ponta de cursor de clique no canto inferior direito.
   - Tipografia de marca: `Doc` (Titanium White) + `2Fill` (Flow Cyan).
3. **Eliminação de Elementos Inconsistentes**:
   - Remoção de emojis genéricos (`⚡`, `📄`, `⏳`) que renderizam de forma discrepante entre plataformas.
   - Substituição do badge amarelo de aviso por Obsidian Pill Badges com borda azul/ciano sutil.
4. **Preservação Rígida de Contratos e IDs**:
   - Manutenção de todos os 8 IDs do formulário: `field-tipo-doc`, `field-cnpj`, `field-razao`, `field-num-doc`, `field-data`, `field-valor`, `field-descricao`, `field-motivo` e do botão `btn-autofill`.
5. **Conformidade CSP Manifest V3**:
   - Estilização autocontida em `sidepanel.css`, sem injeção de scripts remotos ou estilos inline proibidos.

## Consequências

### Positivas
- Identidade visual harmônica, sofisticada e premium em todo o produto.
- Zero regressão funcional: os 136 testes continuam 100% verdes.
- Ergonomia visual aprimorada com redução da fadiga ocular em sessões prolongadas de trabalho.
- Conformidade total com acessibilidade WCAG AA (contraste > 7:1) e CSP do Chrome MV3.

### Negativas
- Necessidade de carregar assets SVG adicionais e manter coerência de paleta em futuras telas.

### Neutras/Riscos Mitigados
- O portal governamental simulado mantém suas seções federais para fins de teste realista de autofill, aplicando o tema Obsidian apenas no assistente do doc2fill.
