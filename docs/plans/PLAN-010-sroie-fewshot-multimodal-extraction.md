# PLAN-010: Pipeline de Extração Fiscal e OCR Multimodal com SROIE e Few-Shot

## Metadados SDD
- **versao_plano:** 1.0.0
- **tipo:** feature
- **blast_radius:** médio
- **orcamento_tokens:** 35000

---

## 1. Visão Geral e Justificativa
Para elevar a acurácia de extração e resolver a falta de valores reais nos testes, implementamos o pipeline de leitura e extração de documentos fiscais baseado em datasets reais rotulados (SROIE / CORD via Hugging Face), com aprendizado em contexto (Few-Shot) e inferência multimodal de visão computacional via SDK `google-genai` (`gemini-2.5-flash`), com esquema Pydantic estruturado e conversão ontológica para o padrão fiscal brasileiro.

---

## 2. Opções Técnicas Avaliadas (Regra Tear #2)

### Opção 1: OCR Heurístico Puro sem Suporte Multimodal
- **Descrição:** Extração baseada unicamente em regex e segmentação Tesseract local.
- **Prós:** 100% offline, zero chamadas de API externa.
- **Contras:** Falha em cupons térmicos complexos ou layouts desordenados; não utiliza datasets rotulados modernos como SROIE/CORD.

### Opção 2: Integração Multimodal em Nuvem Exclusiva sem Fallback Local
- **Prós:** Alta precisão em imagens despadronizadas.
- **Contras:** Viola a política de Zero Retenção e sigilo fiscal se não houver sanitização local e modo de contingência offline.

### Opção 3 (RECOMENDADA): Pipeline Híbrido Multimodal Few-Shot com Mapeamento Brasileiro e Fallback Resiliente
- **Descrição:** Combina aprendizado estruturado Few-Shot com o SDK oficial `google-genai` (`gemini-2.5-flash`), validação rigorosa via Pydantic (`DadosReciboFiscal`), tradução ontológica para o padrão fiscal brasileiro (`razao_social`, `cnpj`, `data_emissao`, `valor_total`), tratamento de falhas de rede com fallback simulado/local, e benchmarking automatizado com o dataset SROIE do Hugging Face.
- **Prós:** Atende plenamente à especificação técnica, mantém o padrão de alta fidelidade e respeita a disciplina de resiliência e privacidade.
- **Contras:** Requer configuração de ambiente Python e chave de API para o modo online.

---

## 3. Não-Objetivos / Fora de Escopo
- Não treinar pesos neurais do zero (fine-tuning completo de LLMs em GPUs locais).
- Não persistir imagens em banco de dados na nuvem (princípio Zero Retenção).
- Não quebrar o motor JavaScript da extensão web ou desestabilizar o Sidepanel.

---

## 4. Requisitos EARS

| Requisito | Tipo Declarado | Especificação |
| :--- | :--- | :--- |
| REQ-001 | Ubiquitous | O sistema deve carregar dados rotulados reais de treino e teste do dataset SROIE via biblioteca datasets do Hugging Face. |
| REQ-002 | Event | Quando uma imagem de recibo fiscal for submetida ao extrator multimodal, o sistema deve fornecer contexto Few-Shot e schema estruturado Pydantic ao modelo gemini-2.5-flash. |
| REQ-003 | Event | Quando a extração multimodal retornar o schema em inglês, o sistema deve converter deterministicamente os campos para o padrão fiscal brasileiro com chaves razao_social, cnpj, data_emissao e valor_total. |
| REQ-004 | Event | Quando ocorrer falha de conexão de rede, ausência de credencial de API ou imagem corrompida, o sistema deve interceptar a exceção graciosamente sem causar encerramento abrupto do processo. |
| REQ-005 | Ubiquitous | O sistema deve disponibilizar uma rotina de benchmark automatizado para avaliar a acurácia de extração em lotes de teste do SROIE. |

---

## 5. Orçamentos Não-Funcionais
- **Limite de Linhas por Arquivo (Regra #24):** Menos de 700 linhas em `src/pipeline_ocr.py` e arquivos de teste.
- **Complexidade Assintótica:** O(N) para transformação e sanitização de schemas.
- **Cobertura de Testes (TDD):** Mínimo de 3 cenários (caminho feliz, casos de borda e tratamento de erro) com 80%+ de cobertura.
- **Zero Retenção de Dados:** Operação puramente em memória efêmera local (RAM).

---

## 6. Hotspots Compartilhados
- `src/pipeline_ocr.py`
- `tests/python/test_pipeline_ocr.py`
- `requirements.txt`

---

## 7. Tarefas (DAG)

## T1 — Schemas Pydantic e Mapeamento Fiscal Brasileiro (`src/pipeline_ocr.py`)
- **Requisitos:** REQ-002, REQ-003
- **Agent:** tear-backend
- **model:** gemini-2.5-pro
- **effort:** médio
- **tempo:** 20m
- **Depends-on:** nenhum

## T2 — Loader SROIE e Extrator Multimodal Few-Shot com Resiliência (`src/pipeline_ocr.py`)
- **Requisitos:** REQ-001, REQ-002, REQ-004
- **Agent:** tear-backend
- **model:** gemini-2.5-pro
- **effort:** médio
- **tempo:** 25m
- **Depends-on:** T1

## T3 — Rotina de Benchmark Automatizado SROIE (`src/pipeline_ocr.py`)
- **Requisitos:** REQ-005
- **Agent:** tear-qa
- **model:** gemini-2.5-pro
- **effort:** médio
- **tempo:** 20m
- **Depends-on:** T2

## T4 — Suíte de Testes TDD nos 3 Cenários (`tests/python/test_pipeline_ocr.py`)
- **Requisitos:** REQ-001, REQ-002, REQ-003, REQ-004, REQ-005
- **Agent:** tear-qa
- **model:** gemini-2.5-pro
- **effort:** médio
- **tempo:** 25m
- **Depends-on:** T3

---

## 8. Matriz de Rastreabilidade

| Requisito | Tarefa | Teste |
| :--- | :--- | :--- |
| REQ-001 | T2 | tests/python/test_pipeline_ocr.py |
| REQ-002 | T1, T2 | tests/python/test_pipeline_ocr.py |
| REQ-003 | T1 | tests/python/test_pipeline_ocr.py |
| REQ-004 | T2 | tests/python/test_pipeline_ocr.py |
| REQ-005 | T3 | tests/python/test_pipeline_ocr.py |
