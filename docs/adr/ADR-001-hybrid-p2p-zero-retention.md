# ADR-001: Arquitetura Híbrida P2P / Ephemeral Relay com Zero Retenção de Dados

## Status
Proposto / Aceito

## Contexto
O projeto `doc2fill` tem como objetivo automatizar o preenchimento de dados de notas fiscais e relatórios em portais da administração pública (AGU/SIAFI/SEI).
O público-alvo inicial são Procuradores da Fazenda Nacional e servidores federais, que lidam com dados sensíveis, fiscais e cobertos por sigilo e LGPD. Qualquer armazenamento persistente de dados em nuvem criaria fricção jurídica, riscos de vazamento e resistência à adoção.

## Decisão
Adotaremos uma **Arquitetura de Zero Retenção (Zero Data Retention / Ephemeral Relay)** com suporte a:
1. **Pareamento Instantâneo via QR Code**: A extensão no Chrome gera uma sessão com chave simétrica efêmera (AES-GCM-256). O QR Code codifica a URL do PWA + a chave de sessão.
2. **Transmissão em Memória (P2P / WebRTC ou Relay Ephemeral)**: A imagem/dados trafegam criptografados de ponta a ponta entre o celular e o computador.
3. **Processamento Stateless**:
   - Extração via Gemini Multimodal com payload em memória (`store_data: false`), devolvendo JSON estruturado e descartando buffers de imagem imediatamente.
   - Suporte nativo para documentos digitais (PDF / Imagem) arrastados diretamente na extensão do desktop.
4. **Zero Persistência**: Nenhum banco de dados armazena arquivos ou entidades extraídas (CPF, CNPJ, valores).

## Consequências
* **Positivas**: 
  - Compliance total com LGPD e normas de segurança pública.
  - Forte apelo comercial e de vendas ("Seus dados nunca são gravados").
  - Custo operacional de infraestrutura próximo de zero (sem armazenamento S3/GCS, sem bancos de dados pesados).
* **Negativas**: 
  - A sessão é efêmera; se o usuário fechar a aba antes de clicar em preencher, precisa escanear novamente.
