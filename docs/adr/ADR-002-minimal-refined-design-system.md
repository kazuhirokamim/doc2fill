---
numero: 2
titulo: Adoção do Design System Minimalista, Limpo e Sofisticado
data: 2026-09-06
status: Aceito
autores:
  - Kazuhiro
aplica_a:
  - extension
  - mobile-pwa
  - demo-portal
tags:
  - ui
  - design-system
  - minimalist
  - frontend
---

# ADR-002: Adoção do Design System Minimalista, Limpo e Sofisticado

## Contexto
O `doc2fill` tem como foco simplificar o trabalho fiscal de procuradores federais da AGU e servidores públicos, que operam sistemas densos e burocráticos durante longas jornadas. A primeira proposta visual explorada utilizava uma estética polarizante e de alto contraste saturado, mas verificou-se que causava sobreposição estética indesejada e fadiga visual prolongada. Buscou-se, portanto, uma interface limpa, leve, focada em usabilidade e com amplo respiro visual.

## Decisão
No contexto de interfaces de produtividade para procuradores da AGU, enfrentando fadiga visual e a necessidade de uma identidade exclusiva, limpa e com amplo respiro visual, decidimos por adotar o design system minimalista sofisticado de baixo contraste com cantos arredondados suaves, sombras difusas de baixíssima opacidade (soft shadows) e botões de ação em tom escuro elegante, para alcançar máxima legibilidade operacional, ergonomia visual e experiência de uso leve e moderna, aceitando o afastamento de estéticas polarizantes ou saturadas.

### Regras Estéticas do Design System
1. **Formas, Sombras Suaves e Bordas**:
   - Cantos arredondados generosos (`border-radius: 16px` / `rounded-2xl` para cards e modais; `10px` para inputs e botões).
   - Sombras etéreas e difusas (`box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.04), 0 2px 6px -1px rgba(0, 0, 0, 0.02)`), abandonando sombras duras.
   - Bordas sutis em cinza suave (`1px solid #E5E7EB`).
2. **Paleta de Baixo Contraste (Low Contrast)**:
   - Fundo da aplicação em off-white suave (`#F9FAFB`) e cartões em branco puro (`#FFFFFF`).
   - Botões de ação primária em preto/grafite sólido elegante (`#111827`) e secundários transparentes/ghost com borda fina.
3. **Tipografia Elegante e Hierárquica**:
   - Fonte geométrica moderna sans-serif (Inter / SF Pro / Geist).
   - Títulos em `#111827` com peso semibold (`600`), textos de apoio em `#4B5563` e `#6B7280`.
4. **Respiro Visual (Whitespace)**:
   - Margens e paddings amplos, segmentação suave de abas (`#F3F4F6`) e anéis suaves de foco nos campos de preenchimento.

## Consequências

### Positivas
* Amplo conforto visual para uso contínuo por procuradores e operadores fiscais.
* Sensação de produto premium, sofisticado, moderno e corporativamente maduro.
* Interface intuitiva, sem ruídos gráficos desnecessários.

### Negativas
* Menor intensidade provocativa do que estilos gráficos experimentais.

### Neutras/Riscos Mitigados
* O preenchimento automático mantém feedback visual claro e imediato através de anéis esmeralda suaves nos campos populados (`#10B981`), garantindo certeza de execução sem agressividade visual.
