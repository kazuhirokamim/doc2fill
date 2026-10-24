# PLAN-027: Implementação da Identidade Visual Doc2Fill: Warm Light Craft

- **status:** Implementado
- **rev:** 01a23bf
- **autor:** Kazuhiro & Tear Maestro
- **data:** 24/10/2026
- **tearform:** respostas/027.md
- **adr:** docs/adr/ADR-035-design-system-warm-light-craft.md

## Metadados SDD
- **versao_plano:** 1.0.0
- **tipo:** feature
- **blast_radius:** médio
- **orcamento_tokens:** 30000

---

## 1. Visão Geral e Justificativa
O **doc2fill** atua em fluxos de automação de preenchimento documental para portais governamentais e corporativos. A estética anterior ("Obsidian & Flow Cyan") empregava fundo escuro (`#0A0D14`) e gradientes em ciano/azul com traços de neon.
Com base nas novas diretrizes de design de alta produtividade documental ("Warm Light Craft"), este plano estabelece a padronização e unificação visual do ecossistema:
- Landing Page oficial (`site/`);
- Extensão Google Chrome (`extension/`);
- Scanner Mobile PWA (`mobile-pwa/`);
- Ativos e vetores da marca (`extension/icons/`).

---

## 2. Opções Técnicas Avaliadas (Regra Tear #2)

### Opção 1 (RECOMENDADA): Arquitetura Unificada de Tokens CSS Nativos e Refatoração Semântica
- **Descrição:** Centralizar design tokens via variáveis `:root` nos pontos de entrada existentes (`site/style.css`, `extension/sidepanel.css`, `mobile-pwa/index.html`), atualizar SVGs e refatorar os componentes mantendo HTML/JS Vanilla sem dependências externas.
- **Prós:**
  - 100% fiel às imagens de referência do produto.
  - Zero novas dependências de runtime e conformidade com a Regra Ponytail #24.
  - Preserva integralmente os 257 testes unitários automatizados.
  - Baixo tempo de carregamento e sem overhead em bundle.
- **Contras:**
  - Requer harmonização cuidadosa dos subcomponentes da extensão (split-view, toasts, modal).

### Opção 2: Reescrita com Tailwind CSS via Pipeline de Build
- **Descrição:** Introduzir Tailwind CSS com compilação via `esbuild`.
- **Prós:** Padrão comum de utilitários em projetos web.
- **Contras:**
  - Aumenta complexidade do pipeline e violação expressa das instruções do Master Prompt.
  - Risco de atrito com Content Security Policy (CSP) no Manifest V3 do Chrome.

### Opção 3: Substituição Superficial de Hexadecimais
- **Descrição:** Apenas alterar os valores das variáveis CSS de azul/ciano para âmbar/cinza sem reestruturar layouts.
- **Prós:** Execução extremamente rápida.
- **Contras:**
  - Não atinge a qualidade visual das referências e mantém hierarquias desbalanceadas.

---

## 3. Não-Objetivos / Fora de Escopo
- Não alterar regras de negócio de extração OCR, expressões regulares, tradução clínica TUSS ou injeção de formulários.
- Não introduzir dependências de frameworks frontend adicionais (como React, Vue ou Tailwind).
- Não alterar a estrutura funcional do portal demonstrativo (`demo-portal/`), preservando o visual de sistema governamental AGU.
- Não violar o teto de 700 linhas de código por arquivo de produção (Regra Tear #24).

---

## 4. Requisitos EARS

| Requisito | Tipo Declarado | Especificação |
| :--- | :--- | :--- |
| REQ-001 | Ubiquitous | O sistema deve aplicar os tokens da paleta Warm Light Craft com fundo canvas branco (`#FFFFFF`), superfícies neutras (`#F9FAFB`) e acento âmbar solar (`#F59E0B`). |
| REQ-002 | State-Driven | Enquanto a extensão estiver em estado ocioso ou aguardando arquivo, o sistema deve exibir status pill "● Pronto para usar" com contraste de acessibilidade validado. |
| REQ-003 | Event | Quando um documento for detectado e processado, o sistema deve renderizar o card de documento detectado com dados em destaque e botão de ação primária em âmbar solar. |
| REQ-004 | Optional | Onde a tela permitir visualização de identificadores fiscais, o sistema deve renderizar os dados de CNPJ e chaves em fonte monoespaçada. |
| REQ-005 | Unwanted | Se uma cor de destaque âmbar não atingir taxa mínima de contraste WCAG AA com o texto em primeiro plano, o sistema deve aplicar variante escura de contraste (`#D97706` ou texto escuro `#111827`). |

---

## 5. Orçamentos Não-Funcionais
- **Contraste de Acessibilidade:** Conformidade WCAG 2.1 AA (mínimo 4.5:1 para texto normal e 3:1 para componentes de UI).
- **Orçamento de Linhas (Regra #24):** Máximo de 700 linhas por arquivo de código de produção.
- **Tamanho de Pacote da Extensão:** Variação inferior a 5% em relação ao build atual.
- **Suíte de Testes (Regra #3):** Manter 100% dos 257 testes verdes.

---

## 6. Hotspots Compartilhados
- `site/style.css`
- `site/showcase.css`
- `site/index.html`
- `extension/sidepanel.html`
- `extension/sidepanel.css`
- `extension/icons/icon-symbol.svg`
- `extension/icons/logo-full.svg`
- `extension/icons/icon-squircle.svg`
- `mobile-pwa/index.html`

---

## 7. Tarefas (DAG)

## T1 — Ativos da Marca e Vetores SVG (`extension/icons/*`)
- **Requisitos:** REQ-001
- **Agent:** design-system-architect
- **model:** gemini-2.5-pro
- **effort:** médio
- **tempo:** 15m
- **Depends-on:** nenhum

## T2 — Design Tokens e Tipografia Global (`site/style.css`, `extension/sidepanel.css`)
- **Requisitos:** REQ-001, REQ-004, REQ-005
- **Agent:** tear-frontend
- **model:** gemini-2.5-pro
- **effort:** médio
- **tempo:** 20m
- **Depends-on:** T1

## T3 — Extensão Chrome Warm Light Craft (`extension/sidepanel.html`, `extension/sidepanel.css`)
- **Requisitos:** REQ-001, REQ-002, REQ-003, REQ-004, REQ-005
- **Agent:** tear-frontend
- **model:** gemini-2.5-pro
- **effort:** médio
- **tempo:** 25m
- **Depends-on:** T2

## T4 — Mobile Scanner PWA (`mobile-pwa/index.html`)
- **Requisitos:** REQ-001, REQ-005
- **Agent:** tear-frontend
- **model:** gemini-2.5-pro
- **effort:** baixo
- **tempo:** 15m
- **Depends-on:** T2

## T5 — Landing Page SaaS e Showcase Interativo (`site/index.html`, `site/showcase.css`)
- **Requisitos:** REQ-001, REQ-003, REQ-005
- **Agent:** tear-frontend
- **model:** gemini-2.5-pro
- **effort:** médio
- **tempo:** 25m
- **Depends-on:** T2, T3

## T6 — Validação de Build e Testes Automatizados (`tests/landing-page-and-feedback.test.js`)
- **Requisitos:** REQ-001, REQ-002, REQ-003, REQ-004, REQ-005
- **Agent:** tear-qa
- **model:** gemini-2.5-pro
- **effort:** baixo
- **tempo:** 10m
- **Depends-on:** T3, T4, T5

---

## 8. Matriz de Rastreabilidade

| Requisito | Tarefa | Teste |
| :--- | :--- | :--- |
| REQ-001 | T1, T2, T3, T4, T5, T6 | tests/landing-page-and-feedback.test.js |
| REQ-002 | T3, T6 | tests/landing-page-and-feedback.test.js |
| REQ-003 | T3, T5, T6 | tests/landing-page-and-feedback.test.js |
| REQ-004 | T2, T3, T6 | tests/landing-page-and-feedback.test.js |
| REQ-005 | T2, T3, T4, T5, T6 | tests/landing-page-and-feedback.test.js |

---

## 9. Histórico de Refinamento Estético & Camadas Visuais (v1.1)
- **Correção Crítica de Sintaxe CSS**: Restauração integral dos delimitadores de comentários `/* ... */` em `extension/sidepanel.css`, assegurando carregamento e renderização 100% livres de erros no Google Chrome.
- **Camadas & Box Separation**: Definição de canvas em cinza suave (`--bg-canvas: #F8F9FA`), projetando cartões em branco puro (`#FFFFFF`) com bordas neutras finas (`#E5E7EB`) e sombras de elevação funcionais.
- **Tipografia Nativa San-Serif**: Stack moderna (`system-ui`, `-apple-system`, `Segoe UI`, `Roboto`) eliminando qualquer fallback tipográfico indesejado.
- **Cabeçalho Limpo**: Wordmark oficial exclusiva (`logo-wordmark.svg`), eliminação de tags residuais (`CCHA · AGU`) e simplificação do badge de status para `Beta`.
