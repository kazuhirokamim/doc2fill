---
numero: 9
titulo: Expansão Taxonômica de Documentos, Extrator de 8 Campos e Sidebar Focada
data: 2026-09-26
status: Aceito
autores:
  - Kazuhiro
  - Tear Maestro
aplica_a:
  - core
  - extension
  - demo-portal
tags:
  - classifier
  - document-parser
  - sidepanel
  - ccha
  - autofill
---

# ADR-009: Expansão Taxonômica de Documentos, Extrator de 8 Campos e Sidebar Focada

## Contexto
O projeto doc2fill amadureceu com suporte a OCR local e adaptação reativa ao Angular no CCHA, mas na prática dos procuradores e no uso real de documentos comprobatórios, duas limitações impedem a fluidez do trabalho:
1. Taxonomia Limitada: O classificador suportava apenas 4 tipos, desconsiderando Cupons Fiscais (NFC-e/SAT), Faturas, Comprovantes de Pagamento (PIX/TED) e Declarações.
2. Poluição Visual na Sidebar: A interface da sidebar apresentava campos irrelevantes para o preenchimento direto (matrícula, dados bancários em múltiplos inputs, etc.), gerando atrito cognitivo.
3. Lacuna nos 8 Campos Essenciais: O sistema precisa garantir a extração e exibição estrita de 8 campos:
   - Tipo do Documento
   - CPF / CNPJ do fornecedor
   - Nome do Fornecedor / Razão Social
   - Número do Documento
   - Data do Documento
   - Valor do Documento (R$)
   - Descritivo Resumido (resumo claro do serviço/objeto)
   - Motivo da Necessidade (justificativa de necessidade/reembolso para o CCHA)

## Decisão
No contexto de extração de dados documentais comprobatórios e preenchimento de requerimentos no portal do CCHA, enfrentando a proliferação de formatos de comprovantes e a sobrecarga de campos desnecessários na interface da sidebar, decidimos por expandir a taxonomia para 8+ tipos documentais, estruturar o extrator em 8 campos canônicos focados e simplificar a sidebar para conter estritamente esses 8 campos, para alcançar máxima agilidade e foco dos procuradores com preenchimento automatizado direto no CCHA, aceitando a refatoração das suítes de teste de sidepanel para os novos campos consolidados.

### Detalhes da Decisão
1. **Taxonomia Abrangente em `core/classifier.js`**: Suporte explícito a Nota Fiscal (NFS-e/NF-e/DANFE), Cupom Fiscal (NFC-e/SAT), Recibo, Boleto, Fatura, Comprovante de Pagamento, Guia Médica e Declaração.
2. **Motor de Extração e Síntese em `core/document-parser.js`**: Extração resiliente de Número do Documento, Fornecedor/Razão Social, CPF/CNPJ, Data, Valor (R$), com síntese determinística contextual de Descritivo Resumido e Motivo da Necessidade formatados para o CCHA.
3. **Sidebar Focada em 8 Campos**: Redesenho de `extension/sidepanel.html` e `sidepanel.js` exibindo exclusivamente os 8 campos solicitados, sem campos bancários ou funcionais dispersos.
4. **Mapeamento CCHA em `extension/content.js` e `core/matcher.js`**: Mapeamento direto de cada um dos 8 campos para os seletores correspondentes no CCHA, respeitando Angular Reactive Forms (`[formControlName]`, `[ng-reflect-name]`, `mat-form-field` e Shadow DOM).

## Consequências

### Positivas
- Experiência do usuário (UX) ultra-focada, sem distrações para os procuradores.
- Cobertura de quase 100% dos documentos fiscais e administrativos usuais no âmbito do CCHA e AGU.
- Totalmente compatível com a política inegociável de Zero Retenção (processamento em memória RAM do cliente).
- Validação por testes TDD com 3 cenários por funcionalidade (Happy Path, Edge Case, Error Path).

### Negativas
- Ajuste das suítes de testes anteriores que esperavam campos bancários ou formatos legados no payload do sidepanel.

### Neutras/Riscos Mitigados
- Risco de falsos positivos na identificação de números de documentos mitigado por hierarquia de padrões (chaves de acesso de 44 dígitos, NFS-e com número explícito, recibo nº, linha digitável de boleto).
- Risco de síntese inadequada de descritivo e motivo mitigado por regras semânticas ontológicas e fallback seguro baseado em dados extraídos do fornecedor e documento.
