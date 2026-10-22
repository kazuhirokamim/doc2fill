---
numero: 33
titulo: Arquitetura Híbrida de Escaneamento e OCR (Local-First + Cloud-Boost)
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
  - cloud-vision
  - local-first
  - binarization
  - otsu
  - exif-rotation
  - hybrid
---

# ADR-033: Arquitetura Híbrida de Escaneamento e OCR (Local-First + Cloud-Boost)

## Contexto
Na versão beta do **doc2fill**, documentos em formatos físicos capturados por fotos de smartphones ou scanners de baixa resolução (com inclinações severas, sombras, cupons térmicos com tinta apagada ou formulários densos em tabela) apresentam índice de erro ou perda de campos quando processados exclusivamente pelo Tesseract WASM local sem pré-tratamento avançado. Embora o princípio fundador do Doc2Fill seja a privacidade absoluta e Zero Retenção (Local-First), usuários corporativos e profissionais do CCHA/AGU necessitam de 100% de precisão operacional para evitar glosas fiscais e redigitação manual.

## Decisão
No contexto de escaneamento de documentos fiscais complexos na versão beta do doc2fill, enfrentando limitações inerentes de precisão do Tesseract WASM para cupons térmicos desbotados, rotações severas e tabelas densas, decidimos por implementar a Arquitetura Híbrida de Escaneamento composta por: (1) Otimizações Locais Primárias (Local-First) com binarização adaptativa Otsu-lite e rotação EXIF planar no Canvas; (2) Camada Cloud-Boost Opt-in e Desacoplada (Google Cloud Vision / Gemini Flash) acionada sob demanda ou quando o score de confiança local for inferior a 70%; e (3) Indicador visual de acurácia com botão de turbo em 1 clique no Side Panel, para alcançar precisão superior a 95% na extração de campos em qualquer documento fiscal sem quebrar o princípio de Zero Retenção, aceitando que requisições turbinadas transitem de forma pontual e autorizada pela API Cloud Vision.

### Detalhes da Decisão
1. **Melhorias Locais de Pré-Processamento (`core/image-preprocessor.js`):**
   - Implementação de `computeOtsuThreshold` e `applyOtsuBinarizationToPixels` para binarizar buffers de imagem de cupons térmicos e remover ruídos de fundo.
   - Implementação de `rotateCanvasByDegrees` para renderizar a imagem geometricamente corrigida com base nos metadados EXIF antes do OCR.
2. **Cliente Cloud-Boost Desacoplado (`core/cloud-ocr-client.js`):**
   - Funções `formatGoogleVisionPayload`, `parseGoogleVisionResponse`, `performCloudVisionOcr`.
   - Avaliador determinístico de confiança `evaluateOcrConfidence` (pontuando CNPJ, valor, data, número de documento e fornecedor).
   - Orquestrador resiliente `requestHybridOcr` que preserva o resultado local como fallback caso a nuvem esteja inacessível.
3. **Servidor e Extensão Híbridos:**
   - Suporte a `cloudBoost` no endpoint `/api/ocr` do `server/demo-server.js`.
   - Badge dinâmico de confiança e botão "⚡ Turbinar com Nuvem" no `extension/sidepanel.html` e `extension/sidepanel.js`.
4. **Bateria TDD Rigorosa (`tests/core/hybrid-ocr-scanning.test.js`):**
   - 11 testes cobrindo Happy Path, Edge Cases e Error Paths.

## Consequências

### Positivas
- Resolução de documentos difíceis com precisão superior a 95%.
- Preservação da operação offline e autônoma para documentos padronizados.
- Não introduz dependências binárias pesadas no cliente navegador (total conformidade com Chrome MV3).
- Usuário mantém controle total sobre o trânsito de dados (opt-in explícito).

### Negativas
- Documentos que utilizam o Cloud Boost requerem conectividade à internet e chave de API Google Cloud Vision configurada.

### Neutras/Riscos Mitigados
- A camada local sempre roda primeiro e de graça; a nuvem é puramente complementar.
- Nenhum dado é persistido em disco ou banco de dados no backend do doc2fill (Zero Retenção mantida).
- Fallback automático e transparente para a extração local caso a chamada à API Cloud falhe por timeout ou erro de rede.
