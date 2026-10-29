# PLAN-029: Refinamento de Extração Semântica, Datas por Extenso e Resiliência CCHA

- **status:** Em Elaboração
- **rev:** 2227998
- **autor:** Kazuhiro & Tear Maestro
- **data:** 28/10/2026
- **tearform:** respostas/029.md
- **adr:** docs/adr/ADR-037-extracao-semantica-resiliente-e-simplificacao-ccha.md

## Metadados SDD
- **versao_plano:** 1.0.0
- **tipo:** refactor
- **blast_radius:** baixo
- **orcamento_tokens:** 25000

---

## 1. Visão Geral e Justificativa
Durante testes com comprovantes fiscais reais e cupons térmicos (Drogasil, DANFE mercantil de e-commerce e DANFSe de serviços médicos), foram identificadas falhas de interpretação semântica e ruídos que demandavam edição manual e aumentavam risco de glosa:
1. No cupom Drogasil, a data com hífen (`11-09-2026`) foi ignorada pelo regex (que exigia barra ou ponto) e manteve a estimativa provisória da chave SEFAZ (`2026-09-01`), resultando em dia 01 incorreto. Além disso, recibos com datas por extenso (ex: "09 de novembro de 2026") não eram interpretados.
2. No DANFE da Ragassistore, a razão social capturou o texto inteiro do canhoto superior ("RECEBEMOS DE RAGASSISTORE VARIEDADES LTDA OS PRODUTOS...").
3. No mesmo DANFE, o valor total (`R$ 39,87`) não foi lido porque a tabela de impostos quebra cabeçalho e números em linhas distintas sem prefixo `R$`.
4. Os descritivos gerados concatenavam nomes brutos de itens de OCR (`J&J BAB SAB DERMA...`) e número de documento, gerando risco de glosa de despesa médica perante o CCHA.
5. O motivo da necessidade continha texto prolixo e redundante citando CCHA e AGU.

Este plano implementa o refinamento da extração semântica, o módulo desacoplado de normalização de datas (incluindo datas por extenso) e os templates anti-glosa concisos.

---

## 2. Opções Técnicas Avaliadas (Regra Tear #2)

### Opção 1 (RECOMENDADA): Módulo Desacoplado `core/date-normalizer.js` + Regras Declarativas de Layout
- **Descrição:** Criar módulo puro para normalização de datas em PT-BR (numéricas e por extenso), higienizar canhotos de DANFE, processar tabelas multilinhas e adotar descritivos concisos perante o CCHA.
- **Prós:**
  - Zero dependências adicionais (Regra Ponytail #5).
  - Mantém arquivos sob o teto de 700 linhas da Regra Tear #24.
  - Testabilidade unitária isolada de alta performance (< 2ms).
- **Contras:** Requer sincronização com `extension/core/`.

### Opção 2: Heurística Monolítica Inline no `document-parser.js`
- **Descrição:** Adicionar novos blocos de código diretamente no parser existente.
- **Prós:** Não cria arquivo novo.
- **Contras:** Estoura o limite de 600/700 linhas da Regra Tear #24 e aumenta acoplamento.

### Opção 3: Biblioteca Externa de NLP (Chrono-node)
- **Descrição:** Adicionar biblioteca externa de parsing de datas.
- **Prós:** Trata datas relativas.
- **Contras:** Viola a Regra Ponytail (Anti-Bloat), incha a extensão e adiciona latência no browser.

---

## 3. Não-Objetivos / Fora de Escopo
- Não alterar a interface visual nem os tokens Warm Light Craft do sidepanel.
- Não adicionar bibliotecas npm externas ao runtime da extensão.
- Não alterar a estrutura dos 8 campos canônicos do CCHA no contrato de exportação.

---

## 4. Requisitos EARS

| Requisito | Tipo Declarado | Especificação |
| :--- | :--- | :--- |
| REQ-001 | Ubiquitous | O sistema deve normalizar qualquer formato de data válido (numérico ou por extenso em português) para o formato canônico `YYYY-MM-DD`. |
| REQ-002 | Event | Quando um documento contiver uma data expressa textual, essa data deve sobrescrever qualquer estimativa provisória derivada da chave de acesso SEFAZ. |
| REQ-003 | Event | Quando uma linha iniciar com "RECEBEMOS DE ", o parser deve higienizar o texto do canhoto e isolar apenas a razão social do emitente. |
| REQ-004 | State-Driven | Enquanto o documento for uma despesa de farmácia ou saúde, o descritivo deve ser sintetizado como "Aquisição de medicamentos/insumos farmacêuticos recomendado por médico" e o motivo como "Recomendação médica." sem inclusão de número de documento. |
| REQ-005 | Unwanted | Se uma tabela de cálculo do imposto do DANFE quebrar valores em linhas subsequentes sem "R$", o parser deve capturar o valor total da nota sem falhar. |

---

## 5. Orçamentos Não-Funcionais
- **Orçamento de Linhas (Regra #24):**
  - `core/date-normalizer.js`: < 120 linhas.
  - `core/document-parser.js`: < 550 linhas.
- **Tempo de Execução:** Menos de 2ms para normalização de campos.
- **Cobertura de Testes (Regra #3):** 100% de aprovação na suíte de testes TDD com cenários Happy, Edge e Error.

---

## 6. Hotspots Compartilhados
- `core/date-normalizer.js` (novo)
- `core/document-parser.js`
- `extension/core/date-normalizer.js`
- `extension/core/document-parser.js`
- `extension/sidepanel.html`
- `tests/ccha-rules.test.js`

---

## 7. Tarefas (DAG)

## T1 — Módulo Desacoplado de Datas Numéricas e por Extenso (`core/date-normalizer.js`)
- **Requisitos:** REQ-001, REQ-002
- **Agent:** tear-backend
- **model:** inherit
- **effort:** médio
- **tempo:** 15m
- **Depends-on:** nenhum

## T2 — Higienização de Canhotos e Tabelas Multilinhas DANFE (`core/document-parser.js`)
- **Requisitos:** REQ-003, REQ-005
- **Agent:** tear-backend
- **model:** inherit
- **effort:** médio
- **tempo:** 15m
- **Depends-on:** T1

## T3 — Padronização de Descritivos e Motivos Anti-Glosa CCHA (`core/document-parser.js`, `extension/sidepanel.html`)
- **Requisitos:** REQ-004
- **Agent:** tear-backend
- **model:** inherit
- **effort:** baixo
- **tempo:** 10m
- **Depends-on:** T2

## T4 — Suíte TDD Completa e Sincronização da Extensão (`tests/ccha-rules.test.js`)
- **Requisitos:** REQ-001, REQ-002, REQ-003, REQ-004, REQ-005
- **Agent:** tear-qa
- **model:** inherit
- **effort:** médio
- **tempo:** 15m
- **Depends-on:** T3

---

## 8. Matriz de Rastreabilidade

| Requisito | Tarefa | Teste |
| :--- | :--- | :--- |
| REQ-001 | T1, T4 | tests/ccha-rules.test.js |
| REQ-002 | T1, T4 | tests/ccha-rules.test.js |
| REQ-003 | T2, T4 | tests/ccha-rules.test.js |
| REQ-004 | T3, T4 | tests/ccha-rules.test.js |
| REQ-005 | T2, T4 | tests/ccha-rules.test.js |
