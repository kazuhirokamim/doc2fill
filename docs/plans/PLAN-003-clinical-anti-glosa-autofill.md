# PLAN-003: Motor Ontológico de Tradução Clínica Anti-Glosa, Seleção de Beneficiário e Injeção de Anexos

## Metadados SDD
- **versao_plano:** 1.0.0
- **tipo:** feature
- **blast_radius:** médio
- **orcamento_tokens:** 40000

---

## 1. Visão Geral e Problema
O `doc2fill` automatiza pedidos de reembolso de despesas de saúde perante operadoras, seguradoras e convênios do setor público. O principal ponto de fricção dos usuários é a recusa (glosa) por enquadramento incorreto de procedimentos como puramente estéticos, além da perda de tempo anexando manualmente arquivos e preenchendo seletores de titular/dependente.

O objetivo desta feature é fornecer um motor determinístico local (R$ 0,00 de custo) para tradução de procedimentos leigos em termos técnico-científicos da Tabela TUSS/ANS, harmonia entre o motivo da necessidade e a descrição, identificação do beneficiário e upload direto de arquivos via `DataTransfer`.

---

## 2. Não-Objetivos / Fora de Escopo
- Não é objetivo persistir dados clínicos em banco de dados na nuvem (mantida a política estrita de Zero Retenção).
- Não é objetivo realizar chamadas a APIs pagas de IA generativa (o motor primário é 100% local e gratuito).
- Não é objetivo fraudar auditorias ou criar recibos fictícios; o sistema orienta e padroniza a terminologia técnica real do procedimento realizado.
- Não é objetivo desenvolver aplicativo nativo compilado para iOS/Android nesta fase (o suporte mobile é provido via PWA responsivo).

---

## 3. Requisitos EARS

| Requisito | Tipo Declarado | Especificação |
| :--- | :--- | :--- |
| REQ-001 | Ubiquitous | O sistema deve traduzir descrições leigas e estéticas para terminologia técnico-funcional e reparadora alinhada à Tabela TUSS com classificação entre cirúrgico e não cirúrgico. |
| REQ-002 | Event | Quando o usuário carregar um documento no Side Panel, o sistema deve classificar o tipo documental entre Nota Fiscal, Recibo Profissional, Boleto e Guia Médica. |
| REQ-003 | Ubiquitous | O sistema deve identificar e preencher seletores de Titular ou Dependente no formulário do portal governamental ou convênio. |
| REQ-004 | Event | Quando o usuário disparar o autofill, o sistema deve injetar os dados do arquivo selecionado diretamente no campo de anexo da página de destino. |

---

## 4. Orçamentos Não-Funcionais
- **Latência de Tradução (p95):** < 10ms (processamento determinístico em memória).
- **Custo Operacional por Requisição:** R$ 0,00 (sem consumo de tokens ou servidores pagos).
- **Queries de Banco de Dados:** 0 (zero persistência em disco, 100% volátil).
- **Tamanho Adicional do Pacote (Bundle):** < 45 KB adicionados ao core da extensão.

---

## 5. Hotspots Compartilhados
- `core/matcher.js`
- `extension/content.js`
- `extension/sidepanel.js`
- `extension/sidepanel.html`
- `demo-portal/index.html`

---

## 6. Tarefas (DAG)

## T1 — Implementar Motor Clínico Ontológico
- **Requisitos:** REQ-001
- **Agent:** tear-backend
- **model:** gemini-2.5-pro
- **effort:** medio
- **tempo:** 20m
- **Depends-on:** nenhum

## T2 — Implementar Classificador de Tipos de Documento
- **Requisitos:** REQ-002
- **Agent:** tear-backend
- **model:** gemini-2.5-pro
- **effort:** baixo
- **tempo:** 15m
- **Depends-on:** nenhum

## T3 — Mapeamento e Preenchimento de Beneficiário (Titular/Dependente)
- **Requisitos:** REQ-003
- **Agent:** tear-frontend
- **model:** gemini-2.5-pro
- **effort:** baixo
- **tempo:** 15m
- **Depends-on:** T1

## T4 — Injeção de Arquivos via DataTransfer e Interface do Sidepanel
- **Requisitos:** REQ-004
- **Agent:** tear-frontend
- **model:** gemini-2.5-pro
- **effort:** medio
- **tempo:** 25m
- **Depends-on:** T2, T3

---

## 7. Matriz de Rastreabilidade

| Requisito | Tarefa | Teste |
| :--- | :--- | :--- |
| REQ-001 | T1 | tests/core/clinical-translator.test.js |
| REQ-002 | T2 | tests/core/classifier.test.js |
| REQ-003 | T3 | tests/core/matcher.test.js |
| REQ-004 | T4 | tests/extension/content.test.js |
