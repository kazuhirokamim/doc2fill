# Motor de Classificação Documental e Sidebar Focada (8 Campos CCHA)

> Documentação viva referente à expansão de tipos de documentos suportados e à simplificação focada da interface lateral (Sidepanel) para os procuradores do CCHA (Conselho Curador dos Honorários Advocatícios).
> Referência Arquitetural: [ADR-009](file:///Users/user/.gemini/antigravity/scratch/kazuhiro/doc2fill/docs/adr/ADR-009-document-parser-and-focused-sidebar.md) e [PLAN-005](file:///Users/user/.gemini/antigravity/scratch/kazuhiro/doc2fill/docs/plans/PLAN-005-document-types-expansion-and-sidebar-simplification.md).

---

## 🎯 Objetivo & Problema Resolvido

Anteriormente, o Sidepanel exibia múltiplos campos periféricos e legados (como dados bancários, agência, conta corrente, processo judicial longo, matrícula SIAPE, retenção de IRRF), gerando poluição cognitiva e lentidão na conferência por parte dos procuradores e operadores do CCHA.

Com a arquitetura consolidada:
1. **Suporte a 8+ Tipos de Documentos**: O motor classifica e extrai dados com precisão a partir de textos e nomes de arquivos.
2. **Interface Estritamente Focada (8 Campos)**: O painel lateral expõe apenas e exatamente os 8 campos fundamentais solicitados.
3. **Preenchimento Automático em 1-Clique**: O botão *"Preencher Automaticamente no CCHA"* despacha o payload via mensagem segura para o `content.js`, preenchendo caixas correspondentes (com suporte completo a Angular Reactive Forms `formControlName`, `ng-reflect-name`, `mat-form-field`, `ng-select` e Shadow DOM).

---

## 📄 Tipos de Documentos Suportados

O módulo `core/classifier.js` categoriza os documentos nos seguintes tipos padronizados:

| Tipo | Chave Interna | Descrição |
| :--- | :--- | :--- |
| **Nota Fiscal de Serviços (NFS-e / NF-e)** | `NFSE` | Notas fiscais eletrônicas de serviços técnicos e advocatícios |
| **Cupom Fiscal** | `CUPOM` | Extratos SAT, NFC-e e cupons de suprimento |
| **Recibo** | `RECIBO` | Recibos de pagamento autônomo e honorários |
| **Boleto Bancário** | `BOLETO` | Títulos de cobrança com código de barras ou linha digitável |
| **Fatura** | `FATURA` | Faturas comerciais e prestação continuada de serviços |
| **Comprovante de Pagamento** | `COMPROVANTE` | Comprovantes de transferência, PIX, TED e quitações bancárias |
| **Guia Médica / TISS** | `GUIA` | Guias de encaminhamento, SADT e procedimentos de saúde |
| **Declaração** | `DECLARACAO` | Declarações formais, atestados e termos de conformidade |
| **Outro Comprovante** | `OUTROS` | Qualquer outro documento idôneo de comprovação |

---

## 🔍 Os 8 Campos Essenciais Extraídos

O módulo `core/document-parser.js` extrai e normaliza os dados nas seguintes propriedades:

1. **`tipo_documento`**: Rótulo legível da espécie documental identificada.
2. **`cpf_cnpj`**: Cadastro Nacional da Pessoa Jurídica ou Física formatado (`00.000.000/0000-00` ou `000.000.000-00`).
3. **`fornecedor`**: Razão Social, Nome Fantasia ou Nome do Prestador/Beneficiário emissor.
4. **`numero_documento`**: Número da NFS-e, Cupom, Recibo, Fatura ou Protocolo/Autenticação bancária.
5. **`data`**: Data de emissão, competência ou transação no padrão `YYYY-MM-DD` (e formatada para visualização).
6. **`valor`**: Valor total monetário formatado em Reais (`R$ 0,00`).
7. **`descritivo`**: Síntese concisa e inteligível do serviço prestado ou insumo faturado.
8. **`motivo`**: Fundamentação jurídica e legal adaptada para auditoria do CCHA (ex: arts. 29 a 36 da Lei nº 13.327/2016).

---

## ⚡ Fluxo de Preenchimento Automático (CCHA Autofill)

```
[ Documento / OCR / PDF / Foto ]
              │
              ▼
   [ core/classifier.js ]  ──► Identifica o tipo do documento (NF, Recibo, Boleto, Guia...)
              │
              ▼
 [ core/document-parser.js ] ──► Extrai os 8 campos fundamentais e sintetiza descritivo/motivo
              │
              ▼
  [ extension/sidepanel.js ] ──► Exibe estritamente os 8 campos no formulário lateral
              │
              ▼ (Clique em "Preencher Automaticamente no CCHA")
  [ extension/content.js ]   ──► Injeção headless e disparo de eventos reativos Angular
              │
              ▼
   [ Portal CCHA / AGU ]     ──► Caixas correspondentes preenchidas instantaneamente
```

---

## 🛡️ Política Zero Retenção (LGPD & Segurança)

- Os dados extraídos residem exclusivamente na memória RAM da sessão do navegador.
- Zero envio de dados para servidores externos ou bancos de dados remotos.
- Ao fechar o Sidepanel ou resetar o formulário, todos os dados em memória são purgados.
