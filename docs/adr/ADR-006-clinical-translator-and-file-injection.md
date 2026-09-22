---
numero: 6
titulo: Motor Ontológico de Tradução Clínica Anti-Glosa, Seleção de Beneficiário e Injeção Nativa de Anexos
data: 2026-09-22
status: Aceito
autores:
  - Kazuhiro
  - Lucas
aplica_a:
  - core
  - extension
  - mobile-pwa
  - demo-portal
tags:
  - clinical
  - anti-glosa
  - tuss
  - zerocost
  - strategy-pattern
  - autofill
---

# ADR-006: Motor Ontológico de Tradução Clínica Anti-Glosa, Seleção de Beneficiário e Injeção Nativa de Anexos

## Contexto
Durante a expansão do `doc2fill` para o ecossistema de ressarcimento e reembolso de despesas de saúde (planos de saúde, seguradoras e convênios do setor público), identificou-se um índice elevado de glosas e indeferimentos em razão de:
1. Procedimentos com descrições leigas ou comerciais (ex: implante capilar, lentes de contato dental, toxina botulínica) sendo sumariamente recusados pelas auditorias por enquadramento incorreto em procedimento puramente estético.
2. Divergências entre a descrição do serviço e o campo de motivo da solicitação/necessidade médica.
3. Ausência de enquadramento da natureza do procedimento (Cirúrgico vs. Não Cirúrgico/Ambulatorial).
4. Fricção manual na seleção de titular/dependente e na necessidade de localizar o arquivo no disco para anexar no formulário.

Adicionalmente, estabeleceu-se o requisito de **Custo Zero (R$ 0,00)** operacional, eliminando cobranças recorrentes por APIs de terceiros e preservando a privacidade estrita (Zero Retenção de Dados - LGPD Art. 11).

## Decisão
No contexto de processamento de reembolsos de saúde em portais de convênios e seguradoras, enfrentando o alto índice de glosas por termos estéticos e a restrição de custo zero de infraestrutura sem retenção de dados, decidimos por implementar um motor ontológico determinístico local em JavaScript com Strategy Pattern, classificador documental e injeção de arquivos via DataTransfer, para alcançar preenchimento automatizado, traduções científicas alinhadas à Tabela TUSS/ANS e anexação transparente de documentos com custo zero e execução client-side, aceitando a necessidade de expansão progressiva do vocabulário cadastrado no dicionário ontológico.

### Detalhes da Decisão
1. **Motor Clínico Ontológico Local (`core/clinical-translator.js`)**:
   - Dicionário determinístico em memória mapeando termos comumente glosados para suas contrapartes funcionais, reparadoras e técnico-científicas da Tabela TUSS/CBHPM da ANS.
   - Geração coordenada e sincronizada de `descricao_tecnica`, `motivo_necessidade` e classificação `natureza` (Cirúrgico vs Não Cirúrgico).
   - Adoção do **Strategy Pattern** para permitir plugar futuros provedores (ex: LLMs locais ou APIs gratuitas) sem alteração no contrato de consumo.
2. **Classificador Estrutural de Documentos (`core/classifier.js`)**:
   - Identificação automática do tipo documental: *Nota Fiscal de Serviços (NFS-e/NF-e)*, *Recibo Profissional Liberal*, *Boleto/Fatura* ou *Guia Médica*.
3. **Mapeamento Heurístico de Beneficiário (`core/matcher.js` e `extension/content.js`)**:
   - Suporte inteligente à detecção e preenchimento de campos de seleção `titular` vs `dependente`.
4. **Injeção Automática de Arquivos via `DataTransfer` (`extension/content.js`)**:
   - Uso de instâncias nativas de `DataTransfer` e `File` no Content Script para associar os bytes do documento selecionado diretamente ao `<input type="file">` da página de destino, despachando eventos reativos.
5. **Aprimoramento Mobile Assistido (`mobile-pwa/`)**:
   - Adição de painel com cópia de 1-toque dos campos clínicos estruturados para suporte nativo a preenchimento mobile.

## Consequências

### Positivas
* **Custo Zero Vitalício**: Zero gastos com APIs ou infraestrutura de terceiros.
* **Redução Significativa de Glosas**: Adequação terminológica rigorosa perante auditorias médicas de convênios.
* **Privacidade Máxima**: Nenhum dado sensível de saúde transita ou é armazenado em nuvem.
* **Automação Completa de Anexo**: Elimina a necessidade de o usuário procurar o PDF no computador.

### Negativas
* O vocabulário clínico cobre inicialmente os termos cadastrados na base ontológica, demandando enriquecimento contínuo da base de dados.

### Neutras/Riscos Mitigados
* A arquitetura em Strategy Pattern mitiga o risco de obsolescência do dicionário local, viabilizando o acoplamento futuro de modelos de linguagem sem necessidade de refatorar o núcleo de preenchimento.
* Termos não encontrados no dicionário de procedimentos estéticos preservam a descrição original sem corrupção de dados.
