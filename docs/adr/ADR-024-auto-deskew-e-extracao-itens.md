---
numero: 24
titulo: Auto-Deskew de Imagens e Extracao Estruturada de Itens de Nota Fiscal
data: 2026-10-12
status: Aceito
autores:
  - Kazuhiro
  - Tear Maestro
  - Noesis Domain Core
  - Noesis Saci Hunter
aplica_a:
  - core
  - tests
  - extension
tags:
  - auto-deskew
  - image-preprocessing
  - item-extraction
  - line-items
  - local-first
---

# ADR-024: Auto-Deskew de Imagens e Extração Estruturada de Itens de Nota Fiscal

## Contexto
O **doc2fill** atingiu excelente maturidade funcional na extração dos 8 campos canônicos gerais de notas fiscais. Porém, dois cenários frequentes do mundo real limitavam a expansão do sistema:
1. Fotos tiradas de smartphones em ângulos inclinados (-20° a +20°) ou com orientações EXIF (90°, 180°, 270°) causavam perda de alinhamento das linhas de OCR.
2. Sistemas de gestão financeira e ERPs (como TOTVS, SAP e ContaAzul) exigem o preenchimento discriminado de cada item de produto/serviço (código, descrição, quantidade, valor unitário e total), e não apenas o total geral do cupom.

## Decisão
No contexto de evolução algorítmica para a Trilha B de Câmera Resiliente e Robustez Fiscal, enfrentando fotos inclinadas de smartphones que degradam a leitura do OCR e a necessidade corporativa de lançar produtos detalhados em ERPs, decidimos por implementar o preprocessador leve em JavaScript puro com auto-deskew por projeção horizontal e o extrator semântico tabular de itens de notas fiscais, para alcançar alta resiliência de leitura angular e granularidade contábil completa com execução local e instantânea, aceitando a limitação da faixa de correção angular linear entre -20° e +20° sem distorções 3D complexas.

### Detalhes da Decisão
1. **Preprocessador de Imagens (`core/image-preprocessor.js`):**
   - Leitura de tags EXIF em JPEG para rotações ortogonais (90°, 180°, 270°).
   - Estimativa do ângulo de inclinação linear (auto-deskew) entre -20° e +20° por projeção de variância horizontal.
   - Aplicação de rotação compensatória via Canvas 2D nativo em memória volátil.
2. **Extrator de Itens da Nota (`core/item-extractor.js`):**
   - Identificação de linhas de produtos/serviços com regex semântica multi-formato.
   - Extração estruturada de `itemIndex`, `code`, `description`, `quantity`, `unit`, `unitPrice` e `totalPrice`.
   - Validação matemática de integridade contábil (`sum(totalPrice)` vs valor total do documento).
3. **Integração no Document Parser (`core/document-parser.js`):**
   - Retorno da lista de itens na propriedade `items: [...]`.
   - Manutenção de arquivos desacoplados e estritamente abaixo do orçamento de 700 linhas da Regra #24.

## Consequências

### Positivas
- Resiliência superior a fotos tiradas tortas ou em posições rotacionadas por smartphones.
- Suporte imediato a preenchimento detalhado de compras item a item em ERPs.
- 100% Local-First e Zero Retenção: zero tráfego de imagens em rede externa, garantindo conformidade com a LGPD.
- Execução sub-segundo (< 50ms) e sem dependências pesadas de terceiros.

### Negativas
- A compensação geométrica é focada em rotação planar e deskew linear (-20° a +20°), não cobrindo distorções esféricas/perspectivas 3D extremas.

### Neutras/Riscos Mitigados
- Documentos que não possuem itens de produto (boletos, recibos simples) retornam `items: []` sem quebrar o fluxo existente.
