---
numero: 36
titulo: Motor de Varredura Universal de Documentos e Resiliencia OCR no Navegador
data: 2026-10-24
status: Implementado
autores:
  - Kazuhiro
  - Tear Maestro
  - Noesis Architecture Maestro
  - Tear QA
aplica_a:
  - extension
  - core
  - tests
tags:
  - ocr
  - wasm
  - csp
  - manifest-v3
  - cupom-fiscal
  - parsing-universal
  - zero-retention
---

# ADR-036: Motor de Varredura Universal de Documentos e Resiliência OCR no Navegador

## Contexto
Durante testes com comprovantes fiscais reais e cupons térmicos (ECF/NFC-e), o processamento via painel lateral da extensão Chrome apresentou falha na captura de valores e dados tabulares, gerando campos zerados. A investigação técnica revelou três causas principais na execução autônoma no navegador:
1. Bloqueio da compilação de WebAssembly (`tesseract-core-simd-lstm.wasm`) no Chrome Manifest V3 por ausência de declaração de CSP com `'wasm-unsafe-eval'`.
2. Bloqueio de instanciação de Web Worker via Blob URL (`workerBlobURL: true`) pelo modelo de segurança estrito de extensões Chrome MV3.
3. Degradação de caracteres pontilhados e fontes térmicas por aplicação incondicional de binarização rígida Otsu de 1-bit, associada a expressões regulares de itens que não toleravam códigos de situação tributária intercalados (`T04`, `F1`, `IAT`).

## Decisão
No contexto de execução autônoma de OCR e visão computacional na extensão Chrome MV3, enfrentando o bloqueio de compilação de WebAssembly por ausência de CSP, a rejeição de workers instanciados via Blob e a degradação de caracteres pontilhados em cupons fiscais térmicos por binarização Otsu destrutiva, decidimos por implementar a Opção 2 (Motor de Varredura Universal com CSP Blindado, Worker com URL Estrita, Pré-processamento Preservativo e Heurísticas Expandidas para os 8 Tipos de Documentos), para alcançar extração local precisa e autônoma de qualquer comprovante ou nota fiscal sem alterar o contrato dos 8 campos canônicos CCHA, aceitando o esforço de calibração de expressões regulares em layouts fiscais heterogêneos.

## Consequências

### Positivas
- Resolução definitiva do bloqueio de OCR na extensão Chrome, garantindo extração local autônoma e offline sem necessidade de servidores Node ativos.
- Captura precisa de valores em cupons fiscais térmicos, notas fiscais (NFS-e e DANFE), recibos profissionais, boletos e transferências PIX.
- Preservação estrita dos 8 campos canônicos e da conformidade com LGPD (Zero Retenção).
- 266 testes automatizados verdes garantindo regressão zero com verificação red-to-green via tear-proof.

### Negativas
- Requer inclusão do script Tesseract no sidepanel como fallback, aumentando ligeiramente a memória residente durante a sessão de OCR.

### Neutras/Riscos Mitigados
- Todos os contratos de dados canônicos (`tipo_documento`, `cpf_cnpj`, `fornecedor`, `numero_documento`, `data`, `valor`, `descritivo`, `motivo`) permanecem rigorosamente idênticos.
- Caso o usuário utilize imagens com qualidade visual extremamente degradada, o botão "Turbinar com Nuvem" permanece disponível para elevação assistida de acurácia.
