# PLAN-007: Pipeline Real de OCR para Cupons Fiscais e PDFs Escaneados

## Metadados SDD
- **versao_plano:** 1.0.0
- **tipo:** fix
- **blast_radius:** médio
- **orcamento_tokens:** 40000

---

## 1. Visão Geral e Justificativa
Durante testes práticos reais com o comprovante de farmácia (**Rede Popular DROGA 10 / DROGARIA RIBEIRO LTDA / CNPJ: 40.727.407/0001-30**), foram constatadas 3 falhas impeditivas no sistema:
1. **Incompatibilidade Fatal de PDF no Tesseract (`core/ocr-engine.js`):** O Tesseract.js / Leptonica opera exclusivamente com buffers de imagem (PNG/JPG/BMP). Ao receber um PDF escaneado (sem texto digital ASCII), o Leptonica falhava com a mensagem: `Error in pixReadStream: Pdf reading is not supported`, abortando o OCR silenciosamente ou quebrando o worker com erro não tratado.
2. **Dados Mockados Invasivos no Mobile PWA (`mobile-pwa/scanner.js`):** O controlador mobile possuía o objeto `defaultCchaData` com dados estáticos do "Dr. Lucas Silva / R$ 14.850,00". Quando o OCR falhava ou retornava campos parciais, esses dados falsos sobrescreviam o resultado, mascarando a leitura real do documento fotografado.
3. **Fragilidade de Heurísticas em Cupons Térmicos (NFC-e):** O OCR de impressoras térmicas gera pequenos ruídos de espaçamento (ex: `40 127 407/0001-30`). O regex anterior esperava estritamente pontos (`\d{2}\.\d{3}\.\d{3}`). Além disso, o cabeçalho térmico traz `DOCUMENTO AUXILIAR DA NOTA FISCAL DE CONSUMIDOR ELETRÔNIC`, o que não era capturado pelo classificador de cupons.

---

## 2. Opções Técnicas Avaliadas (Regra Tear #2)

### Opção 1 (RECOMENDADA): Pipeline Híbrido Local-First — Conversão de PDF em Imagem no Backend + Regras Especializadas de NFC-e + Limpeza de Mocks Mobile
- **Descrição:**
  1. No `core/ocr-engine.js` e `server/demo-server.js`, detectar se a entrada é um arquivo PDF (`%PDF` ou `data:application/pdf`). Em caso afirmativo, converter a primeira página em imagem PNG transparente utilizando o utilitário nativo do sistema (`sips` no macOS com fallback seguro em Node) e encaminhar o PNG resultante ao Tesseract.js.
  2. No `core/classifier.js`, adicionar termos canônicos de NFC-e e varejo térmico (`nota fiscal de consumidor`, `consumidor eletronica`, `consumidor eletronic`, `chave de acesso`, `nfce/consulta`, `qtd. total de itens`, `documento auxiliar`).
  3. No `core/document-parser.js`, flexibilizar regex de CNPJ para aceitar espaços entre dígitos (`40 127 407/0001-30`), extrair razão social adjacente (`DROGARIA RIBEIRO LTDA`), número da NFC-e/chave, data e valor real.
  4. No `mobile-pwa/scanner.js`, remover o preenchimento fantasma com `defaultCchaData`, transmitindo estritamente os campos identificados pelo OCR.
- **Prós:** Resolve 100% dos problemas reais de ponta a ponta (PDF escaneado + QR code mobile + classificação + extração dos 8 campos reais), mantém a soberania Local-First / Zero-Retenção e é 100% testável via TDD.
- **Contras:** Requer conversão de PDF para imagem no ambiente de execução.

### Opção 2: Conversão de PDF no Frontend via PDF.js na Extensão
- **Descrição:** Adicionar `pdf.js` na pasta da extensão para renderizar a página em `<canvas>` antes de enviar ao servidor.
- **Prós:** Servidor recebe apenas imagens PNG prontas.
- **Contras:** Aumenta o tamanho da extensão com bibliotecas pesadas e não resolve chamadas de API feitas diretamente ao backend.

### Opção 3: OCR Externo via API Cloud
- **Descrição:** Enviar o PDF para API em nuvem (ex: Gemini Flash ou Cloud Vision).
- **Prós:** Dispensa conversão local.
- **Contras:** Viola a premissa de Zero Retenção Local-First do doc2fill e introduz custo por requisição.

---

## 3. Não-Objetivos / Fora de Escopo
- Não enviar documentos para servidores externos de nuvem pública (Zero Retenção per ADR-001).
- Não persistir imagens de comprovantes em disco permanente.
- Não alterar a interface dos 8 campos focados da extensão.

---

## 4. Requisitos EARS

| Requisito | Tipo Declarado | Especificação |
| :--- | :--- | :--- |
| REQ-001 | State-driven | Enquanto a entrada de OCR for um arquivo PDF, o sistema deve converter a primeira página para imagem PNG antes de invocar o Tesseract.js, evitando o erro 'Pdf reading is not supported'. |
| REQ-002 | Event | Quando um documento contiver expressões de cupom fiscal térmico ('nota fiscal de consumidor', 'consumidor eletronic', 'chave de acesso'), o sistema deve classificá-lo como 'Cupom Fiscal (NFC-e / SAT)'. |
| REQ-003 | Event | Quando o OCR de um cupom fiscal apresentar CNPJ com espaços entre blocos de dígitos ('40 127 407/0001-30'), o parser deve normalizar e extrair o CNPJ válido. |
| REQ-004 | Ubiquitous | O sistema deve capturar a razão social e nome de fantasia adjacentes a cupons fiscais e notas de compra (ex: 'DROGARIA RIBEIRO LTDA'). |
| REQ-005 | Event | Quando o scanner mobile capturar uma foto, deve transmitir apenas os campos verdadeiramente extraídos pelo OCR, mantendo campos não encontrados vazios sem injetar dados mockados de terceiros. |

---

## 5. Orçamentos Não-Funcionais
- **Tempo de OCR de Cupom:** < 3.5 segundos em hardware local.
- **Cobertura de Testes TDD:** 80%+ com 3 cenários por teste (Happy Path, Edge Case, Error Path).
- **Teto de Linhas de Código:** Menos de 700 linhas por arquivo de produção (Regra #24).
- **Zero Retenção de Dados:** 100% dos buffers de conversão descartados da memória/disco efêmero após o OCR.

---

## 6. Hotspots Compartilhados
- `core/ocr-engine.js`
- `core/classifier.js`
- `core/document-parser.js`
- `mobile-pwa/scanner.js`
- `extension/sidepanel.js`
- `extension/core/ocr-engine.js`
- `extension/core/classifier.js`
- `extension/core/document-parser.js`

---

## 7. Tarefas (DAG)

## T1 — Conversão de PDF em Imagem no Motor de OCR (`core/ocr-engine.js`)
- **Requisitos:** REQ-001
- **Agent:** tear-backend
- **model:** gemini-2.5-pro
- **effort:** médio
- **tempo:** 20m
- **Depends-on:** nenhum

## T2 — Heurísticas de Cupom Fiscal e NFC-e no Classificador (`core/classifier.js`)
- **Requisitos:** REQ-002
- **Agent:** tear-backend
- **model:** gemini-2.5-pro
- **effort:** baixo
- **tempo:** 15m
- **Depends-on:** nenhum

## T3 — Extração Resiliente de CNPJ, Razão, Data e Valor (`core/document-parser.js`)
- **Requisitos:** REQ-003, REQ-004
- **Agent:** tear-backend
- **model:** gemini-2.5-pro
- **effort:** médio
- **tempo:** 25m
- **Depends-on:** T2

## T4 — Eliminação de Mocks e Fidelidade no Scanner Mobile (`mobile-pwa/scanner.js`)
- **Requisitos:** REQ-005
- **Agent:** tear-frontend
- **model:** gemini-2.5-pro
- **effort:** baixo
- **tempo:** 15m
- **Depends-on:** nenhum

## T5 — Sincronização Core ↔ Extensão e Testes TDD de Validação (`npm test`)
- **Requisitos:** REQ-001, REQ-002, REQ-003, REQ-004, REQ-005
- **Agent:** tear-qa
- **model:** gemini-2.5-pro
- **effort:** médio
- **tempo:** 20m
- **Depends-on:** T1, T2, T3, T4

---

## 8. Matriz de Rastreabilidade

| Requisito | Tarefa | Teste |
| :--- | :--- | :--- |
| REQ-001 | T1 | tests/core/ocr-engine.test.js |
| REQ-002 | T2 | tests/core/classifier.test.js |
| REQ-003 | T3 | tests/core/document-parser.test.js |
| REQ-004 | T3 | tests/core/document-parser.test.js |
| REQ-005 | T4 | tests/mobile/scanner-ocr.test.js |
