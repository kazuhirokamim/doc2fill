# Diretrizes de Segurança e Conformidade com CSP (Manifest V3)

> Documentação técnica viva sobre as políticas de Content Security Policy, isolamento de execução e segurança no `doc2fill`.

---

## 1. Princípios de Segurança

O `doc2fill` opera em ambientes estritamente regulados (portais da AGU, PGFN e órgãos federais), onde a integridade dos dados e a segurança da execução são vitais.

1. **Zero Retenção de Dados**: Nenhum dado fiscal ou pessoal é persistido em servidores remotos ou bancos de dados em nuvem.
2. **Conformidade Estrita com Content Security Policy (CSP)**: Proibição total de scripts inline, strings avaliadas dinamicamente (`eval`) e atributos inline de HTML.
3. **Isolamento de Contexto**: A extensão opera sob o modelo Manifest V3 com Side Panel seguro e content scripts restritos.

---

## 2. Eliminação de Manipuladores Inline (Inline Event Handlers)

### O Problema
Manipuladores inline como `onclick="..."`, `onsubmit="..."` e blocos `<script>...</script>` embutidos no HTML violam as diretivas:
* `script-src 'self'` (Extensão Chrome Manifest V3)
* `script-src 'self' ... http://localhost:*` (Servidor local / Web)

### A Solução
Todo o código JavaScript reside em arquivos dedicados (`.js`) e é conectado ao DOM via `addEventListener`:

- **Correto**: manipulador externo desacoplado em arquivo JS importado via tag script com atributo src.
- **Proibido**: manipuladores inline em atributos HTML (`onclick`, `onsubmit`).

---

## 3. Módulos Desacoplados

| Módulo | Arquivo HTML | Arquivo JS Controlador | Responsabilidade |
| :--- | :--- | :--- | :--- |
| **Simulador AGU** | `demo-portal/index.html` | `demo-portal/portal.js` | Captura submissão do formulário, validação e feedback visual |
| **Mobile Scanner** | `mobile-pwa/index.html` | `mobile-pwa/scanner.js` | Acesso à câmera, conversão base64 e upload P2P |
| **Painel Lateral** | `extension/sidepanel.html` | `extension/sidepanel.js` | Geração de sessão, QR code e preenchimento dos formulários |

---

## 4. Testes e Validação Contínua (TDD)

Cada controlador possui sua própria suíte de testes com os 3 cenários obrigatórios (Happy Path, Edge Case, Error Path):
- `tests/portal/portal.test.js`
- `tests/scanner/scanner.test.js`

Garantindo que mesmo sob refatorações futuras a política de zero-inline permaneça intacta.
