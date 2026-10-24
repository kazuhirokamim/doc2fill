---
numero: 35
titulo: Adocao do Design System Canonico Warm Light Craft e Unificacao Visual
data: 2026-10-24
status: Implementado
autores:
  - Kazuhiro
  - Tear Maestro
  - Design System Architect
  - Noesis Architecture Maestro
  - Hermes Frictionless UI
aplica_a:
  - site
  - extension
  - mobile-pwa
  - shared
tags:
  - design-system
  - warm-light-craft
  - ui-ux
  - branding
  - light-mode
  - accessibility
---

# ADR-035: Adoção do Design System Canônico Warm Light Craft e Unificação Visual

## Contexto
O **doc2fill** atende profissionais do setor público e corporativo (procuradores da AGU, analistas fiscais, escritórios e autônomos) que demandam interfaces de alta legibilidade, rapidez e clareza na conferência de dados documentais. Historicamente, a interface adotava um padrão visual baseado em Dark Mode ("Obsidian & Flow Cyan"), com fundo preto (`#0A0D14`), azul e ciano neon. 

Para elevar a percepção de valor, profissionalismo, segurança e conformidade ergonômica, faz-se necessária uma identidade visual unificada:
1. **Light Mode Contemporâneo**: Superfícies predominantemente brancas (`#FFFFFF`) e cinzas neutros (`#F9FAFB`, `#F3F4F6`), com tipografia em carvão mineral (`#111827`) e acento solar em âmbar (`#F59E0B` / `#D97706`).
2. **Identidade Vetorial Unificada**: Símbolo `d2f` em squircle e wordmark horizontal `doc2fill`.
3. **Consistência Cross-Surface**: Harmonização visual 1:1 entre a Landing Page, a Extensão Chrome e o Mobile Scanner PWA.

## Decisão
No contexto de evolução do produto doc2fill para clientes corporativos e órgãos públicos, enfrentando a dissonância visual do antigo Dark Mode com neons e a necessidade de uma identidade proprietária de alta conversão e legibilidade, decidimos por:
1. Adotar a paleta canônica **Warm Light Craft** com design tokens centralizados em variáveis CSS (`--bg-canvas: #FFFFFF`, `--bg-surface: #F9FAFB`, `--brand-amber-primary: #F59E0B`, `--text-heading: #111827`);
2. Substituir a identidade de ícones pelos novos vetores `d2f` com acento âmbar em squircle branco e gerar ícones multi-resolução para o Chrome;
3. Refatorar a interface da Extensão Chrome (`sidepanel.html` e `sidepanel.css`) com status pill claro (`● Pronto para usar`), card de "Documento detectado", CTA primário âmbar e rodapé utilitário;
4. Redesenhar a Landing Page (`site/index.html`, `site/style.css` e `site/showcase.css`) e o Mobile Scanner PWA (`mobile-pwa/index.html`) sem frameworks pesados per Regra Ponytail #24;
para alcançar clareza visual ergonômica, minimalismo premium, contraste WCAG AA e velocidade perceptível de automação, aceitando o esforço de reestilização coordenada de todas as superfícies frontend sem alterar a lógica de negócio ou os 257 testes automatizados.

## Consequências

### Positivas
- Coesão visual imediata entre a Extensão Chrome, o Mobile Scanner PWA e a Landing Page oficial.
- Alta legibilidade documental em telas corporativas com contraste validado WCAG AA.
- Preservação da arquitetura nativa Vanilla ES Modules, com zero dependências de runtime e sem overhead de bundle.
- 100% de compatibilidade mantida com os 257 testes automatizados existentes.

### Negativas
- Requer validação cuidadosa de contraste sobre botões e badges âmbar para assegurar conformidade contínua com diretrizes de acessibilidade.

### Neutras/Riscos Mitigados
- Todos os fluxos funcionais (OCR híbrido offscreen, WebRTC P2P, injeção de eventos no DOM e controle de licença offline) permanecem intocados.
