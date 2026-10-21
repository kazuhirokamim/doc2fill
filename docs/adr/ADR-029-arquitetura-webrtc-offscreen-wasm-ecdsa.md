---
numero: 29
titulo: Arquitetura de Autonomia do doc2fill — WebRTC P2P, Offscreen WASM e Licenca Assimetrica ECDSA
data: 2026-10-21
status: Aceito
autores:
  - Kazuhiro
  - Tear Maestro
  - Noesis Architecture Maestro
  - Hermes Transact Guard
aplica_a:
  - core
  - extension
  - server
  - tests
tags:
  - webrtc
  - offscreen-wasm
  - ecdsa
  - barcode-detector
  - zero-retention
---

# ADR-029: Arquitetura de Autonomia do doc2fill — WebRTC P2P, Offscreen WASM e Licença Assimétrica ECDSA

## Contexto
O doc2fill opera primariamente como extensão de navegador para automação de preenchimento documental e assistência contra glosas perante órgãos públicos (SEI, CCHA, AGU) e convênios médicos. A dependência de um servidor local Node.js (`demo-server.js`) em tempo de execução para pareamento mobile e OCR em cupons analógicos impõe fricção de adoção para usuários não-técnicos e falha em redes corporativas com isolamento de cliente (Client Isolation). Ademais, a validação de licença via HMAC simétrico armazena o segredo criptográfico na distribuição da extensão, expondo o produto a falsificação de chaves por engenharia reversa.

## Decisão
No contexto de transição do protótipo local do doc2fill para produto de mercado e SaaS soberano, enfrentando a restrição de redes corporativas governamentais com Client Isolation, a dependência de runtime Node.js local no desktop do usuário e a vulnerabilidade de chaves simétricas expostas na extensão, decidimos por implementar a visão computacional e descompressão nativas client-side via BarcodeDetector e DecompressionStream, adotar OCR WebAssembly isolado via Chrome Offscreen API com suporte a window.ai, estruturar pareamento mobile serverless P2P via WebRTC com E2EE (ECDH P-256 / AES-GCM) e migrar o licenciamento para criptografia assimétrica ECDSA P-256 com chave privada sob custódia de edge serverless e webhook de pagamento, para alcançar autonomia completa de execução no navegador, zero fricção de infraestrutura local e segurança criptográfica à prova de engenharia reversa, aceitando o acréscimo pontual no payload do bundle distribuído decorrente do binário WASM do Tesseract.

### Detalhes da Decisão
1. **Visão Computacional e Descompressão Nativa Client-Side:**
   - Uso de `DecompressionStream('deflate')` para streams de PDF em `core/pdf-stream-decoder.js`.
   - Uso de `BarcodeDetector` nativo do Chrome em `core/browser-ocr.js` para leitura de QR Codes SEFAZ e boletos em sub-15ms offline.
2. **OCR Embarcado via Chrome Offscreen API & `window.ai`:**
   - Execução de `tesseract.js` WASM em background isolado (`chrome.offscreen`).
   - Sondagem da API local `window.ai` (Gemini Nano) para refinamento semântico de documentos sem custo de API externa.
3. **Pareamento Mobile WebRTC P2P Serverless:**
   - Eliminação do servidor relay local em favor de canais `RTCDataChannel` com criptografia de ponta a ponta (AES-GCM derivado via ECDH P-256).
   - Sinalização efêmera serverless com retenção zero via Cloudflare Worker.
4. **Licenciamento Assimétrico ECDSA:**
   - Migração da chave simétrica HMAC-SHA256 para assinatura digital assimétrica (ECDSA P-256 / Ed25519).
   - Chave pública exposta na extensão (`crypto.subtle.verify`) e chave privada restrita ao edge serverless autenticado pelo webhook do Asaas / Stripe.

## Consequências

### Positivas
- Zero dependência de terminal ou Node.js para o usuário final em produção.
- Compatibilidade com redes corporativas restritas da AGU, SEI e hospitais com isolamento de cliente.
- Impossibilidade matemática de quebra do sistema de licenças via inspeção do código-fonte da extensão.
- Zero retenção de dados e conformidade absoluta com a LGPD e o sigilo profissional de advogados e médicos.

### Negativas
- Aumento no tamanho do pacote compactado da extensão decorrente do worker WASM e pesos OCR (mitigado por empacotamento com esbuild).

### Neutras/Riscos Mitigados
- Dispositivos sem suporte a WebRTC ou WebAssembly degradam graciosamente para o fluxo com servidor local de contingência.
- O canal de sinalização WebRTC transmite apenas metadados de handshake SDP/ICE com descarte imediato em RAM efêmera.
