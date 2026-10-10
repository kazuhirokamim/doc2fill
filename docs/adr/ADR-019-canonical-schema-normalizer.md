---
numero: 19
titulo: Normalizador Canônico de Esquemas para os 8 Campos do CCHA
data: 2026-10-09
status: Aceito
autores:
  - Kazuhiro
  - Tear Maestro
  - Noesis Domain Core
aplica_a:
  - core
  - extension
  - tests
tags:
  - canonical-schema
  - normalizer
  - document-parser
  - tdd
  - ccha-fields
---

# ADR-019: Normalizador Canônico de Esquemas para os 8 Campos do CCHA

## Contexto
O ecossistema do **doc2fill** consome entradas heterogêneas originadas de OCR local (Tesseract), extração de texto em PDF nativo via operadores Tj/TJ, decodificação determinística da Chave SEFAZ de 44 dígitos e extração multimodal via Vision Language Models (Gemini/Few-Shot). Essas fontes geravam campos com convenções mistas (`descricao` vs `descritivo`, `razao` vs `fornecedor`, valores monetários com caracteres `R$`, pontuações discrepantes e ausência de campos retornando `undefined` ou `null`).

Os formulários do portal de destino (CCHA / AGU), o Sidepanel da extensão e as próximas funcionalidades de Split-View (S2-T1) e Injetor Reativo de Eventos Nativos (S2-T3) exigem determinismo absoluto sobre exatamente **8 campos canônicos**:
1. `tipo_documento`
2. `cpf_cnpj`
3. `fornecedor`
4. `numero_documento`
5. `data`
6. `valor`
7. `descritivo`
8. `motivo`

## Decisão
No contexto de estruturação definitiva do pipeline de extração fiscal do Doc2Fill, enfrentando a necessidade de alimentar interfaces de operador e formulários reativos do CCHA sem campos indefinidos ou inconsistências de tipagem, decidimos por implementar a função pura e determinística `normalizeCanonicalDocumentFields(rawFields)` em `core/document-parser.js`, para alcançar previsibilidade canônica dos 8 campos essenciais, garantia de não-nulos com fallback em string vazia, preservação de zeros à esquerda em CPF/CNPJ e padronização monetária segura em padrão brasileiro, aceitando a obrigação de mapear aliases legados e validar formatos mistos de entrada.

### Detalhes da Decisão
1. **Garantia Estrita de Não-Nulos:**
   - Qualquer propriedade ausente, nula ou inválida é resolvida para string vazia `""`, eliminando completamente falhas de `undefined` ou `null` no DOM.
2. **Preservação de Zeros à Esquerda:**
   - Para CPF (11 dígitos) e CNPJ (14 dígitos), aplicar `padStart` antes de formatar com as máscaras oficiais `XXX.XXX.XXX-XX` e `XX.XXX.XXX/XXXX-XX`.
3. **Normalização Monetária:**
   - Tratar formatos mistos (`"R$ 1.250,50"`, `"1250.50"`, `"1250,5"`), convertendo para a representação canônica em reais com vírgula decimal (`"1.250,50"`) e preservando `valorNumerico` como propriedade auxiliar para cálculos.
4. **Retrocompatibilidade:**
   - Manter propriedades auxiliares consolidadas (`cnpj`, `cpf`, `descricao`, `processo`, `siape`, `banco`, `agencia`, `conta`, `pix`) no objeto retornado sem introduzir qualquer regressão nas suítes existentes.

## Consequências

### Positivas
- Desacoplamento total entre os algoritmos de extração física e a camada de renderização/autofill.
- Previsibilidade absoluta para a injeção reativa via `setInputValueWithEvents` em formulários Angular/React.
- Eliminação definitiva de exceções em tempo de execução causadas por propriedades indefinidas.
- Aderência perfeita à Regra Tear #24 mantendo o módulo bem abaixo de 550 linhas.

### Negativas
- Necessidade de manter uma camada de compatibilidade para aliases e formatos históricos de chaves.

### Neutras/Riscos Mitigados
- Risco de truncamento de valores monetários não-padrão foi mitigado através de regex defensivo e fallback numérico.
- Risco de regressão nos testes existentes foi mitigado pela preservação de aliases (`descricao` espelhando `descritivo`).
