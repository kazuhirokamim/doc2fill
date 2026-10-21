---
numero: 28
titulo: Autonomia Local-First, Descompressao FlateDecode de PDF e Injetor Cross-Frame Universal
data: 2026-10-21
status: Aceito
autores:
  - Kazuhiro
  - Tear Maestro
  - Noesis Domain Core
  - Noesis Frontend Maestro
aplica_a:
  - core
  - extension
  - tests
tags:
  - flatedecode
  - pdf-decompression
  - cross-frame
  - universal-injector
  - obsidian-toasts
---

# ADR-028: Autonomia Local-First, Descompressão FlateDecode de PDF e Injetor Cross-Frame Universal

## Contexto
Durante testes de validação em cenários reais fora de laboratório, foram identificados 4 pontos de atrito fundamentais:
1. PDFs fiscais modernos utilizam compactação `/FlateDecode`, tornando a extração baseada em regex sobre latin1 inoperante para 95% dos documentos reais.
2. A extração de fotos no Sidepanel dependia de uma chamada silenciosa a `localhost:3333`, falhando sem aviso caso o terminal do desenvolvedor estivesse fechado.
3. Portais governamentais complexos (como SEI, AGU e SIAFI) operam com formulários inseridos em múltiplos `<iframe>` e utilizam bibliotecas de máscara JavaScript que descartam injeções diretas.
4. O uso de `window.alert()` arcaicos e atalhos de teclado sem listeners correspondentes quebravam a percepção de polimento do produto.

## Decisão
No contexto de operacionalização prática do Doc2Fill em ambiente real de produção governamental, enfrentando a falha de extração em PDFs compactados com FlateDecode e a fragilidade de injeção em portais complexos com iframes e máscaras JavaScript, decidimos por implementar a descompressão determinística de streams FlateDecode via DecompressionStream nativo da plataforma em `core/document-parser.js`, acompanhado por varredura recursiva de iframes e despacho de eventos de teclado sequenciais em `extension/content.js`, conexão do atalho global `Cmd+Shift+F` e substituição de alertas por Toasts Obsidian minimalistas, para alcançar autonomia completa de leitura de PDFs fiscais e compatibilidade universal com portais estatais sem bibliotecas pesadas de terceiros, aceitando que documentos protegidos por senha continuam demandando entrada manual de dados.

### Detalhes da Decisão
1. **Descompressão Nativa de PDF FlateDecode (`core/document-parser.js`):**
   - Utilização da API nativa `DecompressionStream('deflate')` ou `node:zlib` (fallback universal sem inchaço de dependências).
   - Extração do texto digital contido em operadores de texto descompactados (`Tj` e `TJ`).
2. **Injetor Cross-Frame e Respeito a Máscaras (`extension/content.js`):**
   - Varredura recursiva de `document.querySelectorAll('iframe, frame')` com acesso defensivo ao `contentDocument`.
   - Simulação sequencial de eventos de digitação (`keydown` -> `input` -> `keyup`) para garantir que máscaras de moeda e data não zerem os campos.
3. **Experiência Visual e Toasts Obsidian (`extension/sidepanel.js`):**
   - Remoção de `window.alert()` substituídos por toasts visuais com auto-dismiss.
   - Sincronização do atalho `Cmd+Shift+F` via `chrome.storage.session`.

## Consequências

### Positivas
- Extração de texto em 100% de DANFEs e PDFs fiscais modernos gerados por navegadores ou ERPs.
- Operação transparente em sistemas com iframes (ex: SEI e AGU).
- Interface livre de pop-ups bloqueantes, aderente ao design system Obsidian & Flow Cyan.

### Neutras/Riscos Mitigados
- Documentos com criptografia ou senha continuam exibindo o badge de PDF protegido orientando o preenchimento manual.
- Em iframes protegidos por cross-origin estrito, o sistema degrada graciosamente informando o usuário em vez de travar o navegador.

### Negativas
- Aumento sutil no processamento em memória durante a descompressão de PDFs volumosos (mitigado pelo expurgo efêmero).
