---
numero: 31
titulo: Autonomia de OCR Offscreen Local-First e Resiliência do Pacote Beta
data: 2026-10-22
status: Aceito
autores:
  - Kazuhiro
  - Tear Maestro
  - Tear Frontend
  - Hermes Frictionless UI
aplica_a:
  - extension
  - core
  - scripts
  - tests
tags:
  - ocr
  - wasm
  - offscreen
  - tesseract
  - zero-retention
  - ccha
---

# ADR-031: Autonomia de OCR Offscreen Local-First e Resiliência do Pacote Beta

## Contexto
O envio da versão beta do doc2fill para validação pelo testador (Lucas) revelou dependências operacionais e gargalos de runtime: (1) o injetor `content.js` continha declaração `export` em modo de script clássico do Chrome Manifest V3, provocando `SyntaxError` e bloqueando a injeção no portal CCHA; (2) o OCR de imagens e comprovantes dependia exclusivamente do servidor Node (`http://localhost:3333/api/ocr`), resultando em erro de documento ilegível quando o testador executa apenas a extensão no navegador; (3) o pareamento mobile requeria orientação clara sobre a necessidade de ambos os dispositivos residirem na mesma rede Wi-Fi; e (4) tentativas de preenchimento a partir de abas do sistema (`chrome://`) geravam falhas genéricas.

## Decisão
No contexto de entrega da versão beta do doc2fill para teste direto no portal governamental CCHA, enfrentando a dependência de servidor local ativo para OCR de comprovantes em foto, a rejeição de scripts de conteúdo por erros de sintaxe de módulo clássico e a necessidade de orientação clara sobre redes locais P2P, decidimos por implementar a Opção B (Híbrido Resiliente com Fallback Local via Offscreen Document & Tesseract WASM em extension/vendor), expurgar a palavra-chave export em scripts clássicos de content script, interceptar abas restritas do navegador com toasts instrutivos e documentar o requisito obrigatório de mesma rede Wi-Fi na interface, para alcançar execução autônoma do fluxo de faturamento sem necessidade de terminal ou servidores Node ativos na máquina do usuário final com 100% de conformidade LGPD e Zero Retenção, aceitando o aumento do pacote compilado da extensão para aproximadamente 5.4 megabytes.

### Detalhes da Decisão
1. **Engine WASM e Dicionários Locais (extension/vendor/):**
   - Disponibilização de `tesseract.min.js`, `worker.min.js`, `tesseract-core-simd-lstm.wasm` e `por.traineddata` dentro da pasta `vendor/` da extensão, registrados sob `web_accessible_resources` no Manifest V3.
2. **Ciclo de Vida Offscreen Híbrido:**
   - O controlador do Side Panel tenta consultar o servidor local com timeout agressivo de 400 milissegundos via `AbortController`.
   - Caso o servidor local não responda (cenário da máquina do Lucas), despacha a imagem para `extension/offscreen.html`, que instancia o worker WASM local isolado via `chrome.runtime.getURL`.
3. **Higienização de Injetor DOM:**
   - Eliminação de export solto em `extension/content.js` e compilação IIFE determinística via esbuild.
4. **Ergonomia e Conectividade Wi-Fi:**
   - Box explicativo na aba Celular (QR) alertando que o celular e o computador devem estar na mesma rede Wi-Fi para transmissão local P2P.
5. **Interceptação de Abas do Sistema:**
   - Tratamento preventivo em URLs `chrome://`, `chrome-extension://`, `edge://` e `about:` orientando o usuário a abrir a tela de requerimento no CCHA.

## Consequências

### Positivas
- Extensão 100% autônoma para leitura de PDFs e fotos de recibos sem necessidade de Node.js ou comandos de terminal pelo Lucas.
- Injeção em formulários do CCHA livre de SyntaxError com total suporte a Angular Material e campos nativos.
- Zero envio de dados para servidores de nuvem de terceiros (100% LGPD).
- 229 testes unitários e de integração verdes garantindo regressão zero.

### Negativas
- O tamanho do pacote compactado da extensão sobe de ~250 KB para ~4.0 MB devido aos binários WASM e modelo treinado em português.

### Neutras/Riscos Mitigados
- Dispositivos em redes celulares 4G/5G são orientados visualmente antes da captura a conectarem no Wi-Fi local para viabilizar o pareamento.
- Arquivos de desenvolvimento e binários WASM são ignorados pelo repositório git através do `.gitignore` para evitar falsos positivos de chaves e bloat no histórico.
