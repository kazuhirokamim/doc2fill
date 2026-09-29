# PLAN-006: Correção Integral End-to-End do Relay P2P, OCR Mobile e Autofill CCHA

## Metadados SDD
- **versao_plano:** 1.0.0
- **tipo:** fix
- **blast_radius:** médio
- **orcamento_tokens:** 40000

---

## 1. Visão Geral e Justificativa
Durante testes práticos realizados no portal do CCHA com captura mobile e anexação direta, o sistema apresentou falhas críticas de fluxo:
1. **Retorno Prematuro no Scanner Mobile (`scanner.js`):** Após o processamento via OCR com sucesso, a função retornava (`return;`) sem invocar `sendToExtension`, fazendo com que apenas a transmissão manual ou os fallbacks com dados mockados fixos ("Dr. Lucas Silva / R$ 14.850,00") fossem enviados.
2. **Desincronização entre `core/` e `extension/core/`:** As melhorias dos 8 tipos documentais e dos 8 campos fundamentais residiam apenas em `core/`, enquanto a extensão executava o código desatualizado de `extension/core/`.
3. **Vazamento de Binário do PDF (`document-parser.js`):** Ao processar arquivos PDF com compactação `FlateDecode`, a função `extractTextFromPdfContent` retornava o conteúdo binário bruto do arquivo, impedindo o fallback de OCR óptico no sidepanel e corrompendo a extração.
4. **Sobrecarga de Fotos de Smartphone:** Fotos de alta resolução (10MB+) capturadas pela câmera eram convertidas em base64 bruto sem redimensionamento client-side no mobile PWA.
5. **Ajuste de Máscaras no Angular CCHA (`content.js`):** Campos com `type="date"` exigem formato `YYYY-MM-DD`, enquanto campos com máscaras de texto exigem `DD/MM/AAAA`.

---

## 2. Opções Técnicas Avaliadas (Regra Tear #2)

### Opção 1 (RECOMENDADA): Correção Integral End-to-End com Compressão Canvas Mobile & Espelhamento Atômico
- **Descrição:**
  1. No `scanner.js`, implementar redimensionamento no `HTML5 Canvas` (máx. 1600px de largura/altura, JPEG 0.85) e garantir a invocação imediata de `sendToExtension` após sucesso no OCR.
  2. No `core/document-parser.js`, corrigir `extractTextFromPdfContent` para retornar string vazia `''` quando nenhum texto legível for decodificado, disparando corretamente o fallback de OCR no `sidepanel.js`.
  3. Sincronizar todos os módulos de `core/` para `extension/core/` e adicionar script de sincronização no `package.json`.
  4. No `extension/content.js`, tratar inputs `type="date"` e inputs com máscaras monetárias para compatibilidade universal com o Angular Reactive Forms do CCHA.
  5. Expandir a suíte de testes TDD com cenários de redimensionamento, fallback de PDF e autofill reativo.
- **Prós:** Solução definitiva, 100% testada via TDD, alta performance mobile, sem retenção de dados e aderente às regras Tear.
- **Contras:** Exige sincronização de arquivos e atualização dos mocks de teste do scanner.

### Opção 2: Correção Rápida de Bugfix Isolado
- **Descrição:** Apenas corrigir o `return;` no `scanner.js` e copiar os arquivos para `extension/core/`.
- **Prós:** Menor volume de código alterado.
- **Contras:** Não resolve o upload de fotos de 15MB travando conexões móveis nem o bug de PDF binário.

### Opção 3: OCR Client-Side via WebAssembly no Smartphone
- **Descrição:** Executar Tesseract WASM diretamente na thread do navegador mobile.
- **Prós:** Dispensa o endpoint `/api/ocr` no servidor local.
- **Contras:** Alto consumo de bateria e memória em smartphones, download de ~15MB no 4G/5G, lentidão na inicialização.

---

## 3. Não-Objetivos / Fora de Escopo
- Não persistir fotos ou dados fiscais em disco ou banco permanente (Zero Retenção per ADR-001).
- Não alterar a interface dos 8 campos focados estabelecida no PLAN-005.
- Não depender de serviços de inteligência artificial em nuvem paga ou que exponham dados de procuradores.

---

## 4. Requisitos EARS

| Requisito | Tipo Declarado | Especificação |
| :--- | :--- | :--- |
| REQ-001 | Event | Quando a foto da câmera do celular for capturada, o sistema mobile deve redimensioná-la no canvas para no máximo 1600px antes de enviar ao servidor. |
| REQ-002 | Event | Quando o OCR mobile concluir o processamento com sucesso, o sistema deve transmitir os dados extraídos e a foto imediatamente para a extensão via P2P relay. |
| REQ-003 | State-driven | Enquanto um PDF não contiver texto digital descompactado legível, a extração deve retornar string vazia para acionar o fallback de OCR óptico. |
| REQ-004 | Ubiquitous | O diretório `extension/core/` deve manter paridade estrita de código com `core/`. |
| REQ-005 | Event | Quando o autofill preencher um campo `type="date"`, deve formatar como `YYYY-MM-DD`, e quando for campo texto com máscara de data, como `DD/MM/AAAA`. |

---

## 5. Orçamentos Não-Funcionais
- **Tamanho da Foto Redimensionada:** < 400 KB (redução de 95%+ comparado a foto original de 10MB).
- **Tempo de Transmissão P2P Mobile:** < 500 ms em rede local.
- **Cobertura de Testes TDD:** 80%+ com 3 cenários por teste (Happy Path, Edge Case, Error Path).
- **Teto de Linhas de Código:** Menos de 700 linhas por arquivo de produção (Regra #24).

---

## 6. Hotspots Compartilhados
- `core/document-parser.js`
- `mobile-pwa/scanner.js`
- `extension/content.js`
- `extension/core/document-parser.js`
- `extension/core/matcher.js`
- `extension/core/ocr-engine.js`
- `package.json`

---

## 7. Tarefas (DAG)

## T1 — Correção do Extrator de PDF no Core (`core/document-parser.js`)
- **Requisitos:** REQ-003
- **Agent:** tear-backend
- **model:** gemini-2.5-pro
- **effort:** baixo
- **tempo:** 15m
- **Depends-on:** nenhum

## T2 — Sincronização Automática Core ↔ Extension (`extension/core/`, `package.json`)
- **Requisitos:** REQ-004
- **Agent:** tear-backend
- **model:** gemini-2.5-pro
- **effort:** baixo
- **tempo:** 10m
- **Depends-on:** T1

## T3 — Otimização de Captura e Envio P2P no Scanner Mobile (`mobile-pwa/scanner.js`)
- **Requisitos:** REQ-001, REQ-002
- **Agent:** tear-frontend
- **model:** gemini-2.5-pro
- **effort:** medio
- **tempo:** 25m
- **Depends-on:** nenhum

## T4 — Injeção Resiliente de Datas e Máscaras no Content Script (`extension/content.js`)
- **Requisitos:** REQ-005
- **Agent:** tear-frontend
- **model:** gemini-2.5-pro
- **effort:** medio
- **tempo:** 20m
- **Depends-on:** T2

## T5 — Suíte TDD Completa e Validação End-to-End
- **Requisitos:** REQ-001, REQ-002, REQ-003, REQ-004, REQ-005
- **Agent:** tear-qa
- **model:** gemini-2.5-pro
- **effort:** medio
- **tempo:** 20m
- **Depends-on:** T1, T2, T3, T4

---

## 8. Matriz de Rastreabilidade

| Requisito | Tarefa | Teste |
| :--- | :--- | :--- |
| REQ-001 | T3 | tests/scanner/scanner.test.js |
| REQ-002 | T3 | tests/mobile/scanner-ocr.test.js |
| REQ-003 | T1 | tests/core/document-parser.test.js |
| REQ-004 | T2 | tests/core/document-parser.test.js |
| REQ-005 | T4 | tests/extension/content.test.js |
