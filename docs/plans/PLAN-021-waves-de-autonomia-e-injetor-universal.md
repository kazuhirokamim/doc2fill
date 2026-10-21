# PLAN-021: Waves de Autonomia Local-First, Parser FlateDecode e Injetor Universal

- **status:** Ratificado
- **rev:** d943cb2
- **autor:** Kazuhiro & Tear Maestro
- **data:** 21/10/2026
- **tearform:** respostas/021.md
- **adr:** docs/adr/ADR-028-waves-de-autonomia-e-injetor-universal.md

## Metadados SDD
- **versao_plano:** 1.0.0
- **tipo:** feature
- **blast_radius:** médio
- **orcamento_tokens:** 35000

---

## 1. Visão Geral e Justificativa
O Doc2Fill necessita romper o abismo entre o ambiente simulado e a agressividade dos portais governamentais reais. Este plano estrutura as 3 Waves de entrega para: (1) descompressão de streams PDF compactados com FlateDecode via DecompressionStream nativo; (2) varredura recursiva de iframes e despacho de eventos sequenciais que respeitem máscaras JavaScript (jQuery Mask / Vanilla) em portais como SEI, AGU e SIAFI; (3) polimento cyber-tátil com eliminação de `alert()` através de Toasts Obsidian e ativação do atalho `Cmd+Shift+F`.

---

## 2. Opções Técnicas Avaliadas (Regra Tear #2)

### Opção 1: Dependência Exclusiva de Servidor Local
- **Descrição:** Manter a extração dependente de `node server/demo-server.js` aberto no terminal.
- **Prós:** Menor volume de código novo no client-side.
- **Contras:** Péssima experiência para o usuário final, que verá a extensão falhar silenciosamente caso o terminal não esteja ativo.

### Opção 2: Processamento em Nuvem Comercial (SaaS)
- **Descrição:** Enviar PDFs e imagens para uma API centralizada em nuvem.
- **Prós:** Facilidade de executar OCR com workers pesados.
- **Contras:** Violação inegociável da LGPD e do princípio de Zero Retenção, impedindo a comercialização para órgãos públicos e escritórios de advocacia.

### Opção 3 (RECOMENDADA): Descompressão Nativa Local-First (DecompressionStream) + Injetor Cross-Frame
- **Descrição:**
  1. No `core/document-parser.js`, implementar leitor de streams PDF com descompressão via API nativa da plataforma (`DecompressionStream('deflate')` ou `node:zlib`).
  2. No `extension/content.js`, realizar varredura recursiva em `iframe` e simular eventos sequenciais de teclado para preservar máscaras monetárias.
  3. No `extension/sidepanel.js`, banir `alert()` em favor de Toasts Obsidian e ligar o atalho `Cmd+Shift+F`.
- **Prós:**
  - 100% Local-First e em conformidade estrita com a LGPD.
  - Zero dependências pesadas adicionais no `package.json` (Regra Ponytail #5).
  - Resiliência comprovada em portais legados governamentais.
- **Contras:**
  - Exige testes rigorosos de manipulação de buffers e streams binários.

---

## 3. Não-Objetivos / Fora de Escopo
- Não implementar bypass forçado de iframes protegidos por CORS estrito de outro domínio (cross-origin).
- Não violar o limite de 700 linhas por arquivo de código per Regra #24.
- Não persistir documentos fiscais ou identificadores pessoais em disco ou nuvem.

---

## 4. Requisitos EARS

| Requisito | Tipo Declarado | Especificação |
| :--- | :--- | :--- |
| REQ-001 | Ubiquitous | O sistema deve descompactar streams de PDF codificados com FlateDecode em memória volátil sem dependência de bibliotecas externas. |
| REQ-002 | Event | Quando o usuário acionar o autofill em uma página contendo iframes governamentais, o injetor deve varrer recursivamente os frames e preencher os campos correspondentes. |
| REQ-003 | State-driven | Enquanto campos com máscaras de formatação estiverem presentes, o injetor deve simular a sequência de eventos de digitação garantindo que o valor final seja preservado. |
| REQ-004 | Unwanted | Se um PDF estiver protegido por senha ou a extração falhar, o sistema deve apresentar uma notificação amigável via Toast Obsidian sem disparar pop-ups bloqueantes nativos. |

---

## 5. Orçamentos Não-Funcionais
- **Tempo de Descompressão de PDF:** Menor que 50 milissegundos para streams de até 5MB.
- **Latência de Injeção Cross-Frame:** Menor que 100 milissegundos para até 5 iframes aninhados.
- **Limite de Linhas de Código (Regra #24):** Todos os arquivos de código mantidos estritamente abaixo de 600 linhas.

---

## 6. Hotspots Compartilhados
- `core/document-parser.js`
- `extension/content.js`
- `extension/sidepanel.js`
- `tests/core/flatedecode-parser.test.js`

---

## 7. Tarefas (DAG)

## T1 — Descompressor FlateDecode em Memória (`core/document-parser.js` e TDD)
- **Requisitos:** REQ-001, REQ-004
- **Agent:** noesis-domain-core
- **model:** gemini-2.5-pro
- **effort:** médio
- **tempo:** 20m
- **Depends-on:** nenhum

## T2 — Injetor Cross-Frame e Respeito a Máscaras (`extension/content.js`)
- **Requisitos:** REQ-002, REQ-003
- **Agent:** tear-frontend
- **model:** gemini-2.5-pro
- **effort:** alto
- **tempo:** 25m
- **Depends-on:** T1

## T3 — Toasts Obsidian e Atalho Global (`extension/sidepanel.js` e `background.js`)
- **Requisitos:** REQ-004
- **Agent:** hermes-frictionless-ui
- **model:** gemini-2.5-pro
- **effort:** médio
- **tempo:** 20m
- **Depends-on:** T2

---

## 8. Matriz de Rastreabilidade

| Requisito | Tarefa | Teste |
| :--- | :--- | :--- |
| REQ-001 | T1 | tests/core/flatedecode-parser.test.js |
| REQ-002 | T2 | tests/extension/content.test.js |
| REQ-003 | T2 | tests/extension/content.test.js |
| REQ-004 | T3 | tests/extension/sidepanel-ui.test.js |
