# 🔐 Licenciamento Criptográfico Offline e Showcase Interativo (Hero)

Este documento registra a especificação técnica e de arquitetura do **Sistema de Licenciamento Híbrido Local-First** e do **Showcase Interativo ao Vivo no Hero** do Doc2Fill, em conformidade com o [ADR-027](../../docs/adr/ADR-027-licenciamento-hibrido-e-hero-interativo.md) e o [PLAN-020](../../docs/plans/PLAN-020-licenciamento-hibrido-e-hero-interativo.md).

---

## 1. Licenciamento Criptográfico Local-First (Offline HMAC-SHA256)

### 1.1 O Desafio
Para viabilizar a monetização corporativa sem comprometer o princípio inegociável de **Zero Retenção de Dados** e sem forçar a extensão a fazer requisições a servidores externos (o que poderia violar a privacidade dos procuradores e a rígida política de CSP), adotou-se o modelo de **Licenciamento Híbrido Criptográfico Offline**.

### 1.2 Mecânica Criptográfica
A licença do usuário é vinculada diretamente ao seu **e-mail institucional/pessoal**:

- **Formato Canônico da Chave**:
  `D2F-<PLANO>-<VALIDADE>-<HMAC_16HEX>`
  *Exemplo*: `D2F-PRO-20261231-497FBBF95F094FF7` ou `D2F-PRO-LIFETIME-A1B2C3D4E5F67890`

- **Assinatura Determinística**:
  O hash HMAC-SHA256 é calculado sobre o payload normalizado:
  ```
  payload = normalizeEmail(email) + ":" + plan + ":" + expiresAt
  signature = HMAC_SHA256(SECRET, payload).slice(0, 16).toUpperCase()
  ```

- **Validação 100% Offline**:
  - `core/license-validator.js`: Implementação universal e pura de SHA-256 e HMAC-SHA256 (FIPS 180-4), sem dependências externas e síncrona.
  - O navegador ou Node.js recalcula o HMAC localmente em menos de `0.2ms`.
  - Se outro usuário tentar utilizar a mesma chave com seu próprio e-mail, a assinatura é rejeitada instantaneamente (`ASSINATURA_INVALIDA`).
  - Se a data for ultrapassada, o sistema marca a licença como `LICENCA_EXPIRADA`.

### 1.3 Interface no Sidepanel da Extensão
- **Badge Interativo no Header**: Indica o plano ativo (`● PRO Ativo`, `● Beta Ativo` ou `● Licença Inativa`).
- **Modal de Gerenciamento (`extension/license-modal.css` e `extension/license-controller.js`)**:
  - Permite ao procurador inserir seu e-mail e chave.
  - Oferece o botão tátil **"Ativar 14 Dias Beta Grátis"**, gerando automaticamente uma licença de teste válida vinculada ao e-mail institucional na primeira utilização.

---

## 2. Showcase Interativo ao Vivo no Hero (`site/index.html`)

### 2.1 Objetivo
Permitir que qualquer visitante, procurador ou tomador de decisão vivencie a velocidade do Doc2Fill diretamente na Landing Page, simulando o preenchimento completo de um comprovante para o portal CCHA em **6 segundos**.

### 2.2 Componentes e Dinâmica
- **Seletor de Comprovantes**:
  1. `🧾 Cupom Fiscal Farmácia (Droga Raia / R$ 84,50)`
  2. `📄 DANFE Consulta Médica (Hospital São Luiz / R$ 450,00)`
- **Coluna Esquerda (Comprovante / Scanner Óptico)**:
  - Exibe o comprovante original formatado em tipografia monospace.
  - Ativa o efeito visual de **Laser Scan Flow Cyan** animado descendo pelo documento.
- **Coluna Central (Cronômetro Regressivo/Progressivo)**:
  - Cronômetro em tempo real `0.0s / 6.0s` atualizado a cada 100ms.
  - Indicador de status dinâmico (*"Escaneando comprovante..."* ➔ *"Injetando no formulário CCHA..."* ➔ *"Validando regras anti-glosa..."*).
- **Coluna Direita (Simulador do Portal CCHA)**:
  - 8 campos canônicos preenchidos sequencialmente com efeito de realce **Flow Cyan Glow** (`#00D2FF`).
  - Ativação do selo verde: `🛡️ Homologado Anti-Glosa: Somatório matemático e dados fiscais conferidos [OK]`.

---

## 3. Cobertura de Testes Automatizados (TDD)
- Suíte TDD em `tests/core/license-validator.test.js`:
  - **Cenário 1 (Happy Path)**: Geração e validação de chaves PRO e STARTER.
  - **Cenário 2 (Edge Case)**: E-mails não-higienizados, planos BETA e licenças LIFETIME.
  - **Cenário 3 (Error Path)**: Rejeição de pirataria (outro e-mail), licença expirada e checksum corrompido.
- **Total do Repositório**: **210 testes verdes** homologados.
