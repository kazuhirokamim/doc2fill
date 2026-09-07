# Design System Minimalista e Sofisticado // doc2fill

Este documento estabelece as diretrizes de interface e usabilidade do **doc2fill**, desenhado para proporcionar foco absoluto, leveza operacional e amplo respiro visual para procuradores e operadores fiscais.

---

## 📐 1. Formas, Sombras Suaves e Bordas

* **Bordas Arredondadas (Border Radius)**:
  - Containers e cartões principais: `16px` (`rounded-2xl`):
    ```css
    border-radius: 16px;
    ```
  - Inputs de formulário e botões: `10px` (`rounded-md` / `rounded-xl`):
    ```css
    border-radius: 10px;
    ```
  - Badges e pílulas de status: `9999px` (`rounded-full`).

* **Sombras Suaves e Difusas (Soft Shadows)**:
  - Sombras de baixíssima opacidade (3% a 5%) com grande raio de desfoque, conferindo elevação e leveza:
    ```css
    box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.04), 0 2px 6px -1px rgba(0, 0, 0, 0.02);
    ```

* **Bordas Sutis**:
  - Bordas discretas em cinza claro, delimitando áreas sem pesar visualmente:
    ```css
    border: 1px solid #E5E7EB;
    ```

---

## 🎨 2. Paleta de Cores "Low Contrast"

| Elemento | Token / Hex | Propósito |
|---|---|---|
| Background Geral | `#F9FAFB` | Fundo suave (off-white) que diminui a fadiga ocular |
| Cards e Containers | `#FFFFFF` | Branco puro para destaque limpo e natural do conteúdo |
| Botões Primários (CTAs) | `#111827` | Preto/grafite profundo com texto `#FFFFFF` para alto contraste funcional |
| Botões Secundários | `#FFFFFF` | Fundo branco com borda fina `#E5E7EB` e hover `#F9FAFB` |
| Textos Primários | `#111827` | Escuro, peso semibold/medium, ótima legibilidade |
| Textos Secundários | `#4B5563` / `#6B7280` | Tons de cinza médio para reduzir tensão visual |
| Status e Sucesso | `#ECFDF5` / `#065F46` | Verde esmeralda suave com borda `#A7F3D0` |

---

## 🔤 3. Tipografia Elegante e Hierárquica

* **Família Tipográfica**: Sans-serif moderna e geométrica (`Inter`, `SF Pro`, `Segoe UI`, `Roboto`).
* **Hierarquia Visual**:
  - Títulos: Peso `600` (semibold), cor `#111827`, tracking natural suave.
  - Rótulos (Labels): Peso `500` (medium), tamanho `11.5px`, cor `#4B5563`.
  - Corpo e apoios: Peso `400`/`500`, entrelinhas arejada `1.5`.

---

## ⚡ 4. Feedback no Preenchimento Automático

Ao preencher o formulário governamental, os campos mapeados recebem uma transição suave de foco com borda verde esmeralda (`#10B981`) e anel sutil de confirmação (`box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2)`), retornando suavemente ao estado original após 3 segundos.
