# PLAN-022: Roadmap de Autonomia do doc2fill — Sprints A a D (Do Protótipo ao SaaS Soberano)

- **status:** Ratificado
- **rev:** 7cf313e
- **autor:** Kazuhiro & Tear Maestro
- **data:** 21/10/2026
- **tearform:** respostas/022.md
- **adr:** docs/adr/ADR-029-arquitetura-webrtc-offscreen-wasm-ecdsa.md

## Metadados SDD
- **versao_plano:** 1.0.0
- **tipo:** feature
- **blast_radius:** médio
- **orcamento_tokens:** 40000

---

## 1. Visão Geral e Justificativa
Com a conclusão da Fase 0 (leitura de PDF comprimido via `DecompressionStream`, visão computacional client-side via `BarcodeDetector`, tradução anti-glosa TUSS e proteção DoS), o doc2fill atinge 219 testes verdes e autonomia no navegador. Este plano diretor estrutura a trajetória de transição do protótipo local para um SaaS de alta disponibilidade através de 4 Sprints canônicos (A, B, C e D), eliminando o terminal para o usuário leigo e blindando o produto com criptografia assimétrica.

---

## 2. Opções Técnicas Avaliadas (Regra Tear #2)

### Opção 1: Preservar Servidor Local Obrigatório (`demo-server.js`)
- **Descrição:** Manter o pareamento mobile e OCR estritamente dependentes de runtime local Node.js.
- **Prós:** Zero alteração na infraestrutura móvel.
- **Contras:** Inviável comercialmente; procuradores e médicos em redes corporativas com Client Isolation não conseguem parear seus celulares nem subir documentos analógicos sem terminal.

### Opção 2: Backend Monolítico Centralizado em Nuvem (Multi-tenant SaaS)
- **Descrição:** Enviar todos os documentos, fotos e tokens para um cluster backend corporativo na nuvem.
- **Prós:** Facilidade de gestão de OCR pesado em GPUs.
- **Contras:** Quebra total do princípio de Zero Retenção e risco de violação da LGPD e sigilo de honorários advocatícios e prontuários médicos.

### Opção 3 (RECOMENDADA): Arquitetura Híbrida Soberana (WebRTC P2P + Offscreen WASM + ECDSA)
- **Descrição:**
  1. No client-side, executar OCR óptico via `chrome.offscreen` e `tesseract.js` WASM, com auxílio da API nativa `window.ai`.
  2. No pareamento mobile, utilizar `RTCPeerConnection` P2P direto via `RTCDataChannel` com criptografia de ponta a ponta (ECDH P-256 + AES-GCM), usando sinalização serverless efêmera.
  3. No licenciamento, utilizar chaves públicas na extensão validadas via `crypto.subtle.verify` e chaves privadas restritas a webhook serverless de pagamento (Asaas/Stripe).
  4. No pipeline de build, unificar pacotes com `esbuild` eliminando duplicações manuais.
- **Prós:**
  - 100% de conformidade com LGPD e Zero Retenção.
  - Funciona em qualquer rede (4G/5G -> Wi-Fi corporativo) sem dependência de terminal local.
  - Impossibilidade matemática de pirataria via inspeção de bundle.
- **Contras:**
  - Exige orquestração cuidadosa de SDP/ICE para WebRTC e empacotamento com esbuild.

---

## 3. Não-Objetivos / Fora de Escopo
- Não realizar custódia ou armazenamento de imagens de documentos fiscais em bancos de dados remotos.
- Não manter servidores dedicados de streaming TURN de alto custo; priorizar conexões P2P diretas via STUN gratuito.
- Não reescrever motores legados de validação matemática que já possuem 100% de cobertura nos testes.

---

## 4. Requisitos EARS

| Requisito | Tipo Declarado | Especificação |
| :--- | :--- | :--- |
| REQ-001 | Ubiquitous | O sistema deve processar todos os buffers binários de PDF, imagens e chaves fiscais exclusivamente em memória volátil (RAM efêmera), descartando-os imediatamente após o preenchimento. |
| REQ-002 | Event | Quando o usuário arrastar múltiplos arquivos (> 1) para a dropzone do Sidepanel, o sistema deve enfileirar os documentos e processá-los concorrentemente via Promise.allSettled. |
| REQ-003 | State-driven | Enquanto a extensão processar imagens analógicas sem servidor local, o motor de OCR deve ser instanciado em documento isolado via Chrome Offscreen API, sem bloquear a thread da interface. |
| REQ-004 | Unwanted | Se uma chave de licença for submetida no formato D2F-PRO-..., o validador deve verificar a assinatura digital através de crypto.subtle.verify utilizando a chave pública embutida, rejeitando assinaturas forjadas. |

---

## 5. Orçamentos Não-Funcionais
- **Limite de Linhas por Arquivo (Regra #24):** Máximo de 700 linhas por arquivo de produção.
- **Latência de Decodificação SEFAZ:** < 15ms para QR Codes e boletos via BarcodeDetector nativo.
- **Consumo de Memória:** Teto máximo de 15MB por transação no servidor de demonstração local.
- **Cobertura de Testes (TDD):** Mínimo de 80%+ de cobertura com suíte 100% verde (219+ testes).

---

## 6. Hotspots Compartilhados
- `core/document-parser.js`: Ponto de convergência da extração assíncrona, SEFAZ, anti-glosa TUSS e descompressão.
- `extension/content.js`: Ponto crítico de injeção em portais governamentais com múltiplos iframes e máscaras JS.
- `extension/sidepanel.js`: Controlador central da interface do usuário, histórico local e orquestração de OCR.

---

## 7. Tarefas (DAG)

## T1 — Consolidação da Fase 0 e Visão Computacional Client-Side
- **Requisitos:** REQ-001
- **Agent:** noesis-domain-core
- **model:** gemini-2.5-pro
- **effort:** médio
- **tempo:** 20m
- **Depends-on:** nenhum

## T2 — Modo Fila em Lote e Build com Esbuild
- **Requisitos:** REQ-002
- **Agent:** tear-frontend
- **model:** gemini-2.5-pro
- **effort:** alto
- **tempo:** 25m
- **Depends-on:** T1

## T3 — OCR Embarcado Offscreen WASM e window.ai
- **Requisitos:** REQ-003
- **Agent:** noesis-domain-core
- **model:** gemini-2.5-pro
- **effort:** alto
- **tempo:** 30m
- **Depends-on:** T2

## T4 — Licenciamento Digital Assimétrico ECDSA
- **Requisitos:** REQ-004
- **Agent:** hermes-transact-guard
- **model:** gemini-2.5-pro
- **effort:** médio
- **tempo:** 20m
- **Depends-on:** T3

---

## 8. Matriz de Rastreabilidade

| Requisito | Tarefa | Teste |
| :--- | :--- | :--- |
| REQ-001 | T1 | tests/core/browser-autonomy.test.js |
| REQ-002 | T2 | tests/extension/sidepanel.test.js |
| REQ-003 | T3 | tests/core/browser-ocr.test.js |
| REQ-004 | T4 | tests/core/license-validator.test.js |
