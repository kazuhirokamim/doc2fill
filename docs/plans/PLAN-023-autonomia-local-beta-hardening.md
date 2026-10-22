# PLAN-023: Autonomia Local-First, OCR Offscreen e Hardening do Pacote Beta

- **status:** Ratificado
- **rev:** e851ab2
- **autor:** Kazuhiro & Tear Maestro
- **data:** 22/10/2026
- **tearform:** respostas/023.md
- **adr:** docs/adr/ADR-031-autonomia-ocr-offscreen-e-resiliencia-beta.md

## Metadados SDD
- **versao_plano:** 1.0.0
- **tipo:** feature
- **blast_radius:** médio
- **orcamento_tokens:** 30000

---

## 1. Visão Geral e Justificativa
O envio da versão beta do `doc2fill` para validação pelo testador (Lucas) no portal oficial do CCHA (AGU/PGFN) demanda a eliminação de qualquer atrito operacional na máquina cliente. Este plano estrutura as correções para: (1) autonomia total de OCR de imagens e comprovantes sem dependência de terminal ou servidores locais Node; (2) expurgo de erros de sintaxe no injetor `content.js`; (3) orientação transparente de mesma rede Wi-Fi para o scanner P2P; e (4) blindagem preventiva contra cliques em abas restritas do navegador (`chrome://`).

---

## 2. Opções Técnicas Avaliadas (Regra Tear #2)

### Opção 1: Dependência Contínua de Servidor Local
- **Descrição:** Exigir que o testador instale Node.js e execute `npm start` para rodar o servidor local de OCR.
- **Prós:** Pacote da extensão permanece menor em disco.
- **Contras:** Barreira técnica intransponível para usuários de negócio, resultando em falhas silenciosas e sensação de sistema quebrado.

### Opção 2: OCR em Nuvem Centralizada (SaaS)
- **Descrição:** Transmitir imagens de recibos para APIs externas de visão computacional na nuvem.
- **Prós:** Fácil implantação com modelos gerenciados.
- **Contras:** Violação frontal da LGPD e do princípio fundamental de Zero Retenção exigido por procuradores e órgãos públicos.

### Opção 3 (RECOMENDADA): Híbrido Resiliente (Fallback Local Offscreen WASM + BarcodeDetector)
- **Descrição:**
  1. Manter tentativa rápida de consulta a servidor local (timeout 400ms) se disponível.
  2. Embutir Tesseract WASM e dicionários em `extension/vendor/` executados dentro do `extension/offscreen.html`.
  3. Despachar reconhecimento ótico no cliente via `performBrowserClientOcr` de forma transparente.
- **Prós:**
  - 100% autônomo, seguro e local-first.
  - O testador nunca vê telas de erro ou exige terminal aberto.
  - Conformidade inegociável com a LGPD e privacidade.
- **Contras:**
  - Incremento no tamanho do pacote compactado da extensão (~4 MB).

---

## 3. Não-Objetivos / Fora de Escopo
- Não implementar simulador público artificial, uma vez que o teste será realizado diretamente no portal oficial do CCHA.
- Não enviar nenhum dado, documento ou metadado fiscal para servidores externos na nuvem.
- Não ultrapassar o orçamento máximo de 700 linhas por arquivo de código per Regra #24.

---

## 4. Requisitos EARS

| Requisito | Tipo Declarado | Especificação |
| :--- | :--- | :--- |
| REQ-001 | Ubiquitous | O sistema deve processar documentos em imagem (JPG, PNG, WebP) localmente no navegador via WebAssembly quando nenhum servidor de relay estiver ativo. |
| REQ-002 | Event | Quando o usuário acionar o preenchimento automático em abas restritas do navegador (ex: chrome://extensions), o sistema deve exibir toast orientador direcionando ao portal do CCHA. |
| REQ-003 | State-driven | Enquanto a aba de pareamento via smartphone estiver ativa, o sistema deve apresentar aviso visual alertando que ambos os aparelhos devem compartilhar a mesma rede Wi-Fi. |
| REQ-004 | Unwanted | Se um arquivo em formato não suportado ou vazio for submetido, o sistema deve manter os campos seguros e exibir mensagem explicativa sem lançar exceções não tratadas. |

---

## 5. Orçamentos Não-Funcionais
- **Latência de Fallback:** Decisão entre servidor e engine local em menos de 400 milissegundos.
- **Tempo de OCR Local:** Reconhecimento completo em menos de 4 segundos para fotos comuns em 1080p.
- **Tamanho Máximo do Pacote Beta:** Menor que 6 megabytes compactado.
- **Limite de Linhas de Código (Regra #24):** Arquivos de produção rigorosamente abaixo do limite de 700 linhas.

---

## 6. Hotspots Compartilhados
- `core/browser-ocr.js`
- `extension/sidepanel.js`
- `extension/content.js`
- `scripts/build-extension.js`
- `scripts/package-beta.js`

---

## 7. Tarefas (DAG)

## T1 — OCR Offscreen WASM Local-First (`core/browser-ocr.js` e `extension/offscreen.html`)
- **Requisitos:** REQ-001, REQ-004
- **Agent:** noesis-domain-core
- **model:** gemini-2.5-pro
- **effort:** médio
- **tempo:** 20m
- **Depends-on:** nenhum

## T2 — Blindagem do Injetor e Proteção contra Abas Restritas (`extension/sidepanel.js`)
- **Requisitos:** REQ-002, REQ-004
- **Agent:** tear-frontend
- **model:** gemini-2.5-pro
- **effort:** médio
- **tempo:** 15m
- **Depends-on:** T1

## T3 — Alerta de Conectividade Wi-Fi e Empacotamento Beta (`extension/sidepanel.html` e `scripts/package-beta.js`)
- **Requisitos:** REQ-003, REQ-001
- **Agent:** hermes-frictionless-ui
- **model:** gemini-2.5-pro
- **effort:** baixo
- **tempo:** 15m
- **Depends-on:** T2

---

## 8. Matriz de Rastreabilidade

| Requisito | Tarefa | Teste |
| :--- | :--- | :--- |
| REQ-001 | T1 | tests/extension/beta-hardening.test.js |
| REQ-002 | T2 | tests/extension/beta-hardening.test.js |
| REQ-003 | T3 | tests/extension/beta-hardening.test.js |
| REQ-004 | T1 | tests/extension/beta-hardening.test.js |
