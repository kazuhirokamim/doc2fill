---
numero: 34
titulo: Pipeline Optico Autonomo no Browser e Extracao Client-Side de Imagens em PDFs Escaneados
data: 2026-10-24
status: Aceito
autores:
  - Kazuhiro
  - Tear Maestro
  - Tear Backend
  - Noesis Architecture Maestro
  - Hermes Transact Guard
aplica_a:
  - core
  - extension
  - tests
tags:
  - ocr
  - offline-first
  - binarization
  - otsu
  - deskew
  - scanned-pdf
  - zero-retention
---

# ADR-034: Pipeline Óptico Autônomo no Browser e Extração Client-Side de Imagens em PDFs Escaneados

## Contexto
O **doc2fill** atende profissionais do setor público e privado (servidores da AGU, operadores do CCHA, advogados e médicos) que operam em máquinas fechadas, sem privilégios para instalar servidores Node.js/Python locais e com restrições rígidas de envio de documentos a APIs em nuvem (Zero Retenção / LGPD).

Embora a extensão já disponha do Tesseract WASM embutido em `extension/vendor/`, a acurácia offline sofria degradação em dois cenários críticos:
1. Fotos de cupons fiscais térmicos desbotados ou inclinados eram processadas pelo Tesseract com ruído, pois as funções avançadas de binarização adaptativa Otsu e Deskew (já testadas em `core/image-preprocessor.js`) não estavam integradas no pipeline de execução do navegador (`core/browser-ocr.js`).
2. Documentos PDF escaneados (compostos por imagens rasterizadas sem texto vetorial) falhavam no browser, pois a conversão dependia de utilitários do sistema operacional (`pdftoppm` / `sips`), indisponíveis no runtime exclusivo de navegador.

## Decisão
No contexto de operação 100% autônoma e offline do doc2fill diretamente no navegador Google Chrome, enfrentando a perda de acurácia em cupons térmicos e a impossibilidade de executar utilitários locais de PDF, decidimos por:
1. Conectar a binarização adaptativa Otsu e o alinhamento angular planar (*deskew*) diretamente no fluxo de Canvas de `core/browser-ocr.js`;
2. Implementar em `core/pdf-stream-decoder.js` o extrator nativo `extractFirstPdfImageAsDataUrl`, decodificando streams de imagem JPEG (`/Filter /DCTDecode`) e descompactando streams bitmap (`/Filter /FlateDecode`) diretamente em memória efêmera no navegador;
3. Ajustar `extension/sidepanel.js` para que PDFs sem texto vetorial sejam convertidos instantaneamente para Data URL de imagem e direcionados ao motor Tesseract WASM offscreen com pré-tratamento óptico;
para alcançar 100% de autonomia e acurácia superior a 95% em documentos escaneados e cupons térmicos no navegador, com zero chamadas à nuvem e sem requerer nenhum servidor local, aceitando um custo computacional pontual de ~150ms a ~300ms de CPU local na preparação da imagem no Canvas.

## Consequências

### Positivas
- Operação 100% offline e independente de terminal, Docker, Python ou Node.js na máquina do usuário.
- Cupons fiscais térmicos, fotos com sombras e recibos inclinados passam a ser lidos com alta nitidez pelo Tesseract WASM local.
- PDFs escaneados são lidos diretamente no Chrome sem dependência de `pdftoppm` ou `sips`.
- Conformidade total com a LGPD e a política de Zero Retenção (processamento em buffers voláteis na RAM).
- Preservação total de toda a base de testes pré-existente (248 testes verdes).

### Negativas
- Em imagens com resolução extrema (> 16 megapixels), o cálculo de variância de projeção angular pode demandar processamento perceptível no cliente, mitigado por limitação de dimensão amostral no algoritmo de estimativa.

### Neutras/Riscos Mitigados
- Documentos que já contenham texto vetorial continuam utilizando o atalho ultrarrápido (< 10ms) de descompressão vetorial nativa, sem passar pelo pipeline de imagem.
