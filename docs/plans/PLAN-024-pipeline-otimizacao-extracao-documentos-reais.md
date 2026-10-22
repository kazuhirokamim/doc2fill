# PLAN-024: Pipeline de Otimização Óptica, Upscaling Adaptativo e Refatoração Forense de Extração para Documentos Reais

- **status:** Ratificado
- **rev:** 042424f
- **autor:** Kazuhiro & Tear Maestro
- **data:** 22/10/2026
- **tearform:** respostas/024.md
- **adr:** docs/adr/ADR-032-pipeline-otimizacao-extracao-documentos-reais.md

## Metadados SDD
- **versao_plano:** 1.0.0
- **tipo:** bugfix
- **blast_radius:** médio
- **orcamento_tokens:** 30000

---

## 1. Visão Geral e Justificativa

O teste empírico do usuário com os 5 arquivos reais de amostra revelou taxa de extração quase nula devido a quatro causas-raiz combinadas:
1. **Timeout artificial de 400ms no Side Panel ([sidepanel.js](file:///Users/user/.gemini/antigravity/scratch/kazuhiro/doc2fill/extension/sidepanel.js#L264)):** Cancela requisições locais válidas de OCR (que levam de 700ms a 4s) e força fallback para tag de imagem do browser que não consegue carregar PDFs.
2. **Vazamento de bytes de imagem em streams FlateDecode ([pdf-stream-decoder.js](file:///Users/user/.gemini/antigravity/scratch/kazuhiro/doc2fill/core/pdf-stream-decoder.js)):** Operadores de texto capturam 26k bytes de lixo binário em PDFs escaneados.
3. **Sub-resolução crítica de imagens sem upscaling:** Imagens com menos de 800px possuem letras com 3 a 5 pixels de altura, impedindo o reconhecimento de caracteres pelo Tesseract sem interpolação de alta densidade e realce de contraste.
4. **Fragilidades nos regexes de extração ([document-parser.js](file:///Users/user/.gemini/antigravity/scratch/kazuhiro/doc2fill/core/document-parser.js)):** Casamentos espúrios de palavras isoladas como número de documento (`TEM`, `TA`, `DE`) e ruídos de tabela como fornecedor (`era`).

---

## 2. Opções Técnicas Avaliadas (Regra Tear #2)

### Opção 1 (RECOMENDADA): Pipeline Integrado de 3 Camadas (Upscaling Adaptativo em Canvas + Multi-Stage Parser Blindado + Remoção do Timeout 400ms)
- **Descrição:**
  1. Upscaling Óptico Adaptativo: No browser ([browser-ocr.js](file:///Users/user/.gemini/antigravity/scratch/kazuhiro/doc2fill/core/browser-ocr.js)) e no servidor local ([ocr-engine.js](file:///Users/user/.gemini/antigravity/scratch/kazuhiro/doc2fill/core/ocr-engine.js)), toda imagem menor que 1600px é automaticamente ampliada para ~1800px via interpolação de alta qualidade com realce de contraste de luminância antes do Tesseract.
  2. Correção no Side Panel: Remoção do timeout de 400ms (elevado para 15s) e tratamento adequado de PDFs escaneados com descarte de streams com alta entropia binária.
  3. Parser Blindado: `numero_documento` passa a exigir dígitos numéricos (`(?=.*\d)`) e ignora stopwords (`TEM`, `ITEM`, `DE`, `TA`); captura de fornecedor prioriza sufixos empresariais (`LTDA`, `S/A`, `EIRELI`) e filtra ruídos de tabela; `valor` ganha regex tolerante a quebras de linha e grades fiscais.
  4. TDD com os 5 Documentos: Bateria de testes automatizados com as 5 amostras reais para garantir 100% de precisão nos 8 campos canônicos.
- **Prós:**
  - Resolve a causa-raiz no navegador e no servidor.
  - Acurácia salta de ~0% para mais de 90% nos documentos reais.
  - 100% autônomo, local-first e sem retenção de dados (LGPD).
- **Contras:**
  - Requer modificações coordenadas em 4 arquivos centrais.

### Opção 2: Dependência Estrita do Servidor Local via Python/OpenCV Externo
- **Descrição:** Transferir o processamento de imagens exclusivamente para script Python com OpenCV e Pytesseract.
- **Prós:** Filtros morfológicos avançados em Python.
- **Contras:** Quebra o teste do Lucas se a máquina dele não tiver Python e OpenCV instalados; perde a autonomia client-side da extensão.

### Opção 3: Parsing Heurístico Puro sem Alterar Imagens (Apenas NLP/Regex)
- **Descrição:** Tentar inferir os campos através de distância Levenshtein sobre o texto corrompido de 43 caracteres que o OCR extrai das imagens pequenas.
- **Prós:** Não mexe na camada de processamento de imagem.
- **Contras:** Tecnicamente inviável: não é possível deduzir números fiscais, CNPJ e valores que não foram digitalizados por falta de resolução visual.

---

## 3. Não-Objetivos / Fora de Escopo
- Não integrar com serviços de nuvem de terceiros (preservar 100% de conformidade com LGPD e Zero Retenção).
- Não criar simulador artificial adicional para teste público (teste será direto no CCHA pelo Lucas).
- Não ultrapassar o limite orçamentário de 700 linhas por arquivo de código per Regra Tear #24.

---

## 4. Requisitos EARS

| Requisito | Tipo Declarado | Especificação |
| :--- | :--- | :--- |
| REQ-001 | Ubiquitous | O sistema deve aplicar upscaling óptico adaptativo e aumento de contraste em qualquer imagem submetida cuja maior dimensão seja inferior a 1600 pixels antes da inferência pelo Tesseract. |
| REQ-002 | Event | Quando um arquivo PDF escaneado for carregado, o sistema deve detectar se o fluxo FlateDecode contém entropia binária de imagem e descartar o texto corrompido, acionando a renderização visual para OCR. |
| REQ-003 | State-driven | Enquanto uma chamada de OCR estiver em andamento no Side Panel, o sistema deve aguardar até 15 segundos antes de disparar o fallback local offscreen. |
| REQ-004 | Unwanted | Se o OCR extrair palavras puramente alfabéticas (como 'TEM', 'TA', 'DE') em proximidade com rótulos de identificação, o parser deve rejeitá-las como número de documento caso não contenham ao menos um dígito numérico. |

---

## 5. Orçamentos Não-Funcionais
- **Tempo de Upscaling de Imagem:** Menor que 250ms no Canvas do navegador para resoluções até 1080p.
- **Latência de OCR em Imagens Otimizadas:** Menor que 3.5 segundos em Tesseract WASM client-side.
- **Consumo de Memória Efêmera:** Teto máximo de 35MB durante o processamento em Canvas com descarte imediato.
- **Limite de Linhas por Arquivo (Regra #24):** Nenhum arquivo de produção deve exceder 700 linhas.

---

## 6. Hotspots Compartilhados
- `core/browser-ocr.js`
- `core/ocr-engine.js`
- `core/document-parser.js`
- `core/pdf-stream-decoder.js`
- `extension/sidepanel.js`
- `tests/core/user-real-documents.test.js`

---

## 7. Tarefas (DAG)

## T1 — Upscaling Óptico Adaptativo e Realce de Contraste (`core/browser-ocr.js` e `core/ocr-engine.js`)
- **Requisitos:** REQ-001
- **Agent:** noesis-domain-core
- **model:** gemini-2.5-pro
- **effort:** médio
- **tempo:** 20m
- **Depends-on:** nenhum

## T2 — Blindagem de Streams PDF e Filtro Anti-Ruído Binário (`core/pdf-stream-decoder.js`)
- **Requisitos:** REQ-002
- **Agent:** noesis-ast-sentry
- **model:** gemini-2.5-pro
- **effort:** baixo
- **tempo:** 15m
- **Depends-on:** nenhum

## T3 — Ampliação de Timeout e Conexão de PDF no Side Panel (`extension/sidepanel.js`)
- **Requisitos:** REQ-003
- **Agent:** tear-frontend
- **model:** gemini-2.5-pro
- **effort:** baixo
- **tempo:** 15m
- **Depends-on:** T1, T2

## T4 — Refatoração Cirúrgica das Expressões Regulares (`core/document-parser.js`)
- **Requisitos:** REQ-004
- **Agent:** tear-backend
- **model:** gemini-2.5-pro
- **effort:** médio
- **tempo:** 25m
- **Depends-on:** T1

## T5 — Bateria TDD com Fixtures dos 5 Documentos do Usuário (`tests/core/user-real-documents.test.js`)
- **Requisitos:** REQ-001, REQ-002, REQ-003, REQ-004
- **Agent:** tear-qa
- **model:** gemini-2.5-pro
- **effort:** médio
- **tempo:** 20m
- **Depends-on:** T3, T4

---

## 8. Matriz de Rastreabilidade

| Requisito | Tarefa | Teste |
| :--- | :--- | :--- |
| REQ-001 | T1 | tests/core/user-real-documents.test.js |
| REQ-002 | T2 | tests/core/user-real-documents.test.js |
| REQ-003 | T3 | tests/core/user-real-documents.test.js |
| REQ-004 | T4 | tests/core/user-real-documents.test.js |
