# Design System Obsidian & Flow Cyan // doc2fill

Este documento estabelece as diretrizes canônicas de interface, identidade visual e usabilidade do **doc2fill**, desenhado para proporcionar foco absoluto, autoridade executiva, conformidade de acessibilidade (WCAG AA) e ergonomia visual para procuradores, advogados e analistas fiscais.

---

## 🎨 1. Identidade Cromática Oficial (Tokens de Cor)

A paleta do doc2fill é fundamentada no contraste de alta resolução entre o preto profundo mineral (*Obsidian*) e os tons tecnológicos de aceleração (*Connection Blue* e *Flow Cyan*):

| Token CSS | Hex / Valor | Função e Aplicação |
|---|---|---|
| `--bg-app` | `#0A0D14` | **Preto Obsidian:** Fundo base de todas as telas, reduzindo a fadiga ocular em 100%. |
| `--bg-card` | `#111622` | **Superfície Bento:** Cartões e seções isoladas com acabamento de elevação suave. |
| `--bg-surface` | `#141A28` | **Superfície Elevada:** Pílulas ativas, botões secundários e agrupadores internos. |
| `--bg-input` | `#0D111A` | **Fundo de Entradas:** Contraste perfeito e foco imediato para digitação e conferência. |
| `--border-subtle`| `#1E293B` | **Bordas Estruturais:** Delimitação precisa e suave sem poluição visual. |
| `--border-focus` | `#00D2FF` | **Ciano Fluxo (Foco):** Realce luminoso nos campos e dropzones em estado ativo. |
| `--brand-blue` | `#0052FF` | **Azul Conexão:** Cor primária de botões de conversão e ações de envio definitivo. |
| `--brand-cyan` | `#00D2FF` | **Ciano Fluxo:** Acento da marca, ícones ativos, indicadores de velocidade e autofill. |
| `--text-primary`| `#F8FAFC` | **Branco Titânio:** Tipografia de títulos e dados de leitura crítica com contraste > 15:1. |
| `--text-muted` | `#64748B` | **Cinza Slate:** Rótulos secundários, legendas de apoio e metadados. |

---

## 💎 2. Logotipia & Símbolo Vetorial Oficial

* **Símbolo Oficial:** Silhueta estilizada de documento com dobra angular superior direita + traço contínuo de aprovação (*checkmark*) que transita para ponta de cursor de clique no canto inferior direito.
  - Gradiente do Símbolo: `linear-gradient(135deg, #0052FF 0%, #00D2FF 100%)`.
  - Arquivo: `extension/icons/icon-symbol.svg` e `extension/icons/icon-squircle.svg`.
* **Logotipia:** `Doc` em Branco Titânio (`#F8FAFC`) + `2Fill` em Ciano Fluxo (`#00D2FF`).
* **Regra Anti-Emoji:** Proibido o uso de emojis de sistema (`⚡`, `📄`, `⏳`) na interface de produção. Todos os ícones devem ser componentes vetoriais SVG minimalistas de traço limpo (`stroke-width: 2`).

---

## 🔤 3. Tipografia Elegante e Hierárquica

* **Família Primária (Interface & Branding):**  
  `"Plus Jakarta Sans", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
  - Títulos: Peso `700` (Bold), tracking `-0.02em` a `-0.03em`.
  - Rótulos (Labels): Peso `500` (Medium), tamanho `11.5px`, cor `#94A3B8`.
* **Família Numérica e Dados Fiscais:**  
  `"Outfit", "SF Mono", Menlo, Consolas, monospace`
  - Utilizada em campos de CNPJ/CPF, datas (`YYYY-MM-DD`), números de nota fiscal e valores em `R$`.
  - Valores monetários recebem a classe `.font-highlight` em Ciano Fluxo (`#00D2FF`).

---

## 📐 4. Formas, Bento Surfaces e Micro-Glow

* **Bordas Arredondadas (Border Radius):**
  - Containers Bento: `16px` a `18px`.
  - Inputs e botões de ação: `10px` a `12px`.
  - Badges de segurança e pílulas de navegação: `9999px` (*pill*).
* **Micro-Glow Táctil:**
  - Botão Primário: `box-shadow: 0 0 20px rgba(0, 82, 255, 0.35);` com expansão para `24px` no hover.
  - Dropzone no Drag-Over: Borda iluminada em `#00D2FF` com glow suave `0 0 16px rgba(0, 210, 255, 0.25)`.

---

## 🧭 5. Ativação Exclusiva & Política de DOM Limpo (Native Side Panel Only)

* **Ativação sob Demanda:**  
  A interface principal reside 100% no **Side Panel nativo do Chrome** (`chrome.sidePanel`), ativado pelo clique no ícone da extensão ou via atalho `Alt+Shift+D` (`Option+Shift+D` no macOS).
* **Zero Intrusão Visual (Clean DOM Policy):**  
  Nenhuma caixa, botão ou miniatura flutuante é injetada automaticamente nas páginas navegadas pelo usuário. Ao fechar o painel, a página web permanece 100% limpa e inalterada.

---

## 🧪 6. Validação Contratual via TDD

A integridade do Design System é testada continuamente por meio da suíte em `tests/extension/sidepanel.test.js`, assegurando:
- Rejeição de tokens e variáveis CSS obsoletas do tema claro legado (`#F9FAFB`);
- Preservação estrita das cores Obsidian (`#0A0D14`), Flow Cyan (`#00D2FF`) e Connection Blue (`#0052FF`);
- Conformidade estrita dos contrastes em conformidade com as diretrizes WCAG 2.1 AA.

