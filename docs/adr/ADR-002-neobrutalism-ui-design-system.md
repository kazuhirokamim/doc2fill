---
numero: 2
titulo: Adoção do Design System Neo-Brutalista (Neobrutalism)
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
  - neobrutalism
  - frontend
---

# ADR-002: Adoção do Design System Neo-Brutalista (Neobrutalism)

## Contexto
O `doc2fill` é uma solução de produtividade e automação de preenchimento fiscal voltada inicialmente a procuradores da Fazenda Nacional (AGU) e servidores públicos federais que realizam preenchimentos manuais exaustivos de certidões e honorários em portais governamentais. Interfaces corporativas genéricas pecam pelo excesso de sombras suaves, gradientes complexos e baixa legibilidade operacional.

## Decisão
No contexto de interfaces de produtividade para procuradores da AGU, enfrentando fadiga visual e designs corporativos genéricos e difusos, decidimos por adotar a estética Neo-Brutalista (Neobrutalism) com hard shadows de 0-blur, bordas pretas sólidas de 2px, tipografia pesada em caixa alta e paleta de alto contraste com acentos elétricos, para alcançar clareza visual absoluta, alta atitude de produto e feedback tátil mecânico nas interações, aceitando a estética polarizante em relação aos padrões tradicionais de software empresarial.

### Regras Estéticas Inegociáveis
1. **Hard Shadows e Bordas**: Todos os elementos estruturais (cards, inputs, botões, modais) possuem borda preta sólida contínua de 2px (`border: 2px solid #000000`) e sombras sólidas sem nenhum desfoque (`box-shadow: 4px 4px 0px #000000`).
2. **Tipografia de Alto Contraste**: Títulos em maiúsculas (`text-transform: uppercase`), peso Black/ExtraBold (`font-weight: 900`) e tracking apertado. Badges, tags de status e metadados secundários em fonte monoespaçada (`monospace`) com borda preta sólida simulando terminais técnicos.
3. **Paleta de Alta Tensão**: Fundo em branco puro (`#FFFFFF`) e papel técnico (`#F7F7F2`), texto em preto absoluto (`#000000`), e acentos de alta vibração em Amarelo Elétrico (`#FFE600`) para modos e destaques e Verde Neon (`#00F59B`) para CTAs e confirmações de preenchimento.
4. **Elementos Gráficos e Divisores**: Linhas divisórias pretas contínuas cruzando a tela de ponta a ponta e ícones geométricos limpos.

## Consequências

### Positivas
* Diferenciação visual imediata no mercado em relação a ferramentas corporativas convencionais.
* Altíssimo contraste e clareza de leitura, eliminando ruído visual durante tarefas repetitivas.
* Feedback mecânico gratificante no preenchimento de dados fiscais com estados táticos de `:hover` e `:active`.

### Negativas
* Estética não-convencional que desafia o conservadorismo de interfaces corporativas tradicionais.

### Neutras/Riscos Mitigados
* A interface do simulador do portal governamental (AGU/PGFN) permanece fiel ao estilo institucional da administração pública, enquanto a camada de interação do doc2fill (Side Panel, widget flutuante in-page e scanner PWA) projeta a identidade autêntica do SaaS.
