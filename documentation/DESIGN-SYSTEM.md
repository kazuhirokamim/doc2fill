# Design System Neo-Brutalista (Neobrutalism) // doc2fill

Este documento detalha as diretrizes estéticas e padrões de implementação da interface do **doc2fill**, orientadas pelos princípios do **Neo-Brutalismo**.

---

## 📐 1. Bordas e Hard Shadows (0 Blur)

* **Bordas Contínuas**: Todo elemento estrutural (containers, cards, botões, campos de entrada de texto e modais) utiliza borda preta sólida contínua de 2px:
  ```css
  border: 2px solid #000000;
  ```
* **Sombras Rígidas (Hard Shadows)**:
  - Sombras sem nenhum desfoque (`blur: 0`).
  - Botões, cards e inputs em foco:
    ```css
    box-shadow: 4px 4px 0px #000000;
    ```
  - Interações táteis mecânicas:
    - `:hover`: `transform: translate(-2px, -2px); box-shadow: 6px 6px 0px #000000;`
    - `:active`: `transform: translate(2px, 2px); box-shadow: 2px 2px 0px #000000;`

---

## 🔤 2. Tipografia de Alto Contraste

* **Títulos e Headings**:
  - Peso ExtraBold / Black (`font-weight: 900`).
  - Caixa alta obrigatória (`text-transform: uppercase`).
  - Tracking apertado (`letter-spacing: -0.04em`).
* **Corpo de Texto (Body)**:
  - Fonte sem serifa de alta legibilidade, contraste preto puro sobre branco ou cinza técnico.
* **Badges, Etiquetas e Metadados Técnicos**:
  - Fonte monoespaçada (`font-family: monospace`).
  - Simulação visual de terminais e crachás de acesso (`[VIP VITALÍCIO // LUCAS]`, `[ZERO-RETENTION]`).
  - Borda sólida preta de 1px a 2px com sombra sólida de 2px.

---

## 🎨 3. Paleta de Cores de Alta Tensão

| Token | Hex | Aplicação |
|---|---|---|
| `--neo-white` | `#FFFFFF` | Fundo principal de cartões e áreas ativas |
| `--neo-black` | `#000000` | Textos, bordas de 2px e hard shadows |
| `--neo-paper` | `#F7F7F2` | Fundo de painel e base de suporte |
| `--neo-yellow` | `#FFE600` | Abas ativas, crachá VIP do Lucas e trigger flutuante |
| `--neo-green` | `#00F59B` | Botão primário de ação (CTA) e campos preenchidos com sucesso |
| `--neo-orange` | `#FF5500` | Alertas, cancelamentos e estados de atenção |

---

## 🧩 4. Elementos Estruturais e Divisores

* **Divisores de Ponta a Ponta**: Linhas divisórias pretas contínuas separando o cabeçalho do corpo (`border-bottom: 2px solid #000000`).
* **Micro-interações no Preenchimento Automático**: Ao executar o autofill na página governamental, cada campo recebe destaque instantâneo com borda preta sólida, sombra verde neon (`3px 3px 0px #00F59B`) e fundo menta suave (`#E8FFF3`).
