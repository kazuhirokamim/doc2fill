# PLAN-019: Landing Page Oficial, Hub de Feedback dos Beta Testers e Ajuste de Planos

- **status:** Ratificado
- **rev:** 08049a8
- **autor:** Equipe Doc2Fill
- **data:** 12/10/2026
- **tearform:** respostas/019.md
- **adr:** docs/adr/ADR-026-landing-page-e-feedback-hub.md

## Metadados SDD
- **versao_plano:** 1.0.0
- **tipo:** feature
- **blast_radius:** médio
- **orcamento_tokens:** 35000

---

## 1. Visão Geral e Justificativa
O Doc2Fill possui motor de extração fiscal, auto-deskew, injeção reativa e atalhos de teclado 100% homologados (204 testes verdes). Para realizar o lançamento seguro e profissional da primeira **Versão Beta Teste**, é indispensável disponibilizar: (1) uma Landing Page Institucional moderna no padrão *Obsidian & Flow Cyan* servida na rota raiz `/`, (2) um Hub de Avaliações e Feedback integrado com API em `/api/feedback` para acolher críticas, elogios e relatos de bugs dos primeiros procuradores, (3) a exibição clara da grade de planos (Starter R$ 89, Pro R$ 197 e Anual) com selo Beta de 14 dias grátis, e (4) o empacotamento automatizado da extensão em `dist/doc2fill-v0.3.0-beta.zip`.

---

## 2. Opções Técnicas Avaliadas (Regra Tear #2)

### Opção 1: Framework Pesado em SPA (Next.js / Nuxt) para a Landing Page
- **Descrição:** Criar uma nova aplicação separada em React/Next.js para hospedar a landing page e a API de feedback.
- **Prós:** Ecossistema amplo de componentes prontos.
- **Contras:** Adiciona overhead excessivo de dependências, bundle pesado (> 15MB em `node_modules`), aumenta a superfície de ataque e atrasa o lançamento do beta.

### Opção 2: Formulário Externo de Terceiros (Google Forms / Typeform)
- **Descrição:** Usar um link do Typeform ou Google Forms em vez de criar um hub nativo.
- **Prós:** Zero código no backend.
- **Contras:** Quebra total da experiência do usuário, tira o visitante da identidade visual *Obsidian*, parece amador para procuradores federais e não permite exibir mural público de avaliações em tempo real.

### Opção 3 (RECOMENDADA): Landing Page Nativa Cyber-Tátil + API Local de Feedback + Empacotamento
- **Descrição:**
  1. Construir a Landing Page em HTML5/CSS3 moderno autocontido em `site/index.html` servido na rota raiz `/` do `server/demo-server.js` (mantendo o simulador em `/portal`).
  2. Implementar o endpoint `/api/feedback` com suporte a rating (1-5 estrelas), categorias (Elogio, Crítica, Sugestão, Erro) e armazenamento seguro em `data/feedbacks.json`.
  3. Integrar a grade de preços com os planos Starter e Pro e selo Beta.
  4. Script Node.js `scripts/package-beta.js` para compilação do `.zip` limpo de distribuição.
- **Prós:**
  - Carregamento instantâneo (< 200ms) sem dependências externas.
  - Experiência visual coesa e de alto luxo na identidade oficial.
  - Canal de escuta ativa nativo no próprio domínio.
  - Orçamento de linhas estrito (< 700 linhas) per Regra #24.
- **Contras:**
  - O simulador CCHA agora é acessado em `/portal` (mitigado por links diretos na navegação).

---

## 3. Não-Objetivos / Fora de Escopo
- Não implementar sistema complexo de autenticação OAuth ou login por senha na landing page (permanece Local-First).
- Não transacionar cartão de crédito com cobrança automática recorrente sem autorização (foco inicial no Pix e Acesso Beta).
- Não ultrapassar o orçamento de 700 linhas por arquivo de código per Regra #24.

---

## 4. Requisitos EARS

| Requisito | Tipo Declarado | Especificação |
| :--- | :--- | :--- |
| REQ-001 | Ubiquitous | O sistema deve servir a Landing Page Oficial na rota raiz do servidor HTTP e manter o simulador na rota /portal. |
| REQ-002 | Event | Quando o usuário submeter uma avaliação válida na rota /api/feedback, o sistema deve registrar os dados com status 201 e atualizar o mural. |
| REQ-003 | State-driven | Enquanto na landing page, o sistema deve apresentar as opções de planos Starter (R$ 89), Pro (R$ 197) e o selo de acesso Beta gratuito por 14 dias. |
| REQ-004 | Unwanted | Se a requisição de feedback contiver rating fora de 1-5, texto vazio ou payload inválido, então o sistema deve retornar 400 Bad Request com mensagem descritiva. |

---

## 5. Orçamentos Não-Funcionais
- **Limite de Linhas de Código (Regra #24):** Todos os arquivos de código mantidos abaixo de 600 linhas.
- **Tempo de Resposta da API de Feedback:** Submissão e listagem em menos de 50ms.
- **Tamanho do Pacote Beta (.zip):** Arquivo compactado com tamanho inferior a 2MB.

---

## 6. Hotspots Compartilhados
- `server/demo-server.js`
- `site/index.html`
- `demo-portal/checkout.html`
- `extension/sidepanel.html`
- `scripts/package-beta.js`
- `tests/server/feedback-api.test.js`

---

## 7. Tarefas (DAG)

## T1 — Teste TDD e Endpoint de Feedback (`tests/server/feedback-api.test.js` e `server/demo-server.js`)
- **Requisitos:** REQ-002, REQ-004
- **Agent:** noesis-backend-maestro
- **model:** gemini-2.5-pro
- **effort:** médio
- **tempo:** 20m
- **Depends-on:** nenhum

## T2 — Landing Page Oficial com Hub de Feedback & Planos (`site/index.html`)
- **Requisitos:** REQ-001, REQ-003
- **Agent:** noesis-frontend-maestro
- **model:** gemini-2.5-pro
- **effort:** alto
- **tempo:** 30m
- **Depends-on:** T1

## T3 — Script de Empacotamento Beta e Indicador de Licença no Sidepanel
- **Requisitos:** REQ-003
- **Agent:** tear-devops-agent
- **model:** gemini-2.5-pro
- **effort:** médio
- **tempo:** 15m
- **Depends-on:** T2

---

## 8. Matriz de Rastreabilidade

| Requisito | Tarefa | Teste |
| :--- | :--- | :--- |
| REQ-001 | T2 | tests/server/feedback-api.test.js |
| REQ-002 | T1 | tests/server/feedback-api.test.js |
| REQ-003 | T2 | tests/server/feedback-api.test.js |
| REQ-004 | T1 | tests/server/feedback-api.test.js |
