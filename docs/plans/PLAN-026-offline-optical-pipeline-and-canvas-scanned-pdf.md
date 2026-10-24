# PLAN-026: Pipeline Óptico Autônomo e Leitura Client-Side de PDFs Escaneados (Offline-First)

- **status:** Ratificado
- **rev:** 042424f
- **autor:** Kazuhiro & Tear Maestro
- **data:** 24/10/2026
- **tearform:** respostas/026.md
- **adr:** docs/adr/ADR-034-offline-optical-pipeline-and-canvas-scanned-pdf.md

## Metadados SDD
- **versao_plano:** 1.0.0
- **tipo:** feature
- **blast_radius:** médio
- **orcamento_tokens:** 30000

---

## 1. Visão Geral e Justificativa
O **doc2fill** atua em ambientes regulados e órgãos públicos (AGU, SEI, CCHA, convênios) onde o acesso à nuvem é restrito ou proibido (LGPD / Zero Retenção). Além disso, usuários finais não possuem privilégios administrativos nem runtime local (Node.js/Python) em suas estações de trabalho para rodar servidores auxiliares.

Embora o ecossistema já disponha de Tesseract WASM embutido (`extension/vendor/`), motor anti-glosa e decodificador SEFAZ, foram identificadas duas lacunas para operação autônoma no navegador:
1. O pré-processamento de imagem no browser (`core/browser-ocr.js`) utilizava contraste linear simples e não invocava os módulos avançados de binarização adaptativa Otsu e Deskew presentes em `core/image-preprocessor.js`.
2. Documentos PDF escaneados (compostos puramente por imagens rasterizadas sem texto vetorial) falhavam no browser ao tentar carregar o PDF em um elemento HTML `<img>`.

---

## 2. Opções Técnicas Avaliadas (Regra Tear #2)

### Opção 1 (RECOMENDADA): Acoplamento Completo do Pipeline Óptico no Canvas + Decodificador de Imagens de PDF
- **Descrição:**
  1. Conectar `applyOtsuBinarizationToPixels`, `estimateSkewAngleFromProjection` e `calculateRotatedDimensions` em `core/browser-ocr.js`.
  2. Implementar `extractFirstPdfImageAsDataUrl` em `core/pdf-stream-decoder.js` para extrair imagens DCTDecode (JPEG) e FlateDecode diretamente de PDFs no client.
  3. Integrar no fluxo de fallback de `extension/sidepanel.js`.
- **Prós:**
  - 100% aditivo: preserva toda a lógica atual, testes e compatibilidade.
  - Zero dependência externa nova; não aumenta o tamanho do pacote da extensão.
  - Funciona imediatamente em qualquer versão do Chrome/Edge/Brave.
- **Contras:**
  - Cálculos de projeção angular (Deskew) em imagens muito pesadas (>4000px) podem adicionar ~150-300ms de processamento na CPU do usuário.

### Opção 2: Pipeline Multi-Pass Adaptativo com Micro-Workers WASM
- **Descrição:** Executar o Tesseract em múltiplas passagens progressivas sob demanda.
- **Prós:** Tenta vários ângulos automaticamente.
- **Contras:** Aumenta tempo de processamento para até 4 segundos e consome mais memória.

### Opção 3: Ativação Híbrida com IA On-Device (`window.ai` / Gemini Nano)
- **Descrição:** Utilizar exclusivamente modelos on-device do Chrome.
- **Prós:** Excelente raciocínio semântico.
- **Contras:** Depende de hardware específico e Chrome 128+ com flags ativadas; inviável como única alternativa em órgãos públicos.

---

## 3. Não-Objetivos / Fora de Escopo
- Não salvar imagens ou textos escaneados em banco de dados na nuvem (preservar 100% de conformidade com LGPD e Zero Retenção).
- Não exigir dependências de binários externos do sistema operacional (como `pdftoppm` ou `sips`) para o funcionamento da extensão.
- Não ultrapassar o limite orçamentário de 700 linhas por arquivo de código per Regra Tear #24.

---

## 4. Requisitos EARS

| Requisito | Tipo Declarado | Especificação |
| :--- | :--- | :--- |
| REQ-001 | Ubiquitous | O sistema deve aplicar binarização adaptativa Otsu-lite e estimativa de alinhamento angular no Canvas para otimizar cupons térmicos antes do Tesseract WASM. |
| REQ-002 | Event | Quando um PDF for submetido sem streams de texto vetorial legíveis, o sistema deve extrair o primeiro stream de imagem rasterizada (DCTDecode) como Data URL. |
| REQ-003 | Optional | Onde a imagem possuir inclinação detectável via projeção planar, o sistema deve rotacionar o Canvas preservando as dimensões calculadas. |
| REQ-004 | Unwanted | Se o PDF ou imagem estiver corrompido ou vazio, o sistema deve retornar resultado estruturado com falha controlada sem lançar exceções não tratadas. |

---

## 5. Orçamentos Não-Funcionais
- **Latência Óptica no Canvas:** < 300ms para binarização e correção planar de imagem no browser.
- **Limite de Linhas (Regra #24):** Máximo de 700 linhas em arquivos de código de produção (`core/browser-ocr.js` e `extension/sidepanel.js`).
- **Cobertura de Testes (Regra #3):** Mínimo de 80% de cobertura com cenários Happy Path, Edge Case e Error Path.
- **Zero Retenção:** Descarte imediato de buffers da memória ao término do processamento.

---

## 6. Hotspots Compartilhados
- `core/browser-ocr.js`
- `core/image-preprocessor.js`
- `core/pdf-stream-decoder.js`
- `core/document-parser.js`
- `extension/sidepanel.js`
- `tests/core/offline-optical-pipeline.test.js`

---

## 7. Tarefas (DAG)

## T1 — Extrator de Imagem de PDF no Client (`core/pdf-stream-decoder.js`)
- **Requisitos:** REQ-002, REQ-004
- **Agent:** noesis-domain-core
- **model:** gemini-2.5-pro
- **effort:** médio
- **tempo:** 15m
- **Depends-on:** nenhum

## T2 — Conexão do Pipeline Óptico no Browser (`core/browser-ocr.js`)
- **Requisitos:** REQ-001, REQ-003
- **Agent:** tear-backend
- **model:** gemini-2.5-pro
- **effort:** médio
- **tempo:** 15m
- **Depends-on:** T1

## T3 — Integração com o Sidepanel (`extension/sidepanel.js`)
- **Requisitos:** REQ-001, REQ-002
- **Agent:** tear-frontend
- **model:** gemini-2.5-pro
- **effort:** baixo
- **tempo:** 10m
- **Depends-on:** T2

## T4 — Bateria de Testes TDD (`tests/core/offline-optical-pipeline.test.js`)
- **Requisitos:** REQ-001, REQ-002, REQ-004
- **Agent:** tear-qa
- **model:** gemini-2.5-pro
- **effort:** médio
- **tempo:** 15m
- **Depends-on:** T1, T2, T3

---

## 8. Matriz de Rastreabilidade

| Requisito | Tarefa | Teste |
| :--- | :--- | :--- |
| REQ-001 | T2, T3 | tests/core/offline-optical-pipeline.test.js |
| REQ-002 | T1, T3 | tests/core/offline-optical-pipeline.test.js |
| REQ-003 | T2 | tests/core/offline-optical-pipeline.test.js |
| REQ-004 | T1, T4 | tests/core/offline-optical-pipeline.test.js |
