# PLAN-009: Unificação do Handler de Upload & Aprimoramento de 20%+ no Motor OCR (S1-T1)

## Metadados SDD
- **versao_plano:** 1.0.0
- **tipo:** feature
- **blast_radius:** médio
- **orcamento_tokens:** 35000

---

## 1. Visão Geral e Justificativa
Na Sprint 1 (Dia 1 / Tarefa S1-T1) do Doc2Fill, identificamos duas necessidades cruciais para a estabilidade do MVP:
1. **Unificação dos Handlers de Upload no Sidepanel:** Os eventos de Drag-and-Drop (`onDrop`) e seleção nativa (`onChange`) operavam de forma fragmentada, gerando inconsistências no tratamento de múltiplos arquivos, extensões em maiúsculas (`.PDF`, `.PNG`) e feedback visual de carregamento.
2. **Aprimoramento do Motor OCR (+20% a +40% de Acurácia):** O OCR local em `core/ocr-engine.js` passava imagens cruas diretamente ao Tesseract sem calibração de parâmetros (PSM) nem pré-processamento de contraste/binarização, perdendo dados em cupons térmicos amarelados e fotos com sombras. Além disso, notas com Chave de Acesso SEFAZ de 44 dígitos não tinham essa chave decodificada deterministicamente para extração matemática exata de CNPJ, Data, Tipo e Número.

---

## 2. Opções Técnicas Avaliadas (Regra Tear #2)

### Opção 1: Pré-processamento de Imagem em Memória (Grayscale Ponderado + Binarização Adaptativa + Contraste)
- **Descrição:** Aplicar algoritmo leve de manipulação de buffers/pixels antes do Tesseract para normalizar contraste e sombras.
- **Prós:** Ganho de 25% a 30% em fotos escuras, 100% Local-First.
- **Contras:** Não deduz campos fiscais se o caractere estiver muito danificado.

### Opção 2: Decodificador Sintático de Chave SEFAZ de 44 Dígitos
- **Descrição:** Regex matemático que extrai CNPJ, Ano/Mês, Modelo e Número diretamente da sequência numérica de 44 dígitos da SEFAZ.
- **Prós:** 100% de assertividade nos 4 campos mais críticos para notas SEFAZ.
- **Contras:** Não cobre recibos de profissionais liberais sem chave de acesso.

### Opção 3 (RECOMENDADA): Pipeline Híbrido Triplo (Pré-processamento + Chave SEFAZ + Calibração PSM do Tesseract)
- **Descrição:** Unir o pré-processamento de imagem da Opção 1, o decodificador determinístico de Chave SEFAZ da Opção 2 e a calibração de parâmetros do Tesseract (`preserve_interword_spaces: '1'`, PSM 6/4), além de unificar o handler de upload (`handleDocumentFile`) no Sidepanel.
- **Prós:** Salto superior a 35% na acurácia global, cobre tanto notas fiscais estruturadas quanto recibos médicos/advocatícios, mantendo Zero Retenção e tempo < 3s.
- **Contras:** Requer suíte TDD abrangente cobrindo os 3 domínios.

---

## 3. Não-Objetivos / Fora de Escopo
- Não persistir arquivos ou dados fiscais em disco permanente (estritamente Zero Retenção).
- Não enviar imagens ou dados para APIs de nuvem de terceiros (estritamente Local-First).
- Não quebrar ou modificar os 8 campos canônicos da interface do Sidepanel.
- Não introduzir dependências nativas binárias pesadas em C/C++.

---

## 4. Requisitos EARS

| Requisito | Tipo Declarado | Especificação |
| :--- | :--- | :--- |
| REQ-001 | Event | Quando o usuário arrastar um arquivo ou selecionar via input nativo, o sistema deve executar a função unificada `handleDocumentFile` com sanitização e bloqueio de concorrência. |
| REQ-002 | Event | Quando múltiplos arquivos forem arrastados simultaneamente, o sistema deve selecionar o primeiro arquivo válido e emitir aviso não-bloqueante. |
| REQ-003 | State-driven | Enquanto o texto do documento contiver Chave de Acesso SEFAZ de 44 dígitos, o sistema deve extrair deterministicamente o CNPJ formatado, Ano/Mês, Modelo e Número. |
| REQ-004 | Ubiquitous | O sistema deve aplicar pré-processamento de contraste e binarização adaptativa em buffers de imagem antes do reconhecimento óptico. |
| REQ-005 | State-driven | Enquanto o Tesseract processar comprovantes fiscais, o sistema deve manter preservação de espaços entre palavras e modo de segmentação calibrado. |
| REQ-006 | Event | Quando um arquivo corrompido, vazio ou de formato proibido for fornecido, o sistema deve rejeitar graciosamente sem lançar exceções não tratadas e restaurar o estado da dropzone. |

---

## 5. Orçamentos Não-Funcionais
- **Tempo de Execução do OCR:** < 3.0 segundos para imagens de até 1600px.
- **Cobertura de Testes TDD:** 80%+ com 3 cenários por teste (Happy Path, Edge Case, Error Path).
- **Teto de Linhas de Código:** Menos de 700 linhas por arquivo de produção (Regra #24).
- **Zero Retenção de Dados:** Operação puramente em memória efêmera local (RAM).

---

## 6. Hotspots Compartilhados
- `core/ocr-engine.js`
- `core/document-parser.js`
- `extension/sidepanel.js`
- `extension/core/ocr-engine.js`
- `extension/core/document-parser.js`
- `tests/core/ocr-engine.test.js`
- `tests/core/document-parser.test.js`
- `tests/extension/sidepanel.test.js`

---

## 7. Tarefas (DAG)

## T1 — Decodificador Determinístico de Chave SEFAZ de 44 Dígitos (`core/document-parser.js`)
- **Requisitos:** REQ-003
- **Agent:** tear-backend
- **model:** gemini-2.5-pro
- **effort:** médio
- **tempo:** 20m
- **Depends-on:** nenhum

## T2 — Pré-Processador de Contraste, Binarização e Calibração Tesseract (`core/ocr-engine.js`)
- **Requisitos:** REQ-004, REQ-005
- **Agent:** tear-backend
- **model:** gemini-2.5-pro
- **effort:** médio
- **tempo:** 25m
- **Depends-on:** nenhum

## T3 — Unificação do Handler de Upload no Sidepanel (`extension/sidepanel.js`)
- **Requisitos:** REQ-001, REQ-002, REQ-006
- **Agent:** tear-frontend
- **model:** gemini-2.5-pro
- **effort:** médio
- **tempo:** 20m
- **Depends-on:** T1, T2

## T4 — Suíte de Testes TDD nos 3 Cenários (`tests/`)
- **Requisitos:** REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006
- **Agent:** tear-qa
- **model:** gemini-2.5-pro
- **effort:** médio
- **tempo:** 25m
- **Depends-on:** T3

---

## 8. Matriz de Rastreabilidade

| Requisito | Tarefa | Teste |
| :--- | :--- | :--- |
| REQ-001 | T3 | tests/extension/sidepanel.test.js |
| REQ-002 | T3 | tests/extension/sidepanel.test.js |
| REQ-003 | T1 | tests/core/document-parser.test.js |
| REQ-004 | T2 | tests/core/ocr-engine.test.js |
| REQ-005 | T2 | tests/core/ocr-engine.test.js |
| REQ-006 | T3 | tests/extension/sidepanel.test.js |
