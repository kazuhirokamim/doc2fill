# PLAN-025: Engine Híbrida de Escaneamento e OCR (Local-First + Cloud-Boost)

- **status:** Ratificado
- **rev:** 042424f
- **autor:** Kazuhiro & Tear Maestro
- **data:** 22/10/2026
- **tearform:** respostas/025.md
- **adr:** docs/adr/ADR-033-hybrid-ocr-scanning-engine.md

## Metadados SDD
- **versao_plano:** 1.0.0
- **tipo:** feature
- **blast_radius:** médio
- **orcamento_tokens:** 30000

---

## 1. Visão Geral e Justificativa

Na versão beta do **doc2fill**, o escaneamento de documentos físicos (fotos de smartphone tortas, cupons fiscais térmicos desbotados e notas com tabelas densas) apresenta perda de acurácia com Tesseract WASM puro (latência ou caracteres truncados em tabelas e numerações de notas).

O objetivo deste plano é implementar a **Arquitetura Híbrida Ratificada**:
1. **Otimizações Locais Primárias (Zero Retenção / Local-First):** Rotação EXIF física aplicada no Canvas, filtro adaptativo de contraste/binarização Otsu-lite e cálculo determinístico de confiança.
2. **Camada Cloud-Boost Opt-in:** Integração defensiva com APIs de Visão Computacional (Google Cloud Vision / Gemini Flash) acionadas sob demanda ou quando a confiança local for inferior a 70%.
3. **Experiência Visual Clara:** Indicador de precisão no Sidepanel com botão de re-escaneamento aprimorado em 1 clique ("⚡ Turbinar com Nuvem").

---

## 2. Opções Técnicas Avaliadas (Regra Tear #2)

### Opção 1 (RECOMENDADA): Arquitetura Híbrida Local-First com Cloud-Boost Opt-in
- **Descrição:**
  1. Motor local aprimorado com rotação planar EXIF e binarização adaptativa Otsu-lite.
  2. Módulo cliente Google Cloud Vision REST desacoplado em `core/cloud-ocr-client.js`.
  3. Acionamento condicional (confiança local < 70% ou sob clique do usuário).
  4. Fallback automático e transparente para o motor local em caso de indisponibilidade de rede.
- **Prós:**
  - Acurácia superior a 95% em documentos complexos.
  - Zero custo fixo obrigatório; funciona 100% offline para a vasta maioria dos casos.
  - Alinhamento total com LGPD e Zero Retenção (dados só trafegam sob consentimento).
- **Contras:**
  - Requer chave de API para acionamento do boost.

### Opção 2: OCR 100% em Nuvem Obrigatório
- **Descrição:** Descartar Tesseract local e enviar todos os documentos para Google Cloud Vision.
- **Prós:** Máxima acurácia imediata.
- **Contras:** Destrói a proposta de valor Local-First do Doc2Fill; quebra operação offline; gera custo por requisição para todos os usuários.

### Opção 3: Apenas Melhorias Heurísticas Locais
- **Descrição:** Otimizar apenas o Tesseract sem qualquer suporte a Cloud Vision.
- **Prós:** Totalmente local.
- **Contras:** Tesseract é linear e não resolve tabelas bidimensionais complexas nem cupons totalmente apagados.

---

## 3. Não-Objetivos / Fora de Escopo
- Não salvar imagens ou textos escaneados em banco de dados na nuvem (preservar 100% de conformidade com LGPD e Zero Retenção).
- Não forçar o envio para a nuvem sem consentimento explícito do usuário.
- Não ultrapassar o limite orçamentário de 700 linhas por arquivo de código per Regra Tear #24.

---

## 4. Requisitos EARS

| Requisito | Tipo Declarado | Especificação |
| :--- | :--- | :--- |
| REQ-001 | Ubiquitous | O sistema deve aplicar binarização adaptativa Otsu-lite em buffers de imagem para maximizar o contraste em cupons térmicos e documentos com baixa densidade de tinta. |
| REQ-002 | Event | Quando uma imagem possuir orientação EXIF diferente de 1, o sistema deve aplicar rotação física planar no Canvas antes de submetê-la ao motor de OCR. |
| REQ-003 | Optional | Onde o usuário acionar o botão de Cloud Boost ou a confiança for inferior a 70%, o sistema deve permitir invocar a Google Cloud Vision API utilizando chave configurada. |
| REQ-004 | Unwanted | Se a chamada à API Cloud Vision falhar por indisponibilidade de rede, cota excedida ou timeout, o sistema deve manter o resultado do motor local sem interromper o fluxo do usuário. |

---

## 5. Orçamentos Não-Funcionais
- **Latência Local:** < 2.500ms para inferência do Tesseract WASM em imagem processada.
- **Latência Cloud Boost:** Timeout teto de 10.000ms com abort automático.
- **Limite de Linhas (Regra #24):** Máximo de 700 linhas em arquivos de código de produção.
- **Cobertura de Testes (Regra #3):** Mínimo de 80% de cobertura com cenários Happy Path, Edge Case e Error Path.

---

## 6. Hotspots Compartilhados
- `core/image-preprocessor.js`
- `core/browser-ocr.js`
- `core/cloud-ocr-client.js`
- `extension/sidepanel.js`
- `server/demo-server.js`
- `tests/core/hybrid-ocr-scanning.test.js`

---

## 7. Tarefas (DAG)

## T1 — Binarização Otsu-lite e Rotação Planar (`core/image-preprocessor.js`)
- **Requisitos:** REQ-001, REQ-002
- **Agent:** noesis-domain-core
- **model:** gemini-2.5-pro
- **effort:** médio
- **tempo:** 20m
- **Depends-on:** nenhum

## T2 — Cliente Cloud Vision Desacoplado e Avaliador de Confiança (`core/cloud-ocr-client.js`)
- **Requisitos:** REQ-003, REQ-004
- **Agent:** tear-backend
- **model:** gemini-2.5-pro
- **effort:** médio
- **tempo:** 25m
- **Depends-on:** nenhum

## T3 — Integração na Engine do Navegador (`core/browser-ocr.js` e `server/demo-server.js`)
- **Requisitos:** REQ-001, REQ-002, REQ-003
- **Agent:** noesis-backend-maestro
- **model:** gemini-2.5-pro
- **effort:** médio
- **tempo:** 20m
- **Depends-on:** T1, T2

## T4 — Interface de Confiança e Botão Cloud-Boost no Side Panel (`extension/sidepanel.html` e `extension/sidepanel.js`)
- **Requisitos:** REQ-003, REQ-004
- **Agent:** tear-frontend
- **model:** gemini-2.5-pro
- **effort:** médio
- **tempo:** 20m
- **Depends-on:** T3

## T5 — Bateria TDD Híbrida (`tests/core/hybrid-ocr-scanning.test.js`)
- **Requisitos:** REQ-001, REQ-002, REQ-003, REQ-004
- **Agent:** tear-qa
- **model:** gemini-2.5-pro
- **effort:** médio
- **tempo:** 15m
- **Depends-on:** T1, T2, T3, T4

---

## 8. Matriz de Rastreabilidade

| Requisito | Tarefa | Teste |
| :--- | :--- | :--- |
| REQ-001 | T1 | tests/core/hybrid-ocr-scanning.test.js |
| REQ-002 | T1, T3 | tests/core/hybrid-ocr-scanning.test.js |
| REQ-003 | T2, T4 | tests/core/hybrid-ocr-scanning.test.js |
| REQ-004 | T2, T3 | tests/core/hybrid-ocr-scanning.test.js |
