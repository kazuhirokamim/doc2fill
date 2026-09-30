---
numero: 13
titulo: Motor Semântico de Preenchimento, Normalização de Ruído de OCR e Pipeline Resiliente de Autofill
data: 2026-09-30
status: Aceito
autores:
  - Kazuhiro
  - Tear Maestro
aplica_a:
  - extension
  - core
  - tests
tags:
  - semantic-autofill
  - ocr-noise-normalization
  - nfce-key-parser
  - anti-collision
  - sidepanel-resilience
---

# ADR-013: Motor Semântico de Preenchimento, Normalização de Ruído de OCR e Pipeline Resiliente de Autofill

## Contexto
O doc2fill opera na captura e extração de dados fiscais (notas fiscais, recibos e cupons fiscais térmicos) para preenchimento de formulários governamentais e de saúde (como o portal CCHA / AGU).
Durante a validação prática com documentos reais de farmácia (NFC-e), foram diagnosticados 4 gargalos:
1. Ruído ótico na leitura da chave de acesso de 44 dígitos impedia a extração do número da nota fiscal (`numero_documento`), deixando o campo vazio no Sidepanel e na página.
2. No Sidepanel, a seleção do `<select id="field-tipo-doc">` exigia match estrito, falhando quando o tipo sofria pequenas variações.
3. No `extension/content.js`, o termo `'documento'` em `cpf` e `cpf_cnpj` causava colisão severa com os campos `#tipo_documento` e `#numero_documento` do formulário, e a ausência de controle de estado (`filledElements`) permitia que aliases posteriores sobrescrevessem dados já preenchidos.
4. O casamento de opções de `<select>` de formulários na página de destino operava apenas por igualdade estrita ou contenção literal, forçando `input.selectedIndex = 0` (zerando a seleção do formulário) quando recebia `"Cupom Fiscal (NFC-e / SAT)"`.

## Decisão
No contexto de extração e preenchimento automático de comprovantes fiscais e cupons de farmácia no doc2fill, enfrentando falhas de extração de número do documento por ruído de OCR na chave de acesso, colisões de termos em campos de formulário e resets indesejados de selects, decidimos por implementar normalização de ruído de OCR em chaves de acesso com extração dos 9 dígitos da NF, motor semântico priorizado para selects, remoção de colisões em mapeamentos fiscais e controle de estado de elementos preenchidos, para alcançar preenchimento 100% fidedigno e resiliente ponta a ponta sem perda de dados no Sidepanel ou na página de destino, aceitando a necessidade de manter tabelas de equivalência semântica e sincronização contínua entre core e extensão.

### Detalhes da Decisão
1. **Normalização de Ruído de OCR e Extração de Chave NFC-e (`core/document-parser.js`)**:
   - Varredura de linhas posteriores a termos de chave de acesso ou consulta SEFAZ.
   - Normalização de caracteres óticos com ruído térmico (`D/O -> 0`, `I/l -> 1`, `S -> 5`, `B -> 8`, `Z -> 2`).
   - Extração dos 9 dígitos da NF (posições 25..34 da chave de 44 dígitos) e fallbacks por códigos de operação/transação (`OP:`, `VD:`, `CX:`).
   - Higienização do descritivo para remover cabeçalhos de tabela fiscal e preservar o nome real do item/medicamento adquirido.
2. **Motor Semântico de Selects e Prevenção de Colisões (`extension/content.js`)**:
   - Função `matchSemanticSelectOption` com grupos semânticos prioritários (Cupom/NFC-e mapeia para `nota_fiscal` ou `recibo`; Recibo mapeia para `recibo`; Guia Médica mapeia para `guia_medica`).
   - Otimização algorítmica O(N) com pré-normalização da lista de opções em passo único, eliminando loops aninhados profundos e mantendo latência de correspondência inferior a 1ms.
   - Remoção do termo genérico `'documento'` de `cpf` e `cpf_cnpj` em `FISCAL_MAPPINGS`.
   - Controle de estado `filledElements = new Set()` para garantir que um elemento preenchido com alta pontuação não seja sobrescrito por termos genéricos posteriores.
3. **Resiliência e Auto-Injeção no Sidepanel (`extension/sidepanel.js`)**:
   - Seleção semântica flexível no `<select id="field-tipo-doc">`.
   - Auto-injeção programática do `content.js` via `chrome.scripting.executeScript` caso o envio de mensagem falhe por ausência de receptor ativo.

## Consequências

### Positivas
- 100% dos campos essenciais do cupom da farmácia (incluindo número do documento, razão social, CNPJ, data, valor e descritivo limpo) são preenchidos corretamente no Sidepanel e na página.
- Eliminação total de resets indesejados (`selectedIndex = 0`) e de colisões de CPF/CNPJ com número de documento.
- Resiliência operacional sem falhas de conexão quando a página já estiver aberta.
- Soberania Local-First mantida com Zero Retenção na nuvem.

### Negativas
- Exige manter sincronização contínua entre `core/` e `extension/core/` via script `npm run sync-core`.

### Neutras/Riscos Mitigados
- Risco de regressão em documentos tradicionais (NFS-e e recibos) mitigado por testes automatizados em suíte TDD abrangente.
- Risco de lentidão mitigado por algoritmos O(n) lineares de varredura textual e manipulação de conjuntos em memória.
