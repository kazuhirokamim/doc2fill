---
numero: 17
titulo: Pipeline de Extração Fiscal e OCR Multimodal com SROIE, Few-Shot e Mapeamento Brasileiro
data: 2026-10-09
status: Aceito
autores:
  - Kazuhiro
  - Tear Maestro
aplica_a:
  - src
  - tests
tags:
  - sroie-dataset
  - multimodal-ocr
  - few-shot
  - google-genai
  - pydantic
  - schema-brasileiro
---

# ADR-017: Pipeline de Extração Fiscal e OCR Multimodal com SROIE, Few-Shot e Mapeamento Brasileiro

## Contexto
Na evolução dos testes de extração e OCR do Doc2Fill, identificou-se a necessidade de avaliar a acurácia de leitura visual sobre datasets reais rotulados contendo cupons, recibos e notas fiscais autênticas (como o dataset SROIE no Hugging Face), integrando técnicas modernas de aprendizado em contexto (Few-Shot) e modelos multimodais de visão computacional (Gemini 2.5 Flash via SDK oficial `google-genai`), com validação tipada de esquemas e conversão para os identificadores fiscais brasileiros.

## Decisão
No contexto de enriquecimento e teste de extração de recibos e cupons fiscais no Doc2Fill, enfrentando a necessidade de avaliação com datasets reais rotulados e suporte a visão multimodal, decidimos por implementar o módulo `src/pipeline_ocr.py` integrando o dataset SROIE via biblioteca `datasets`, estruturação de prompts Few-Shot com o SDK `google-genai` e Pydantic (`DadosReciboFiscal`), mapeamento determinístico para o padrão fiscal brasileiro (`DadosFiscaisBrasileiros`), tratamento defensivo de falhas de conexão/autenticação com contingência resiliente, e rotina de benchmark automatizado em lote, para alcançar validação rigorosa de acurácia com dados reais de compras preservando a política de Zero Retenção e operação efêmera em RAM, aceitando a exigência de runtime Python com dependências modernas de IA.

### Detalhes da Decisão
1. **Modelagem de Dados com Pydantic**:
   - `DadosReciboFiscal`: Esquema canônico do dataset SROIE (`company`, `date`, `address`, `total`).
   - `DadosFiscaisBrasileiros`: Esquema adaptado à administração pública e comércio brasileiro (`razao_social`, `cnpj`, `data_emissao`, `valor_total`, `tipo_documento`).
2. **Carregamento SROIE (`carregar_dados_sroie`)**:
   - Consome `load_dataset("mp-02/sroie")` com divisão de amostra de estudo (treino) e teste.
3. **Extração Multimodal Few-Shot (`extrair_dados_com_ia`)**:
   - Contexto de aprendizado visual Few-Shot passado via `system_instruction`.
   - Invocação estruturada do `gemini-2.5-flash` via `client.models.generate_content` com `response_schema=DadosReciboFiscal` e `temperature=0.1`.
   - Interceptação de falhas de rede, imagens corrompidas ou ausência de chave `GEMINI_API_KEY`, provendo fallback seguro para testes offline.
4. **Mapeamento Brasileiro (`converter_para_padrao_brasileiro`)**:
   - Normaliza datas para ISO/BR e valores monetários para string `R$ XX,XX` e float.
5. **Benchmark Automatizado (`executar_benchmark_sroie`)**:
   - Avaliação iterativa de subconjunto de teste com cálculo de acurácia global.

## Consequências

### Positivas
- Resolução definitiva da falta de valores reais nos testes de extração.
- Validação tipada estrita via Pydantic eliminando alucinações de formato.
- Compatibilidade direta com formulários brasileiros (AGU/CCHA e portais fiscais).
- Resiliência contra quedas de rede e execução segura em pipelines de CI/CD.

### Negativas
- Adiciona dependências Python (`datasets`, `pillow`, `google-genai`, `pydantic`) gerenciadas pelo `uv`.

### Neutras/Riscos Mitigados
- Zero persistência de imagens ou dados fiscais em disco permanente (estritamente Zero Retenção).
