# PLAN-020: Licenciamento Híbrido Vinculado a E-mail e Showcase Interativo no Hero

- **status:** Ratificado
- **rev:** f96fc90
- **autor:** Equipe Doc2Fill
- **data:** 12/10/2026
- **tearform:** respostas/020.md
- **adr:** docs/adr/ADR-027-licenciamento-hibrido-e-hero-interativo.md

## Metadados SDD
- **versao_plano:** 1.0.0
- **tipo:** feature
- **blast_radius:** médio
- **orcamento_tokens:** 35000

---

## 1. Visão Geral e Justificativa
O Doc2Fill atinge sua maturidade para o programa Beta Teste demandando dois refinamentos centrais: (1) um modelo de licenciamento seguro, anti-pirataria e 100% offline, em que as chaves de ativação são criptograficamente amarradas ao e-mail do comprador (evitando que uma única licença seja compartilhada em grupos de WhatsApp sem controle), e (2) um Showcase Interativo de alta fidelidade no Hero da Landing Page (`site/index.html`), permitindo que qualquer visitante experimente a simulação em 6 segundos do escaneamento, extração canônica e preenchimento no CCHA antes mesmo de instalar a extensão.

---

## 2. Opções Técnicas Avaliadas (Regra Tear #2)

### Opção 1: Licenciamento Apenas por E-mail sem Validação Criptográfica Local
- **Descrição:** O usuário apenas digita seu e-mail no Sidepanel e o sistema desbloqueia o uso.
- **Prós:** Experiência de digitação simples para o usuário.
- **Contras:** Vulnerabilidade crítica de pirataria: qualquer pessoa pode digitar o e-mail de um colega ou de um procurador que comprou a licença e utilizar de graça sem autorização. Se exigir checagem online a cada uso, quebra a autonomia Local-First e falha em tribunais sem internet.

### Opção 2: Chaves Alfanuméricas Genéricas Desconectadas de E-mail
- **Descrição:** Chaves aleatórias padrão `XXXX-YYYY-ZZZZ`.
- **Prós:** Validação offline simples.
- **Contras:** A mesma chave pode ser repassada e ativada em centenas de computadores sem qualquer vínculo com quem pagou.

### Opção 3 (RECOMENDADA): Licenciamento Híbrido (E-mail + Token HMAC-SHA256 Offline) + Showcase Interativo no Hero
- **Descrição:**
  1. A chave é calculada matematicamente a partir do e-mail do usuário: `HMAC-SHA256(email + plano + validade)`.
  2. A biblioteca `core/license-validator.js` valida no próprio navegador se a chave corresponde ao e-mail informado e se está dentro do prazo de validade.
  3. No Sidepanel, o modal de ativação solicita E-mail e Chave (ou ativação do trial Beta de 14 dias com 1 clique).
  4. Na Landing Page, um Showcase interativo no Hero simula em tempo real o fluxo de 6 segundos com opções de Cupom e DANFE.
- **Prós:**
  - 100% Offline e determinístico: funciona sem conexão à internet.
  - Vínculo inquebrável: uma chave gerada para `usuario@agu.gov.br` é matematicamente inválida para outro e-mail.
  - Conversão imediata no Hero com demonstração viva.
  - Orçamento estrito de linhas (< 700 linhas) per Regra #24.
- **Contras:**
  - O usuário precisa inserir o e-mail e a chave recebida no checkout.

---

## 3. Não-Objetivos / Fora de Escopo
- Não implementar DRM intrusivo que colete identificadores de hardware ou mac address.
- Não exigir conexão contínua com a internet para validação de cada preenchimento.
- Não ultrapassar o orçamento de 700 linhas por arquivo de código per Regra #24.

---

## 4. Requisitos EARS

| Requisito | Tipo Declarado | Especificação |
| :--- | :--- | :--- |
| REQ-001 | Ubiquitous | O sistema deve validar chaves de licença no formato D2F localmente sem realizar chamadas de rede externas. |
| REQ-002 | Event | Quando o usuário informar um par de e-mail e chave de licença válidos, o sistema deve registrar a licença no armazenamento local e atualizar o status para ativo. |
| REQ-003 | State-driven | Enquanto na Landing Page, o sistema deve disponibilizar um showcase interativo que execute a simulação visual completa do processo de autofill em até 6 segundos. |
| REQ-004 | Unwanted | Se a chave de licença informada possuir assinatura incompatível com o e-mail ou data de validade expirada, então o sistema deve rejeitar a ativação com mensagem explicativa. |

---

## 5. Orçamentos Não-Funcionais
- **Tempo de Validação Criptográfica:** Menor que 5 milissegundos no client-side.
- **Duração do Showcase Interativo:** Exatamente 6 segundos de animação suave a 60 FPS.
- **Limite de Linhas de Código (Regra #24):** Todos os arquivos de código mantidos abaixo de 600 linhas.

---

## 6. Hotspots Compartilhados
- `core/license-validator.js`
- `tests/core/license-validator.test.js`
- `extension/sidepanel.html`
- `extension/sidepanel.js`
- `site/index.html`

---

## 7. Tarefas (DAG)

## T1 — Motor de Validação Criptográfica de Licença (`core/license-validator.js` e TDD)
- **Requisitos:** REQ-001, REQ-004
- **Agent:** tear-security
- **model:** gemini-2.5-pro
- **effort:** médio
- **tempo:** 20m
- **Depends-on:** nenhum

## T2 — Modal de Ativação de Licença no Sidepanel (`extension/sidepanel.html` e `extension/sidepanel.js`)
- **Requisitos:** REQ-002
- **Agent:** noesis-frontend-maestro
- **model:** gemini-2.5-pro
- **effort:** médio
- **tempo:** 20m
- **Depends-on:** T1

## T3 — Showcase Interativo em Tempo Real no Hero da Landing Page (`site/index.html`)
- **Requisitos:** REQ-003
- **Agent:** noesis-bento-tactile-designer
- **model:** gemini-2.5-pro
- **effort:** alto
- **tempo:** 25m
- **Depends-on:** nenhum

---

## 8. Matriz de Rastreabilidade

| Requisito | Tarefa | Teste |
| :--- | :--- | :--- |
| REQ-001 | T1 | tests/core/license-validator.test.js |
| REQ-002 | T2 | tests/core/license-validator.test.js |
| REQ-003 | T3 | tests/server/feedback-api.test.js |
| REQ-004 | T1 | tests/core/license-validator.test.js |
