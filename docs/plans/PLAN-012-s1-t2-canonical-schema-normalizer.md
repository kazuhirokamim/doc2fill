# PLAN-012: S1-T2 — Normalizador Canônico de Esquemas (`core/document-parser.js`)

## Metadados SDD
- **versao_plano:** 1.0.0
- **tipo:** feature
- **blast_radius:** baixo
- **orcamento_tokens:** 25000

---

## 1. Visão Geral e Justificativa
O pipeline de extração do **doc2fill** consome documentos fiscais de múltiplas origens (PDFs nativos via operadores Tj/TJ, imagens via Tesseract local, VLM multimodal via Few-Shot e Chaves SEFAZ de 44 dígitos). Cada fonte possui graus distintos de completude e formatos de strings. Para alimentar de forma infalível as próximas etapas do produto (Split-View S2-T1 e Injetor Reativo S2-T3 no portal CCHA), é indispensável um **Normalizador Canônico** que receba qualquer dicionário bruto e produza deterministicamente uma estrutura estrita dos **8 campos canônicos**: `tipo_documento`, `cpf_cnpj`, `fornecedor`, `numero_documento`, `data`, `valor`, `descritivo` e `motivo`.

---

## 2. Opções Técnicas Avaliadas (Regra Tear #2)

### Opção 1: Sanitização Dispersa e Ad-hoc nos Consumidores
- **Descrição:** Cada componente (Sidepanel, Content Script, Simulador) limpa e normaliza os campos por conta própria quando necessário.
- **Prós:** Nenhuma modificação no módulo central `core/document-parser.js`.
- **Contras:** Código duplicado, alto risco de inconsistência, falhas em formulários reativos do CCHA quando campos chegam nulos ou fora do padrão.

### Opção 2: Validador Bloqueante com Erro (Fail-Fast)
- **Descrição:** Lançar exceções caso algum dos 8 campos canônicos não esteja perfeitamente preenchido.
- **Prós:** Validação estrita.
- **Contras:** Destrói a experiência do usuário diante de notas fiscais rasuradas ou OCR parcial; impede o preenchimento manual corretivo no Sidepanel.

### Opção 3 (RECOMENDADA): Normalizador Canônico Funcional Puro com Defaults Seguros
- **Descrição:** Implementar `normalizeCanonicalDocumentFields(rawFields)` em `core/document-parser.js`, uma função pura e determinística que garante que todos os 8 campos canônicos existam como strings higienizadas, preserva zeros à esquerda em CPF/CNPJ, normaliza valores monetários e datas, converte ausentes em `""` (zero `undefined`/`null`) e mantém compatibilidade com propriedades auxiliares.
- **Prós:** 100% determinístico, testável via TDD em milissegundos, desacoplado de frameworks e garante previsibilidade total para as Sprints 2 e 3.
- **Contras:** Requer mapeamento cuidadoso de aliases antigos (`descricao` -> `descritivo`, `razao` -> `fornecedor`).

---

## 3. Não-Objetivos / Fora de Escopo
- Não alterar a lógica de classificação de documentos em `core/classifier.js`.
- Não alterar os IDs de inputs do formulário do CCHA no Sidepanel.
- Não introduzir validações assíncronas ou chamadas a APIs externas.

---

## 4. Requisitos EARS

| Requisito | Tipo Declarado | Especificação |
| :--- | :--- | :--- |
| REQ-001 | Ubiquitous | O sistema deve normalizar qualquer saída de extração para exatamente os 8 campos canônicos: tipo_documento, cpf_cnpj, fornecedor, numero_documento, data, valor, descritivo e motivo. |
| REQ-002 | Ubiquitous | O sistema deve garantir que nenhum dos 8 campos canônicos retorne null ou undefined, utilizando string vazia "" como fallback seguro. |
| REQ-003 | State-driven | Enquanto um CPF de 11 dígitos ou CNPJ de 14 dígitos for fornecido com numerais brutos, o sistema deve preservar zeros à esquerda e aplicar a formatação oficial. |
| REQ-004 | State-driven | Enquanto um valor monetário for fornecido em formato misto com símbolos de moeda ou separadores, o sistema deve normalizar para formato padrão brasileiro. |
| REQ-005 | Ubiquitous | O sistema deve preservar propriedades de retrocompatibilidade como cnpj, cpf, descricao, processo e siape sem regressões. |

---

## 5. Orçamentos Não-Funcionais
- **Limite de Linhas por Arquivo (Regra #24):** `core/document-parser.js` deve permanecer abaixo de 550 linhas (teto rígido: 700 linhas).
- **Tempo de Execução:** Normalização de esquema em menos de 1 milissegundo por documento (O(1)).
- **Cobertura de Testes (Regra #3):** 100% de cobertura nos 3 cenários TDD (Happy Path, Edge Cases com zeros à esquerda, Error Path com nulos).

---

## 6. Hotspots Compartilhados
- `core/document-parser.js`
- `tests/core/document-parser.test.js`
- `extension/sidepanel.js`

---

## 7. Tarefas (DAG)

## T1 — Suíte TDD dos 3 Cenários do Normalizador Canônico (`tests/core/document-parser.test.js`)
- **Requisitos:** REQ-001, REQ-002, REQ-003, REQ-004, REQ-005
- **Agent:** tear-qa
- **model:** gemini-2.5-pro
- **effort:** baixo
- **tempo:** 15m
- **Depends-on:** nenhum

## T2 — Implementação de `normalizeCanonicalDocumentFields` (`core/document-parser.js`)
- **Requisitos:** REQ-001, REQ-002, REQ-003, REQ-004, REQ-005
- **Agent:** noesis-domain-core
- **model:** gemini-2.5-pro
- **effort:** médio
- **tempo:** 25m
- **Depends-on:** T1

## T3 — Integração com `parseDocumentFields` e Validação das 4 Lanes Tear
- **Requisitos:** REQ-001, REQ-005
- **Agent:** tear-code-reviewer
- **model:** gemini-2.5-pro
- **effort:** baixo
- **tempo:** 15m
- **Depends-on:** T2

---

## 8. Matriz de Rastreabilidade

| Requisito | Tarefa | Teste |
| :--- | :--- | :--- |
| REQ-001 | T2 | tests/core/document-parser.test.js |
| REQ-002 | T2 | tests/core/document-parser.test.js |
| REQ-003 | T2 | tests/core/document-parser.test.js |
| REQ-004 | T2 | tests/core/document-parser.test.js |
| REQ-005 | T3 | tests/core/document-parser.test.js |
