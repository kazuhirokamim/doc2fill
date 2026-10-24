# PLAN-028: Motor de Varredura Universal de Documentos & Resiliência OCR no Navegador

- **status:** Ratificado
- **rev:** a7b8c9d
- **autor:** Kazuhiro & Tear Maestro
- **data:** 24/10/2026
- **tearform:** respostas/028.md
- **adr:** docs/adr/ADR-036-universal-document-scanning-engine.md

## Metadados SDD
- **versao_plano:** 1.0.0
- **tipo:** fix
- **blast_radius:** baixo
- **orcamento_tokens:** 25000

---

## 1. Visão Geral e Justificativa
O usuário submeteu um cupom fiscal real impresso por ECF (`media_1792856200625_eb0ece69.png`) para leitura automática pelo painel lateral do doc2fill. A extração na extensão Chrome falhou em capturar o valor (`R$ 288,90`), mantendo o campo zerado (`R$ 0,00`), enquanto os campos `CNPJ`, `Nome` e `Data` estavam fisicamente vazios na impressão do cupom (template de teste/homologação com `/ / : :` e `CNPJ:` sem números).

Este plano implementa o Motor de Varredura Universal para garantir que, além de destravar este recibo, a extensão processe com fidelidade notas fiscais (NFS-e e DANFE), boletos, faturas de concessionárias, comprovantes PIX e recibos médicos, preservando rigorosamente intactos os 8 campos canônicos do formulário CCHA.

---

## 2. Opções Técnicas Avaliadas (Regra Tear #2)

### Opção 1: Hotfix Mínimo de CSP
- **Descrição:** Adicionar CSP no manifesto e desativar Blob Worker.
- **Prós:** Modificação extremamente curta.
- **Contras:** Não resolve falhas em faturas de concessionárias, cupons térmicos com códigos fiscais ou layouts heterogêneos.

### Opção 2 (RECOMENDADA): Motor de Varredura Universal com Pipeline Óptico Dual, CSP Blindado e Heurísticas Expandidas
- **Descrição:** Blindar o CSP com `'wasm-unsafe-eval'`, instanciar workers sem Blob URL, aplicar estiramento de contraste preservativo sem destruição de fontes pontilhadas e enriquecer as expressões regulares para cupons, faturas, boletos e PIX.
- **Prós:**
  - Resolução definitiva de leitura no Chrome sem dependência de terminal ativo.
  - Suporte completo aos 8 tipos documentais.
  - Zero alteração no contrato dos 8 campos canônicos.
  - 100% de cobertura com testes automatizados verdes.
- **Contras:** Requer sincronização cuidadosa entre `core/` e `extension/core/`.

### Opção 3: OCR Exclusivo via Nuvem
- **Descrição:** Redirecionar todo o OCR para APIs externas.
- **Prós:** Dispensa Tesseract local.
- **Contras:** Viola o princípio de Zero Retenção e LGPD local-first, além de falhar em redes sem acesso externo.

---

## 3. Não-Objetivos / Fora de Escopo
- Não alterar os 8 campos canônicos do formulário CCHA (`tipo_documento`, `cpf_cnpj`, `fornecedor`, `numero_documento`, `data`, `valor`, `descritivo`, `motivo`).
- Não alterar a interface visual do design system Warm Light Craft.
- Não introduzir dependências externas de pacotes no runtime da extensão.

---

## 4. Requisitos EARS

| Requisito | Tipo Declarado | Especificação |
| :--- | :--- | :--- |
| REQ-001 | Ubiquitous | O sistema deve executar o OCR de imagens diretamente no navegador respeitando o CSP Manifest V3 com `'wasm-unsafe-eval'`. |
| REQ-002 | Event | Quando uma imagem contiver códigos tributários intermediários (T04, F1), o extrator de itens deve capturar as linhas de produtos sem descartar os valores. |
| REQ-003 | State-Driven | Enquanto o documento possuir campos fisicamente vazios na impressão, o extrator deve manter os respectivos campos canônicos vazios sem alucinar valores. |
| REQ-004 | Event | Quando o documento for uma fatura de concessionária ou comprovante bancário, o parser deve identificar o fornecedor e a data de vencimento/transação. |
| REQ-005 | Unwanted | Se o documento estiver ilegível ou vazio, o sistema deve retornar a estrutura canônica segura sem disparar exceções não tratadas. |

---

## 5. Orçamentos Não-Funcionais
- **Orçamento de Linhas (Regra #24):** Máximo de 700 linhas por arquivo de produção.
- **Tempo de Execução:** Processamento OCR local em menos de 2.500ms no navegador.
- **Cobertura de Testes (Regra #3):** 100% dos testes unitários e de integração passando verdes.

---

## 6. Hotspots Compartilhados
- `core/browser-ocr.js`
- `core/document-parser.js`
- `core/item-extractor.js`
- `extension/manifest.json`
- `extension/sidepanel.html`

---

## 7. Tarefas (DAG)

## T1 — Blindagem de CSP e Runtime no Manifest V3
- **Requisitos:** REQ-001
- **Agent:** tear-security
- **model:** inherit
- **effort:** baixo
- **tempo:** 10m
- **Depends-on:** nenhum

## T2 — Pré-processamento e Worker Preservativo (`core/browser-ocr.js`)
- **Requisitos:** REQ-001, REQ-005
- **Agent:** tear-backend
- **model:** inherit
- **effort:** médio
- **tempo:** 15m
- **Depends-on:** T1

## T3 — Expansão de Heurísticas de Cupons e Faturas (`core/document-parser.js`, `core/item-extractor.js`)
- **Requisitos:** REQ-002, REQ-003, REQ-004
- **Agent:** tear-backend
- **model:** inherit
- **effort:** médio
- **tempo:** 20m
- **Depends-on:** T2

## T4 — Suíte TDD Universal e Verificação Final (`tests/core/universal-document-scanner.test.js`)
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
| REQ-001 | T1, T2 | tests/core/universal-document-scanner.test.js |
| REQ-002 | T3, T4 | tests/core/universal-document-scanner.test.js |
| REQ-003 | T3, T4 | tests/core/universal-document-scanner.test.js |
| REQ-004 | T3, T4 | tests/core/universal-document-scanner.test.js |
| REQ-005 | T2, T4 | tests/core/universal-document-scanner.test.js |

