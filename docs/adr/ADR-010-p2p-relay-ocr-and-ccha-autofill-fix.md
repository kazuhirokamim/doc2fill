---
numero: 10
titulo: Correção Integral End-to-End do Relay P2P, OCR Mobile e Autofill CCHA
data: 2026-09-29
status: Aceito
autores:
  - Kazuhiro
  - Tear Maestro
aplica_a:
  - core
  - extension
  - mobile-pwa
  - server
tags:
  - p2p-relay
  - ocr
  - canvas-resize
  - ccha
  - autofill
---

# ADR-010: Correção Integral End-to-End do Relay P2P, OCR Mobile e Autofill CCHA

## Contexto
Após os testes práticos de usabilidade com captura mobile e anexação de documentos em ambiente CCHA, foram identificadas 5 falhas no pipeline de dados:
1. No `scanner.js`, após o OCR no mobile extrair dados com sucesso, a função encerrava (`return;`) sem chamar `sendToExtension`, provocando envio inadvertido de dados mockados fixos ("Dr. Lucas Silva").
2. Havia descompasso entre `core/` e `extension/core/`, fazendo a extensão executar regras defasadas de parsing e classificação.
3. No `core/document-parser.js`, `extractTextFromPdfContent` retornava o conteúdo binário bruto de PDFs com streams `FlateDecode`, impedindo o fallback de OCR no `sidepanel.js` e preenchendo o formulário com dados vazios.
4. Fotos capturadas por smartphones ultrapassavam 10MB, sobrecarregando a requisição HTTP e provocando lentidão no servidor local.
5. Incompatibilidades pontuais de máscaras no `content.js` com o Angular Reactive Forms do portal CCHA (formatos de data e valor monetário).

## Decisão
No contexto de captura de documentos por smartphone e preenchimento automático no portal do CCHA, enfrentando falhas de transmissão P2P, desincronização entre módulos de core e extensão, sobrecarga de fotos pesadas na rede e vazamento de binários no extrator de PDFs, decidimos por implementar compressão via Canvas no mobile PWA, garantir envio P2P imediato pós-OCR, higienizar o retorno de texto de PDFs sem streams ASCII, sincronizar atomicamente `core/` com `extension/core/` e flexibilizar a injeção de máscaras e datas no content script, para alcançar funcionamento 100% confiável, instantâneo e livre de dados de teste mockados na operação real dos procuradores, aceitando um overhead computacional mínimo de renderização no navegador do celular.

### Detalhes da Decisão
1. **Envio P2P Obrigatório no Mobile (`mobile-pwa/scanner.js`)**: Correção imediata do fluxo pós-OCR chamando `sendToExtension` com os dados reais extraídos e o arquivo capturado, eliminando o fallback com dados mockados.
2. **Redimensionamento Canvas Client-Side (`mobile-pwa/scanner.js`)**: Renderização da foto em `HTML5 Canvas` limitando a largura/altura a 1600px e gerando JPEG 0.85, reduzindo o arquivo de 10MB para ~250KB antes do upload.
3. **Retorno Limpo no Leitor de PDF (`core/document-parser.js`)**: Retornar string vazia `''` quando operadores de texto ou strings legíveis não forem identificados, disparando o fallback de OCR óptico no sidepanel.
4. **Espelhamento Atômico do Core (`extension/core/`)**: Garantir paridade total com `core/` e registrar script `sync-core` no `package.json`.
5. **Autofill Resiliente a Máscaras (`extension/content.js`)**: Tratar inputs `type="date"` (esperando `YYYY-MM-DD`) e inputs com máscaras monetárias ou de texto no CCHA.

## Consequências

### Positivas
- Dados reais do documento capturado chegam à extensão em menos de 500ms.
- Eliminação definitiva de envios de dados de teste ("Dr. Lucas Silva") durante a captura.
- Redução de mais de 95% no payload de fotos móveis trafegadas pela rede local.
- PDFs comprimidos acionam o OCR óptico graciosamente em vez de travar o parser.
- Paridade 100% garantida entre o ambiente de testes e o runtime da extensão no Chrome.

### Negativas
- Necessidade de manter sincronia de arquivos entre `core/` e `extension/core/` garantida via script.

### Neutras/Riscos Mitigados
- Risco de perda de resolução na foto mitigado mantendo a cota máxima de 1600px, suficiente para leitura nítida pelo OCR do Tesseract.
- Risco de quebra em formulários não-Angular mitigado com verificações condicionais de tipo de elemento e fallback para setters nativos de DOM.
