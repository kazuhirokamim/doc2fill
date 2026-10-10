# PLAN-013: S1-T4 — Tratamento de Exceções, Sanitização e Blindagem Defensiva

## Metadados SDD
- **versao_plano:** 1.0.0
- **tipo:** feature
- **blast_radius:** baixo
- **orcamento_tokens:** 25000

---

## 1. Visão Geral e Justificativa
Em cenários reais de uso, operadores submetem arquivos atípicos como PDFs protegidos por senha de abertura (`/Encrypt`), imagens com ruído óptico extremo ou 100% pretas/brancas, arquivos com 0 bytes ou buffers corrompidos. Para assegurar confiabilidade de nível corporativo e prevenir congelamentos na interface do Sidepanel ou exceções não tratadas no console do navegador, é necessário implementar detecção preventiva, sanitização de entrada e cards amigáveis de alerta defensivo que liberam o preenchimento manual imediato.

---

## 2. Opções Técnicas Avaliadas (Regra Tear #2)

### Opção 1: Tratamento Reativo com Try/Catch Genérico Apenas no Topo
- **Descrição:** Envolver apenas o handler do botão de upload em try/catch genérico.
- **Prós:** Poucas linhas de código.
- **Contras:** Não identifica a causa raiz (ex: se é senha de PDF ou falta de contraste em OCR); pode mascarar erros graves de memória e mantém logs poluídos no console.

### Opção 2: Rejeição Rígida Prévia com Múltiplas Libs Externas
- **Descrição:** Importar bibliotecas pesadas de validação de integridade de arquivos e verificação de senha.
- **Prós:** Validação exaustiva.
- **Contras:** Viola o limite de tamanho do bundle da extensão; aumenta a latência de inicialização e o risco de incompatibilidade com CSP do Manifest V3.

### Opção 3 (RECOMENDADA): Sanitização Heurística em Memória com Detecção de Criptografia & Contraste
- **Descrição:** Implementar verificação leve em buffer: (a) detecção do operador `/Encrypt` em PDFs para sinalizar documento protegido; (b) cálculo de contraste e variância em buffers de imagem para abortar Tesseract em imagens sólidas/ruído; (c) emissão de card de alerta defensivo no Sidepanel com restauração imediata do estado da dropzone e foco nos 8 campos canônicos.
- **Prós:** Zero dependências externas adicionais, execução em < 10ms, feedback humanizado para o operador e 100% de blindagem contra crashes.
- **Contras:** PDFs protegidos por senha exigem que o usuário envie uma versão descriptografada ou preencha manualmente.

---

## 3. Não-Objetivos / Fora de Escopo
- Não implementar quebra de senha (brute-force) de PDFs protegidos.
- Não rejeitar arquivos válidos que possuam pequenas áreas escuras ou carimbos.
- Não persistir logs de erros contendo informações pessoais de documentos (LGPD).

---

## 4. Requisitos EARS

| Requisito | Tipo Declarado | Especificação |
| :--- | :--- | :--- |
| REQ-001 | Event | Quando um PDF contiver proteção por senha ou operador de criptografia, o sistema deve detectar a flag de encriptação e retornar aviso amigável sem lançar exceções. |
| REQ-002 | Event | Quando uma imagem possuir variância de contraste nula ou ruído puro, o sistema deve abortar o OCR e sugerir preenchimento manual ou novo envio. |
| REQ-003 | Event | Quando um arquivo possuir tamanho de zero bytes ou payload nulo, o sistema deve rejeitar a submissão e restaurar o estado da dropzone imediatamente. |
| REQ-004 | Ubiquitous | O sistema deve capturar qualquer falha de processamento em memória e exibir o card de alerta Obsidian Alert sem interromper o funcionamento do Sidepanel. |
| REQ-005 | Ubiquitous | O sistema deve manter todos os 8 campos canônicos editáveis após qualquer falha de extração automática. |

---

## 5. Orçamentos Não-Funcionais
- **Latência de Detecção:** Detecção de PDF criptografado ou imagem sólida em < 15ms.
- **Resiliência a Falhas (Regra #25):** Zero exceções não tratadas (`uncaught exceptions`) na suíte de testes.
- **Limite de Linhas de Código (Regra #24):** Arquivos modificados permanecem abaixo de 600 linhas.

---

## 6. Hotspots Compartilhados
- `core/document-parser.js`
- `core/ocr-engine.js`
- `extension/sidepanel.js`
- `tests/core/resilience-sanitization.test.js`

---

## 7. Tarefas (DAG)

## T1 — Suíte TDD de Blindagem e Casos de Falha Extrema (`tests/core/resilience-sanitization.test.js`)
- **Requisitos:** REQ-001, REQ-002, REQ-003, REQ-004, REQ-005
- **Agent:** tear-qa
- **model:** gemini-2.5-pro
- **effort:** médio
- **tempo:** 20m
- **Depends-on:** nenhum

## T2 — Detecção de Criptografia em PDFs e Variância de Imagem (`core/document-parser.js` e `core/ocr-engine.js`)
- **Requisitos:** REQ-001, REQ-002, REQ-003
- **Agent:** noesis-resilience-guard
- **model:** gemini-2.5-pro
- **effort:** médio
- **tempo:** 25m
- **Depends-on:** T1

## T3 — Interface Defensiva com Obsidian Alert no Sidepanel (`extension/sidepanel.js`)
- **Requisitos:** REQ-004, REQ-005
- **Agent:** tear-frontend
- **model:** gemini-2.5-pro
- **effort:** baixo
- **tempo:** 15m
- **Depends-on:** T2

---

## 8. Matriz de Rastreabilidade

| Requisito | Tarefa | Teste |
| :--- | :--- | :--- |
| REQ-001 | T2 | tests/core/resilience-sanitization.test.js |
| REQ-002 | T2 | tests/core/resilience-sanitization.test.js |
| REQ-003 | T2 | tests/core/resilience-sanitization.test.js |
| REQ-004 | T3 | tests/core/resilience-sanitization.test.js |
| REQ-005 | T3 | tests/core/resilience-sanitization.test.js |
