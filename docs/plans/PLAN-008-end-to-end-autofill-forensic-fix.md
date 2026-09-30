# PLAN-008: Correção Forense Ponta a Ponta das Entradas e Saídas do Autofill

## Metadados SDD
- **versao_plano:** 1.0.0
- **tipo:** fix
- **blast_radius:** médio
- **orcamento_tokens:** 35000

---

## 1. Visão Geral e Justificativa
Durante testes práticos com o comprovante real de farmácia (`media_1790720725097.pdf`), constatou-se que os dados extraídos falhavam em preencher as informações no Sidepanel e na página de destino:
1. **Número do Documento Ausente:** O Tesseract lê a linha do número da NFC-e com ruído de amassado térmico. A chave de acesso de 44 dígitos contém o número da nota fiscal entre as posições 25 e 33, mas a regex de extração falhava ao encontrar ruídos alfanuméricos (`D7O09)`) e URLs do SEFAZ, deixando o campo vazio.
2. **Seleção de Tipo no Sidebar:** O `<select id="field-tipo-doc">` do Sidepanel exigia correspondência estrita `===`, falhando quando o tipo classificado vinha com pequenas variações textuais.
3. **Colisão de Termos e Sobrescrita no Formulário:** No `extension/content.js`, o termo `'documento'` estava na lista de `cpf` e `cpf_cnpj`, colidindo com `#tipo_documento` e `#numero_documento`. Além disso, a falta de `filledElements = new Set()` permitia que aliases posteriores sobrescrevessem inputs já preenchidos.
4. **Falha de Casamento no `<select>` da Página de Destino:** O formulário da página possui opções como `nota_fiscal` e `recibo`. Ao receber `"Cupom Fiscal (NFC-e / SAT)"`, o `content.js` não encontrava correspondência literal e executava `input.selectedIndex = 0`, zerando o select da página.
5. **Comunicação Instável do Sidepanel:** Ausência de auto-injeção programática do `content.js` em abas abertas antes do reload da extensão.

---

## 2. Opções Técnicas Avaliadas (Regra Tear #2)

### Opção 1 (RECOMENDADA): Pipeline Semântico Local-First com Normalização de Ruído de OCR, Mapeamento Priorizado de Selects e Auto-Injeção Resiliente
- **Descrição:**
  1. No `core/document-parser.js`, implementar `extractDocNumber` com varredura resiliente após termos de chave de acesso/SEFAZ, normalização de ruídos (`D/O -> 0`, `I/l -> 1`, `S -> 5`, `B -> 8`, `Z -> 2`) e extração dos 9 dígitos da NF (posições 25..34 da chave de 44 dígitos), além de fallbacks por códigos operacionais (`OP:`, `VD:`, `CX:`).
  2. Higienizar o descritivo para remover cabeçalhos de tabela fiscal (`Cód`, `Descrição`, `Qtd`, `Vl Unit`, `Vl Total`) e preservar o nome real do item/medicamento adquirido (`PANT SEC 5 1 UNID`).
  3. No `extension/content.js`, criar `matchSemanticSelectOption` com grupos semânticos ordenados por prioridade (Cupom/NFC-e -> `nota_fiscal` / `recibo`), remover `'documento'` isolado de `cpf_cnpj` e controlar `filledElements = new Set()`.
  4. No `extension/sidepanel.js`, flexibilizar seleção do `fTipoDoc`, refinar busca de aba ativa e auto-injetar `content.js` via `chrome.scripting.executeScript` se a conexão falhar.
- **Prós:** Resolve 100% dos 5 gargalos identificados, mantém a privacidade estrita (Zero Retenção) e assegura que nenhum dado real seja perdido.
- **Contras:** Requer sincronização rigorosa entre `core/` e `extension/core/`.

### Opção 2: Ajuste Específico Apenas para os Campos do Demo-Portal
- **Descrição:** Hardcodar seletores pontuais no `content.js` para o formulário de simulação.
- **Prós:** Mudança pequena.
- **Contras:** Quebra no portal oficial CCHA e em formulários governamentais com IDs diferentes.

### Opção 3: Parsing via LLM em Nuvem
- **Descrição:** Chamar modelo em nuvem para reconciliar os campos.
- **Prós:** Não exige heurísticas locais.
- **Contras:** Viola a premissa de Zero Retenção e privacidade de dados fiscais/saúde.

---

## 3. Não-Objetivos / Fora de Escopo
- Não persistir informações fiscais ou imagens em disco permanente.
- Não alterar os 8 campos focados da interface do Sidepanel.
- Não adicionar bibliotecas pesadas de terceiros na extensão.

---

## 4. Requisitos EARS

| Requisito | Tipo Declarado | Especificação |
| :--- | :--- | :--- |
| REQ-001 | State-driven | Enquanto o texto do documento contiver menção a chave de acesso ou consulta SEFAZ com caracteres alfanuméricos com ruído de OCR, o parser deve normalizar os caracteres óticos e extrair os 9 dígitos do número da nota fiscal. |
| REQ-002 | Event | Quando o classificador identificar um documento de compra em farmácia ou cupom fiscal, o parser deve higienizar o descritivo removendo cabeçalhos de tabela fiscal e mantendo a identificação concisa do item. |
| REQ-003 | Ubiquitous | O sistema deve impedir que o termo 'documento' em identificadores de CPF/CNPJ colida com elementos de tipo de documento ou número de documento. |
| REQ-004 | Event | Quando o autofill preencher um elemento de formulário na página de destino, esse elemento deve ser registrado em um conjunto de elementos preenchidos para prevenir sobrescrita por aliases posteriores. |
| REQ-005 | State-driven | Enquanto o elemento de destino for um `<select>`, o content script deve aplicar correspondência semântica priorizada entre o tipo do documento e as opções disponíveis, nunca resetando para `selectedIndex = 0` em caso de incompatibilidade parcial. |
| REQ-006 | Event | Quando o Sidepanel tentar enviar uma mensagem para a aba ativa e receber erro de receptor não existente, deve auto-injetar programaticamente o content script e reenviar o comando de preenchimento. |

---

## 5. Orçamentos Não-Funcionais
- **Tempo de Execução do Autofill:** < 50ms na página de destino.
- **Cobertura de Testes TDD:** 80%+ com 3 cenários por teste (Happy Path, Edge Case, Error Path).
- **Teto de Linhas de Código:** Menos de 700 linhas por arquivo de código (Regra #24).
- **Zero Retenção de Dados:** Operação puramente em memória efêmera local.

---

## 6. Hotspots Compartilhados
- `core/document-parser.js`
- `extension/core/document-parser.js`
- `extension/content.js`
- `extension/sidepanel.js`
- `tests/content-engine.test.js`
- `tests/document-parser.test.js`

---

## 7. Tarefas (DAG)

## T1 — Extração Resiliente de Número de Documento e Limpeza de Descritivo (`core/document-parser.js`)
- **Requisitos:** REQ-001, REQ-002
- **Agent:** tear-backend
- **model:** gemini-2.5-pro
- **effort:** médio
- **tempo:** 20m
- **Depends-on:** nenhum

## T2 — Motor Semântico de Selects, Eliminação de Colisões e Set de Elementos Preenchidos (`extension/content.js`)
- **Requisitos:** REQ-003, REQ-004, REQ-005
- **Agent:** tear-frontend
- **model:** gemini-2.5-pro
- **effort:** médio
- **tempo:** 25m
- **Depends-on:** T1

## T3 — Resiliência de Seleção e Auto-Injeção no Sidepanel (`extension/sidepanel.js`)
- **Requisitos:** REQ-006
- **Agent:** tear-frontend
- **model:** gemini-2.5-pro
- **effort:** baixo
- **tempo:** 15m
- **Depends-on:** T2

## T4 — Suíte de Testes Ponta a Ponta com Cupom Real da Farmácia (`tests/autofill-forensic.test.js`)
- **Requisitos:** REQ-001, REQ-002, REQ-003, REQ-004, REQ-005
- **Agent:** tear-qa
- **model:** gemini-2.5-pro
- **effort:** médio
- **tempo:** 20m
- **Depends-on:** T3

---

## 8. Matriz de Rastreabilidade

| Requisito | Tarefa | Teste |
| :--- | :--- | :--- |
| REQ-001 | T1 | tests/document-parser.test.js |
| REQ-002 | T1 | tests/document-parser.test.js |
| REQ-003 | T2 | tests/content-engine.test.js |
| REQ-004 | T2 | tests/content-engine.test.js |
| REQ-005 | T2 | tests/content-engine.test.js |
| REQ-006 | T3 | tests/sidepanel-payload.test.js |
