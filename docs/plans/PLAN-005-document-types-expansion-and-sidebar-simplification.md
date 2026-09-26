# PLAN-005: Expansão de Tipos Documentais, Extrator de 8 Campos Focados e Simplificação da Sidebar CCHA

## Metadados SDD
- **versao_plano:** 1.0.0
- **tipo:** feature
- **blast_radius:** médio
- **orcamento_tokens:** 45000

---

## 1. Visão Geral e Justificativa
O doc2fill atualmente suporta apenas 4 tipos documentais no classificador e possui campos dispersos e em excesso na sidebar (processo judicial, matrícula SIAPE, carreira, banco, agência, conta, etc.), o que polui a visão do usuário e desacelera os procuradores.

Além disso, faltam funcionalidades essenciais para o fluxo real do CCHA:
1. **Tipos Documentais Ausentes:** Cupom Fiscal (NFC-e/SAT), Fatura, Comprovante de Pagamento (PIX/TED), Declaração, além de ampliações em Notas Fiscais e Recibos.
2. **Campos Faltantes:** Identificação precisa do Número do Documento (Nº NF, Recibo nº, Cupom nº, etc.) e Fornecedor.
3. **Síntese Inteligente:** Geração determinística e automatizada de "Descritivo Resumido" e "Motivo da Necessidade" para conferência antes do envio ao CCHA.
4. **Sidebar Poluída:** A sidebar precisa ser restrita estritamente aos 8 campos essenciais solicitados pelo usuário ("apenas esses dados preenchidos, nada alem deles, vamos focar com apenas o necessario").
5. **Autofill no CCHA:** Garantir que o preenchimento automático direcione esses 8 campos para as respectivas caixas de texto no site do CCHA com disparos de eventos reativos do Angular.

---

## 2. Opções Técnicas Avaliadas (Regra Tear #2)

### Opção A: Parser Monolítico Único com Regex Direto no Sidepanel
- **Descrição:** Adicionar regexes diretamente dentro de `sidepanel.js` sem criar abstrações ou módulos específicos para cada tipo e campo.
- **Prós:** Modificações rápidas e localizadas.
- **Contras:** Código acoplado e frágil; dificulta testes TDD unitários; não reutilizável entre extensão, mobile PWA e servidor; risco de regressão no autofill.

### Opção B (RECOMENDADA): Arquitetura Modular de Extração, Síntese Ontológica e Sidebar Focada
- **Descrição:**
  1. Evoluir `core/classifier.js` com taxonomia completa de 8+ tipos documentais.
  2. Aprimorar `core/document-parser.js` com extratores dedicados para os 8 campos fundamentais (`tipo_documento`, `cpf_cnpj`, `fornecedor`, `numero_documento`, `data`, `valor`, `descritivo`, `motivo`).
  3. Integrar motor semântico para sintetizar descritivo conciso e motivo formal para o CCHA com R$ 0,00 de custo e Zero Retenção.
  4. Redesenhar `extension/sidepanel.html` e `sidepanel.js` com layout Bento limpo contendo estritamente os 8 campos.
  5. Atualizar mapeamento do `extension/content.js` e `core/matcher.js` para preenchimento ágil no CCHA.
- **Prós:** Alta fidelidade, 100% testável via TDD, zero dependências externas ou custos de tokens, modular e aderente ao padrão Tear.
- **Contras:** Requer atualização das suítes de teste de parsers e sidepanel.

### Opção C: Extração e Síntese via LLM Externa em Nuvem
- **Descrição:** Enviar o texto extraído para uma API de LLM comercial externa gerar os resumos e o JSON.
- **Prós:** Flexibilidade com linguagem natural aberta.
- **Contras:** Viola a premissa fundamental de Zero Retenção e LGPD (dados de procuradores e documentos fiscais trafegando para nuvens terceiras); custo recorrente em dólares por documento; latência de rede; falhas offline.

---

## 3. Não-Objetivos / Fora de Escopo
- Não persistir documentos ou campos fiscais em disco permanente (manter Zero Retenção per ADR-001).
- Não manter campos obsoletos ou não solicitados na sidebar (como dados bancários e matrícula funcional na tela principal).
- Não utilizar APIs de LLM que violem a privacidade de dados do CCHA.

---

## 4. Requisitos EARS

| Requisito | Tipo Declarado | Especificação |
| :--- | :--- | :--- |
| REQ-001 | Ubiquitous | O sistema deve classificar documentos em Nota Fiscal, Cupom Fiscal, Recibo, Boleto, Fatura, Comprovante de Pagamento, Guia Médica, Declaração ou Outros. |
| REQ-002 | Ubiquitous | O sistema deve identificar e extrair CPF/CNPJ, Nome do Fornecedor, Tipo, Número do Documento, Data e Valor (R$). |
| REQ-003 | Ubiquitous | O sistema deve gerar o Descritivo Resumido e o Motivo da Necessidade contextualizados para o CCHA. |
| REQ-004 | Event | Quando o usuário carregar qualquer documento, o sistema deve preencher na sidebar exclusivamente os 8 campos essenciais. |
| REQ-005 | Event | Quando o usuário acionar o botão de preenchimento automático, o sistema deve injetar os 8 campos nos respectivos inputs do formulário do CCHA na aba ativa. |

---

## 5. Orçamentos Não-Funcionais
- **Tempo de Extração e Síntese:** < 100ms em execução local no cliente.
- **Campos na Sidebar:** Exatamente 8 campos (zero excesso).
- **Cobertura de Testes:** 80%+ com 3 cenários por teste (Happy Path, Edge Case, Error Path).

---

## 6. Hotspots Compartilhados
- `core/classifier.js`
- `core/document-parser.js`
- `core/matcher.js`
- `extension/sidepanel.html`
- `extension/sidepanel.js`
- `extension/content.js`
- `demo-portal/index.html`

---

## 7. Tarefas (DAG)

## T1 — Expansão do Classificador de Documentos (`core/classifier.js`)
- **Requisitos:** REQ-001
- **Agent:** tear-backend
- **model:** gemini-2.5-pro
- **effort:** medio
- **tempo:** 20m
- **Depends-on:** nenhum

## T2 — Extrator de Dados e Síntese de Descritivo e Motivo (`core/document-parser.js`)
- **Requisitos:** REQ-002, REQ-003
- **Agent:** tear-backend
- **model:** gemini-2.5-pro
- **effort:** medio
- **tempo:** 30m
- **Depends-on:** T1

## T3 — Simplificação da Interface da Sidebar para os 8 Campos (`extension/sidepanel.html`, `sidepanel.js`)
- **Requisitos:** REQ-004
- **Agent:** tear-frontend
- **model:** gemini-2.5-pro
- **effort:** medio
- **tempo:** 25m
- **Depends-on:** T2

## T4 — Aprimoramento do Mapeador de Autofill para CCHA (`extension/content.js`, `core/matcher.js`)
- **Requisitos:** REQ-005
- **Agent:** tear-frontend
- **model:** gemini-2.5-pro
- **effort:** medio
- **tempo:** 20m
- **Depends-on:** T2

## T5 — Suíte Completa de Testes TDD (3 Cenários por Teste)
- **Requisitos:** REQ-001, REQ-002, REQ-003, REQ-004, REQ-005
- **Agent:** tear-qa
- **model:** gemini-2.5-pro
- **effort:** medio
- **tempo:** 25m
- **Depends-on:** T1, T2, T3, T4

---

## 8. Matriz de Rastreabilidade

| Requisito | Tarefa | Teste |
| :--- | :--- | :--- |
| REQ-001 | T1 | tests/core/classifier.test.js |
| REQ-002 | T2 | tests/core/document-parser.test.js |
| REQ-003 | T2 | tests/core/document-parser.test.js |
| REQ-004 | T3 | tests/extension/sidepanel.test.js |
| REQ-005 | T4 | tests/extension/content.test.js |
