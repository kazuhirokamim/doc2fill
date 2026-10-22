---
numero: 32
titulo: Pipeline de Otimização Óptica, Upscaling Adaptativo e Refatoração Forense de Extração para Documentos Reais
data: 2026-10-22
status: Aceito
autores:
  - Kazuhiro
  - Tear Maestro
  - Tear Backend
  - Tear QA
aplica_a:
  - core
  - extension
  - server
  - tests
tags:
  - ocr
  - upscaling
  - canvas
  - tesseract
  - pdf-decoder
  - regex
  - ccha
  - zero-retention
---

# ADR-032: Pipeline de Otimização Óptica, Upscaling Adaptativo e Refatoração Forense de Extração para Documentos Reais

## Contexto
O teste empírico com 5 documentos fiscais reais (PDF escaneado de drogaria de 5.4MB, cupom térmico de vestuário/perfumaria em 331x370px, NFS-e de serviços em 509x484px, DANFE com tabelas e nota fiscal contínua) revelou falhas graves de extração: (1) um timeout artificial de 400ms no sidepanel abortava 100% das chamadas locais de OCR, forçando fallback para tag de imagem que não suporta arquivos PDF; (2) imagens com resolução abaixo de 800px possuem fontes com 3 a 5 pixels de altura, impedindo o reconhecimento de caracteres pelo Tesseract sem pré-processamento de interpolação; (3) streams FlateDecode de PDF escaneado vazavam 26.836 bytes de lixo binário da imagem comprimida; e (4) expressões regulares ingênuas capturavam stopwords alfabéticas como número de documento (ex: 'TEM', 'TA', 'DE') e fragmentos de tabelas como fornecedor ('era').

## Decisão
No contexto de validação de documentos fiscais heterogêneos pelo usuário e pelo testador Lucas, enfrentando a sub-resolução crítica de cupons térmicos e recibos, o aborto prematuro por timeout de 400ms em requisições locais de OCR, o vazamento de lixo binário em PDFs escaneados e casamentos espúrios de números e fornecedores por expressões regulares frágeis, decidimos por implementar o Pipeline Integrado de 3 Camadas composto por: (1) Upscaling Óptico Adaptativo e estiramento de contraste via OffscreenCanvas no navegador e rotinas de alta resolução no servidor para elevar imagens sub-dimensionadas para ~1800px; (2) ampliação do timeout de OCR para 15 segundos no Side Panel com conversão adequada de PDFs escaneados; (3) filtro de entropia textual para descartar streams binárias corrompidas de PDF; e (4) refatoração cirúrgica dos regexes de document-parser exigindo dígitos numéricos obrigatórios em números de documento com blacklist de stopwords e priorização de sufixos empresariais em fornecedores, para alcançar acurácia superior a 90% na extração dos 8 campos canônicos CCHA com zero retenção de dados e conformidade estrita LGPD, aceitando um consumo temporário efêmero de 15 a 30 megabytes de memória durante o redimensionamento gráfico em Canvas.

### Detalhes da Decisão
1. **Upscaling Adaptativo de Imagens & Normalização Perceptual:**
   - No browser (`core/browser-ocr.js`), utilizar Canvas dinâmico com `imageSmoothingQuality = 'high'` para interpolar imagens com dimensão máxima inferior a 1600px para um teto ótimo de 1800px a 2400px, aplicando estiramento de contraste nos pixels antes da inferência pelo Tesseract WASM.
   - No ambiente Node/Server (`core/ocr-engine.js`), implementar upscaling equivalente em memória para chamadas do endpoint `/api/ocr`.
2. **Resiliência de Timeout e Tratamento de PDFs no Side Panel (`extension/sidepanel.js`):**
   - Elevar o timeout da requisição de OCR de 400ms para 15.000ms.
   - No `pdf-stream-decoder.js`, verificar densidade de caracteres legíveis vs. bytes de controle; se for lixo binário (> 10% não-imprimível), descartar e direcionar para o motor de conversão de imagem.
3. **Refatoração Cirúrgica das Expressões Regulares (`core/document-parser.js`):**
   - `numero_documento`: Exigir `(?=.*\d)` obrigatório e blacklist de stopwords (`TEM`, `ITEM`, `NOTA`, `RECIBO`, `DE`, `DO`, `DA`, `PARA`, `EM`, `COM`). Priorizar identificadores de DANFE (`Nº 000555`), NFC-e (`COO`, `CCF`, `Extrato nº`) e chaves SEFAZ.
   - `fornecedor`: Priorizar sufixos societários (`LTDA`, `S/A`, `EIRELI`, `ME`, `EPP`) e ignorar termos de cabeçalho de tabela fiscal (`CNPJ Inscrição Estadual`, `Data de Emissão`).
   - `valor`: Suportar quebras de linha e pipes verticais entre `TOTAL` e o valor numérico.
4. **Bateria TDD Rigorosa (`tests/core/user-real-documents.test.js`):**
   - Cobrir os 5 documentos reais em cenários Happy Path, Edge Case e Error Path.

## Consequências

### Positivas
- Acurácia de extração salta de ~0% para mais de 90% nos documentos reais enviados pelo usuário e utilizados em testes do CCHA.
- Imagens de baixa resolução (prints e fotos de celular comprimidas) passam a ser lidas com fidelidade após upscaling e realce de contraste.
- O Side Panel não descarta requisições locais válidas por timeout artificial de 400ms.
- 100% de conformidade com LGPD e Zero Retenção (todo processamento ocorre em memória efêmera).

### Negativas
- Consumo efêmero temporário de aproximadamente 15 a 30 megabytes de memória durante o redimensionamento em Canvas.

### Neutras/Riscos Mitigados
- A ampliação para 15 segundos de timeout não trava a interface porque o processamento de OCR no Side Panel opera de forma totalmente assíncrona com spinners informativos.
- Manutenção rigorosa do limite de 700 linhas por arquivo per Regra Tear #24.
