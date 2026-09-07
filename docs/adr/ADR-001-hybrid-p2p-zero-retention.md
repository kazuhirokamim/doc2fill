---
numero: 1
titulo: Arquitetura Híbrida P2P com Pareamento QR Code Real e Ephemeral Relay em Memória
data: 2026-09-06
status: Aceito
autores:
  - Kazuhiro
aplica_a:
  - server
  - extension
  - mobile-pwa
tags:
  - p2p
  - qrcode
  - zero-retention
  - relay
---

# ADR-001: Arquitetura Híbrida P2P com Pareamento QR Code Real e Ephemeral Relay em Memória

## Contexto
O projeto `doc2fill` tem como objetivo automatizar o preenchimento de dados de notas fiscais e relatórios em portais da administração pública (AGU/SIAFI/SEI).
O público-alvo inicial são Procuradores da Fazenda Nacional e servidores federais, que lidam com dados fiscais sensíveis protegidos por sigilo e LGPD. Qualquer armazenamento persistente de dados em nuvem criaria fricção jurídica, riscos de vazamento e resistência à adoção. Além disso, o pareamento entre o celular e o computador deve ser instantâneo e acessível via câmera nativa sem exigir instalação de aplicativo das lojas.

## Decisão
No contexto de sistemas fiscais para servidores públicos da AGU, enfrentando requisitos estritos de sigilo e a impossibilidade de persistir dados fiscais em nuvem, decidimos por adotar uma arquitetura de pareamento P2P via QR Code dinâmico escaneável e relay efêmero em memória RAM, para alcançar transmissão direta, segura e de consumo único entre smartphone e desktop sem dependência de nuvem, aceitando a volatilidade da sessão caso a aba seja encerrada antes da conclusão do preenchimento.

### Detalhes Técnicos da Solução
1. **Geração de QR Code Real Escaneável**: O servidor local (`server/demo-server.js`) detecta automaticamente o IP na rede local (Wi-Fi/Ethernet) e gera uma matriz QR Code SVG padrão ISO/IEC 18004. Ao apontar a câmera do iPhone/Android, o navegador do smartphone abre a URL `http://<ip-local>:8080/mobile?session=<sessionId>` instantaneamente.
2. **Ephemeral Relay em Memória (Zero-Retention)**: O celular transmite o payload fiscal via `POST /api/relay/upload`, retido apenas temporariamente em um `Map` na memória RAM. A extensão consome o payload via `GET /api/relay/poll` que, ao entregar os dados, **deleta imediatamente a chave da memória**, garantindo zero persistência em disco.
3. **Seleção de Arquivos em Desktop e Mobile**: Tratamento nativo de eventos de `click` e drag & drop na extensão e PWA sem violar a política CSP do Manifest V3 do Chrome.

## Consequências

### Positivas
* Pareamento instantâneo: o usuário aponta a câmera nativa do celular e a conexão é estabelecida sem intervenção manual.
* Zero dados salvos em disco ou servidores de banco de dados, em total conformidade com a LGPD e o sigilo fiscal da AGU.
* Interface desacoplada e resiliente entre celular e computador.

### Negativas
* A sessão em memória expira e é efêmera; se a aba da extensão for fechada antes do consumo, é necessário gerar nova sessão.

### Neutras/Riscos Mitigados
* Caso a câmera do smartphone falhe ou o ambiente não permita escaneamento, a extensão disponibiliza um botão de "Copiar Link" para compartilhamento direto do endereço de conexão.
