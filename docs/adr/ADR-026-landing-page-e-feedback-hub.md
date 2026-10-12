---
numero: 26
titulo: Landing Page Oficial, Hub de Feedback dos Beta Testers e Ajuste da Grade de Planos
data: 2026-10-12
status: Aceito
autores:
  - Kazuhiro
  - Tear Maestro
  - Noesis Frontend Maestro
  - Noesis Requirements Maestro
aplica_a:
  - site
  - server
  - extension
  - tests
tags:
  - landing-page
  - feedback-hub
  - beta-testing
  - pricing-tiers
---

# ADR-026: Landing Page Oficial, Hub de Feedback dos Beta Testers e Ajuste da Grade de Planos

## Contexto
Com a conclusão do motor central de extração, do auto-deskew, do preenchedor reativo e dos atalhos de teclado (204 testes verdes), o Doc2Fill está pronto para receber os primeiros usuários reais no programa Beta Teste. No entanto, a rota raiz `/` servia diretamente o simulador do CCHA, faltando uma página institucional moderna que contextualize o produto para advogados, contadores e procuradores, um canal interativo de coleta de feedback (críticas, sugestões, elogios e bugs) para os beta testers, e um alinhamento transparente da matriz de planos (Starter R$ 89, Pro R$ 197, Anual e Acesso Beta Gratuito por 14 dias).

## Decisão
No contexto de lançamento da primeira versão Beta Teste do Doc2Fill para advogados e procuradores, enfrentando a ausência de uma página institucional de apresentação, falta de canal direto para coleta de críticas e sugestões dos primeiros usuários e desalinhamento da grade de preços, decidimos por implementar uma Landing Page Oficial moderna e minimalista no padrão Obsidian e Flow Cyan servida na raiz do servidor, acompanhada de um Hub de Avaliações e Feedback integrado com API dedicada em `/api/feedback`, ajuste transparente dos planos Starter e Pro com selo Beta de 14 dias gratuitos, e script de empacotamento determinístico do arquivo zip da extensão, para alcançar máxima credibilidade de produto, escuta ativa dos pioneiros e clareza comercial de conversão, aceitando que o simulador de demonstração do CCHA passa a ser servido na sub-rota `/portal` em vez de na raiz.

### Detalhes da Decisão
1. **Landing Page Oficial (`site/index.html`):**
   - Construída com HTML5 e CSS3 moderno autocontido, sem dependências de frameworks pesados, garantindo carregamento instantâneo (< 200ms).
   - Identidade visual minimalista e sofisticada no padrão *Obsidian & Flow Cyan* (Dark Luxury), com Bento Grid e o logotipo oficial aprovado.
   - Rota raiz `/` passa a servir `site/index.html`. O simulador do CCHA é movido para `/portal`.
2. **Hub de Avaliações e Feedback (`/api/feedback`):**
   - Criação dos métodos `POST /api/feedback` e `GET /api/feedback`.
   - Suporte a avaliação por estrelas (1 a 5), tags de categoria (Elogio, Crítica, Sugestão, Erro) e mensagem de texto.
   - Armazenamento estruturado e atômico em `data/feedbacks.json`.
3. **Harmonização da Matriz de Preços:**
   - Destaque claro para o **Starter (R$ 89/mês)**, **Pro (R$ 197/mês)** e o **Selo Beta Fundador (14 dias grátis)**.
4. **Empacotamento do Beta:**
   - Script `scripts/package-beta.js` para compilação limpa do `.zip` da extensão em `dist/doc2fill-v0.3.0-beta.zip`.

## Consequências

### Positivas
- Experiência de primeiro contato de nível profissional para qualquer procurador que acessar o site.
- Canal de escuta ativa da comunidade já operando desde o dia 1 do Beta com mural de avaliações.
- Roteamento limpo e organizado no servidor local.
- Cumprimento integral das regras Tear #24 (< 700 linhas) e #33 (zero menção a IA).

### Negativas
- O simulador CCHA agora exige acessar `/portal` em vez de `/`.

### Neutras/Riscos Mitigados
- A rota `/portal` e atalhos na navegação da Landing Page ("Experimentar Simulador CCHA") garantem acesso imediato de 1 clique ao ambiente de testes sem quebrar os fluxos anteriores.
