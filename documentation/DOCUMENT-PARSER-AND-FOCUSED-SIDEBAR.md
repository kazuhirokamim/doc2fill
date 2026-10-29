# Motor de Classificação Documental e Sidebar Focada (8 Campos CCHA)

> Documentação viva referente à expansão de tipos de documentos suportados e à simplificação focada da interface lateral (Sidepanel) para os procuradores do CCHA (Conselho Curador dos Honorários Advocatícios).
> Referência Arquitetural: [ADR-009](file:///Users/user/.gemini/antigravity/scratch/kazuhiro/doc2fill/docs/adr/ADR-009-document-parser-and-focused-sidebar.md), [ADR-037](file:///Users/user/.gemini/antigravity/scratch/kazuhiro/doc2fill/docs/adr/ADR-037-extracao-semantica-resiliente-e-simplificacao-ccha.md) e [PLAN-029](file:///Users/user/.gemini/antigravity/scratch/kazuhiro/doc2fill/docs/plans/PLAN-029-refinamento-extracao-e-resiliencia-ccha.md).

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

## ⚡ Refinamento Semântico e Resiliência CCHA (PLAN-029 / ADR-037)

Em continuidade ao refinamento contínuo de extração com os procuradores do CCHA:
1. **Normalização de Datas Numéricas e por Extenso (`core/date-normalizer.js`)**:
   - Suporte nativo a formatos numéricos (`DD/MM/YYYY`, `DD-MM-YYYY`, `DD.MM.YYYY`, `YYYY-MM-DD`).
   - Reconhecimento e normalização determinística de datas escritas por extenso em língua portuguesa (ex: `09 de novembro de 2026`, `23 de out de 2026`, `São Paulo, 15 de Outubro de 2026`) convertendo de forma unificada para o padrão ISO `YYYY-MM-DD`.
   - Sobrescrita da estimativa `AAMM-01` da chave de acesso SEFAZ sempre que a data exata com dia for localizada no corpo do documento.
2. **Higienização de Canhotos DANFE e Resiliência de Tabelas Multilinhas**:
   - Tratamento automático do termo protocolar de recebimento (`RECEBEMOS DE ... LTDA OS PRODUTOS...`), isolando estritamente a Razão Social do fornecedor.
   - Extração do valor total em tabelas de impostos multilinhas sem prefixo monetário (`R$`) com fallback para a discriminação dos itens da nota.
3. **Descritivos e Motivos Padronizados Anti-Glosa CCHA**:
   - *Medicamentos e Insumos Farmacêuticos*: `Aquisição de medicamentos/insumos farmacêuticos recomendado por médico`.
   - *Consultas e Serviços Médicos*: `Consulta médica ambulatorial` com identificação do prestador no fornecedor.
   - *Motivo da Necessidade*: Simplificação objetiva e direta para `Recomendação médica.`, eliminando prolixidade burocrática.
   - *Número do Documento*: Classificado como campo facultativo no Sidepanel, sem compor o texto do descritivo.

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
[ Documento / OCR / PDF / Foto Mobile ]
              │
              ▼
  [ mobile-pwa/scanner.js ] ──► Downscaling em Canvas (< 1600px) + OCR local/relay
              │
              ▼
    [ core/classifier.js ]  ──► Identifica o tipo do documento (NF, Recibo, Boleto, Guia...)
              │
              ▼
 [ core/document-parser.js ] ──► Extrai os 8 campos fundamentais (supressão de binários espúrios)
              │
              ▼
  [ extension/sidepanel.js ] ──► Exibe estritamente os 8 campos no formulário lateral
              │
              ▼ (Clique em "Preencher Automaticamente no CCHA")
  [ extension/content.js ]   ──► Injeção headless, máscara de datas/moedas e eventos reativos Angular
              │
              ▼
   [ Portal CCHA / AGU ]     ──► Caixas correspondentes preenchidas instantaneamente
```

---

## 📱 Scanner Mobile PWA & Relay P2P

1. **Downscaling de Imagens**: Fotos de smartphones modernos (12MP a 48MP) são redimensionadas em Canvas mantendo a proporção para no máximo 1600px no eixo maior, reduzindo o payload de ~10MB para ~250KB.
2. **Envio Fidedigno de OCR**: O resultado da extração local/servidor é transmitido imediatamente via `sendToExtension`, eliminando o fallback com dados mockados fixos.
3. **Resiliência Angular Forms**: O injetor `fillInputElement` lida com inputs `type="date"` (formato `YYYY-MM-DD`), inputs de texto com máscara (`DD/MM/AAAA`) e inputs numéricos (higienização de símbolos `R$`, pontos e vírgulas).
4. **Isolamento de Portas (3333) & Autodescoberta**: O servidor local e relay opera na porta `3333` por padrão (evitando conflito com apps nas portas 3000/8080), possui auto-recuperação (`tryListen`) em caso de porta ocupada e autodescoberta dinâmica pelo Sidepanel. Execução via `npm run dev` ou `npm run demo`.

---

## 🛡️ Política Zero Retenção (LGPD & Segurança)

- Os dados extraídos residem exclusivamente na memória RAM da sessão do navegador.
- Zero envio de dados para servidores externos ou bancos de dados remotos.
- Ao fechar o Sidepanel ou resetar o formulário, todos os dados em memória são purgados.
