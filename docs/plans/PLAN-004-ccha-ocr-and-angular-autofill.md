# PLAN-004: Motor de OCR Server-Side para Fotos Mobile e Adaptador Angular Reactive Forms para CCHA

## Metadados SDD
- **versao_plano:** 1.0.0
- **tipo:** feature
- **blast_radius:** médio
- **orcamento_tokens:** 45000

---

## 1. Visão Geral e Causa Raiz do Incidente
No teste de campo com o usuário e o Lucas no portal do CCHA (Conselho Curador dos Honorários Advocatícios), identificaram-se duas causas raízes críticas:
1. **Ausência de Visão Computacional / OCR:** Ao tirar a foto de documentos pelo celular no Mobile PWA, a imagem binária (JPEG/PNG) era empacotada em base64, mas nenhum motor de OCR a processava. O `scanner.js` transmitia apenas dados mockados estáticos.
2. **Incompatibilidade com Angular Ivy / Reactive Forms:** O portal CCHA utiliza Angular 16+ com Reactive Forms (`[formControlName]`), `ng-select` e `mat-select`. O `content.js` procurava apenas `<input>` e `<label for>` clássicos, sem acionar o ciclo de vida reativo e sem conseguir associar campos Angular.

---

## 2. Não-Objetivos / Fora de Escopo
- Não persistir imagens ou documentos em disco ou banco de dados (manter a política de Zero Retenção per ADR-001).
- Não depender de serviços externos em nuvem que cobrem por requisição ou violem a privacidade de dados de procuradores federais.
- Não manter dados clínicos/médicos no escopo do CCHA (foco exclusivo em Procuradores, AGU, PGFN, PGF, PGBC).

---

## 3. Requisitos EARS

| Requisito | Tipo Declarado | Especificação |
| :--- | :--- | :--- |
| REQ-001 | Event | Quando o usuário carregar uma imagem ou requisição de OCR, o sistema deve executar a extração textual via Tesseract.js em memória RAM sem persistir dados em disco. |
| REQ-002 | Ubiquitous | O sistema deve extrair campos fiscais e jurídicos CCHA a partir do texto lido pelo OCR. |
| REQ-003 | Ubiquitous | O sistema deve localizar elementos de formulário Angular por meio de formControlName, ng-reflect-name e mat-form-field. |
| REQ-004 | Event | Quando o autofill for acionado, o sistema deve preencher os inputs reativos e disparar eventos InputEvent e change para validação pelo Angular. |
| REQ-005 | Event | Quando a câmera mobile capturar uma foto, o sistema deve transmitir a imagem ao servidor e obter os campos estruturados por OCR. |

---

## 4. Orçamentos Não-Funcionais
- **Tempo de OCR Local (p95):** < 3.5s no servidor Node.js local.
- **Retenção de Dados:** 0 bytes gravados em disco permanente (tudo volátil na RAM).
- **Cobertura de Testes:** 80%+ com 3 cenários por teste (Happy Path, Edge Case, Error Path).

---

## 5. Hotspots Compartilhados
- `server/demo-server.js`
- `core/ocr-engine.js`
- `mobile-pwa/scanner.js`
- `extension/content.js`
- `extension/sidepanel.js`

---

## 6. Tarefas (DAG)

## T1 — Implementar Motor de OCR Local e Endpoint no Servidor
- **Requisitos:** REQ-001, REQ-002
- **Agent:** tear-backend
- **model:** gemini-2.5-pro
- **effort:** medio
- **tempo:** 25m
- **Depends-on:** nenhum

## T2 — Implementar Adaptador Angular Reactive Forms e ng-select
- **Requisitos:** REQ-003, REQ-004
- **Agent:** tear-frontend
- **model:** gemini-2.5-pro
- **effort:** medio
- **tempo:** 25m
- **Depends-on:** nenhum

## T3 — Integrar Mobile PWA com OCR em Tempo Real
- **Requisitos:** REQ-005
- **Agent:** tear-frontend
- **model:** gemini-2.5-pro
- **effort:** baixo
- **tempo:** 15m
- **Depends-on:** T1

## T4 — Suíte de Testes Automatizados TDD nos 3 Cenários
- **Requisitos:** REQ-001, REQ-002, REQ-003, REQ-004, REQ-005
- **Agent:** tear-qa
- **model:** gemini-2.5-pro
- **effort:** medio
- **tempo:** 20m
- **Depends-on:** T1, T2, T3

---

## 7. Matriz de Rastreabilidade

| Requisito | Tarefa | Teste |
| :--- | :--- | :--- |
| REQ-001 | T1 | tests/core/ocr-engine.test.js |
| REQ-002 | T1 | tests/core/ocr-engine.test.js |
| REQ-003 | T2 | tests/extension/angular-adapter.test.js |
| REQ-004 | T2 | tests/extension/angular-adapter.test.js |
| REQ-005 | T3 | tests/mobile/scanner-ocr.test.js |
