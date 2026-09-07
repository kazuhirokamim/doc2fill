---
numero: 3
titulo: Conformidade Estrita com Content Security Policy (CSP) e Manifest V3 Eliminando Manipuladores de Eventos Inline
data: 2026-09-06
status: Aceito
autores:
  - Kazuhiro
aplica_a:
  - extension
  - demo-portal
  - mobile-pwa
tags:
  - security
  - csp
  - manifest-v3
  - refactor
---

# ADR-003: Conformidade Estrita com Content Security Policy (CSP) e Manifest V3 Eliminando Manipuladores de Eventos Inline

## Contexto
O ecossistema do `doc2fill` é composto pela Extensão Chrome (Manifest V3), um simulador do Portal da AGU (`demo-portal`) e um PWA de escaneamento móvel (`mobile-pwa`).
Durante os testes de integração do MVP, o console do navegador disparou violações estritas de Content Security Policy (CSP):
1. No contexto da extensão Chrome (Side Panel): `Executing inline event handler violates the following Content Security Policy directive 'script-src 'self''...`.
2. No contexto do portal simulado da AGU: `Executing inline event handler violates the following Content Security Policy directive 'script-src 'self' 'wasm-unsafe-eval' 'inline-speculation-rules' http://localhost:* http://127.0.0.1:*'...`.

Essas violações foram causadas pela presença de atributos inline legados (como `onsubmit="event.preventDefault(); alert(...)"` no formulário e blocos inline `<script>...</script>`).

## Decisão
No contexto de extensões Chrome sob Manifest V3 e páginas web locais sob diretivas estritas de CSP, enfrentando erros de execução bloqueados pelo navegador devido a manipuladores de evento inline e scripts embutidos no HTML, decidimos por eliminar 100% dos manipuladores inline e extrair toda a lógica de eventos e conexão P2P para módulos JavaScript externos dedicados acoplados via addEventListener, para alcançar conformidade estrita com as políticas de segurança do Chrome, proteção robusta contra XSS e testabilidade automatizada em 100% dos controladores, aceitando a necessidade de gerenciar arquivos de script adicionais e rotas no servidor local de desenvolvimento.

### Detalhes Técnicos da Solução
1. **Eliminação de Atributos Inline**: Remoção de `onsubmit` em `<form id="nota-form">` e `<script>` inline em `mobile-pwa/index.html`.
2. **Criação de Controladores Externos**:
   - `demo-portal/portal.js`: Gerencia a submissão idempotente do formulário e feedback visual via `addEventListener`.
   - `mobile-pwa/scanner.js`: Gerencia a captura da câmera, conversão em base64 e upload P2P para a extensão.
3. **MIME-Type e Rotas HTTP**: Suporte a arquivos `.js` com `Content-Type: application/javascript` em `server/demo-server.js`.
4. **Validação TDD**: Criação de `tests/portal/portal.test.js` e `tests/scanner/scanner.test.js` com 3 cenários cada (Caminho Feliz, Casos de Borda e Erro).

## Consequências

### Positivas
* Eliminação total dos erros de CSP no console do navegador e da extensão.
* Blindagem contra ataques de Cross-Site Scripting (XSS).
* Código desacoplado, modular e 100% coberto por testes unitários e de integração.
* Aderência total às diretrizes de publicação da Chrome Web Store para Manifest V3.

### Negativas
* Criação de arquivos adicionais que devem ser mantidos e servidos explicitamente com headers adequados.

### Neutras/Riscos Mitigados
* A estrutura modular reduz drasticamente o risco de regressões e os testes garantem idempotência em múltiplos envios.
