# PLAN-017: Trilha B — Auto-Deskew de Imagens e Extração de Itens da Nota Fiscal

- **status:** Proposto
- **autor:** Equipe Doc2Fill
- **data:** 12/10/2026
- **tearform:** respostas/017.md
- **adr:** docs/adr/ADR-024-auto-deskew-e-extracao-itens.md

## Metadados SDD
- **versao_plano:** 1.0.0
- **tipo:** feature
- **blast_radius:** médio
- **orcamento_tokens:** 35000

---

## 1. Visão Geral e Justificativa
A Trilha B foca na resiliência algorítmica de captura e enriquecimento semântico do doc2fill. Ela introduz o módulo `core/image-preprocessor.js` para correção de orientação e rotação angular (auto-deskew de -20° a +20°) antes do processamento OCR, além do módulo `core/item-extractor.js` para extração estruturada de itens individuais de produtos e serviços em cupons fiscais e notas fiscais eletrônicas (DANFE e NFC-e).

---

## 2. Opções Técnicas Avaliadas (Regra Tear #2)

### Opção 1: Processamento em Nuvem com API Externa (OpenCV Remoto)
- **Descrição:** Enviar a imagem para processamento de deskew e extração tabular em servidor remoto.
- **Prós:** Acesso a bibliotecas em C++.
- **Contras:** Viola o princípio de Zero Retenção e privacidade local; introduz latência de rede; custo por chamada de API.

### Opção 2: Binário Completo do OpenCV.js (WASM) no Navegador
- **Descrição:** Embarcar a biblioteca OpenCV completa de 10MB no Sidepanel.
- **Prós:** Algoritmos prontos de transformadas geométricas.
- **Contras:** Aumenta o pacote em mais de 10MB; inicialização lenta que trava a thread principal do navegador.

### Opção 3 (RECOMENDADA): Preprocessador Leve em JS Puro + Canvas 2D + Extrator Tabular Semântico
- **Descrição:** Implementar detecção de orientação EXIF e projeção de variância horizontal em JS nativo com Canvas 2D (< 15KB) e parser semântico de itens com validação matemática de somatórios.
- **Prós:** 100% Local-First; zero dependência externa; execução sub-segundo (< 50ms); cumpre a Regra #24 (< 400 linhas por arquivo).
- **Contras:** Faixa de correção angular calibrada para o intervalo de -20° a +20°.

---

## 3. Não-Objetivos / Fora de Escopo
- Não integrar bibliotecas pesadas de visão computacional em C++ ou OpenCV WASM acima de 1MB.
- Não persistir imagens corrigidas em disco ou banco de dados externo (estrita conformidade LGPD e Zero Retenção).
- Não violar o orçamento de 700 linhas por arquivo de código per Regra #24.

---

## 4. Requisitos EARS

| Requisito | Tipo Declarado | Especificação |
| :--- | :--- | :--- |
| REQ-001 | Event | Quando uma imagem JPEG ou PNG for carregada com inclinação angular, o sistema deve estimar e corrigir o ângulo de rotação antes de enviar ao OCR. |
| REQ-002 | Event | Quando o documento contiver uma tabela de produtos ou serviços discriminados, o sistema deve extrair a lista de itens com descrição, quantidade e valores. |
| REQ-003 | Ubiquitous | O sistema deve processar o deskew e a extração de itens localmente no navegador sem envio de imagens para servidores externos. |
| REQ-004 | Unwanted | Se o documento for um boleto ou recibo sem itens detalhados, então o sistema deve retornar um array de itens vazio sem gerar erro. |

---

## 5. Orçamentos Não-Funcionais
- **Limite de Linhas de Código (Regra #24):** Cada novo módulo mantido com menos de 400 linhas (teto global 700 linhas).
- **Latência de Processamento Deskew:** Menos de 60ms para estimativa e rotação no Canvas 2D.
- **Cobertura de Testes TDD:** Mínimo de 3 cenários por unidade e 80%+ de cobertura.

---

## 6. Hotspots Compartilhados
- `core/image-preprocessor.js`
- `core/item-extractor.js`
- `core/document-parser.js`
- `tests/core/image-preprocessor.test.js`
- `tests/core/item-extractor.test.js`

---

## 7. Tarefas (DAG)

## T1 — Preprocessador de Imagem e Auto-Deskew (`core/image-preprocessor.js`)
- **Requisitos:** REQ-001, REQ-003
- **Agent:** noesis-domain-core
- **model:** gemini-2.5-pro
- **effort:** médio
- **tempo:** 20m
- **Depends-on:** nenhum

## T2 — Extrator Semântico de Itens de Compra (`core/item-extractor.js`)
- **Requisitos:** REQ-002, REQ-004
- **Agent:** noesis-domain-core
- **model:** gemini-2.5-pro
- **effort:** médio
- **tempo:** 20m
- **Depends-on:** nenhum

## T3 — Integração e Validação no Document Parser (`core/document-parser.js`)
- **Requisitos:** REQ-001, REQ-002, REQ-003, REQ-004
- **Agent:** tear-code-reviewer
- **model:** gemini-2.5-pro
- **effort:** baixo
- **tempo:** 15m
- **Depends-on:** T1, T2

---

## 8. Matriz de Rastreabilidade

| Requisito | Tarefa | Teste |
| :--- | :--- | :--- |
| REQ-001 | T1 | tests/core/image-preprocessor.test.js |
| REQ-002 | T2 | tests/core/item-extractor.test.js |
| REQ-003 | T1 | tests/core/image-preprocessor.test.js |
| REQ-004 | T2 | tests/core/item-extractor.test.js |
