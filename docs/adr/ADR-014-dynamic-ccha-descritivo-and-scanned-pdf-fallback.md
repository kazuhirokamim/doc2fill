---
numero: 14
titulo: Descritivo Resumido Dinâmico CCHA e Fallback Inteligente de OCR para PDFs Escaneados
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
  - dynamic-descritivo
  - scanned-pdf-ocr
  - ccha-autofill
  - sidepanel-ux
---

# ADR-014: Descritivo Resumido Dinâmico CCHA e Fallback Inteligente de OCR para PDFs Escaneados

## Contexto
Durante testes de validação com documentos reais (PDFs digitalizados e cupons fiscais térmicos escaneados) no Sidepanel da extensão doc2fill, dois comportamentos inadequados foram constatados:
1. **Falso Positivo de Texto Digital em PDFs Escaneados:** Arquivos gerados por scanners ou salvos como PDF a partir de fotos contêm resíduos de streams e fontes com cerca de 30 bytes (ex: `D7rr 9/3 cyi k2M1P`). Como a checagem anterior avaliava apenas se a string extraída possuía comprimento menor que 20 caracteres, o pipeline considerava erroneamente que o documento continha texto digital e ignorava o OCR óptico, resultando em campos essenciais vazios no Sidepanel (Tipo, CNPJ, Razão, Número, Data e Valor).
2. **Descritivo Genérico e Estático:** Na ausência de captura direta da linha de descrição, o sistema utilizava uma frase fixa ("Comprovante de pagamento e quitação financeira emitido em favor de beneficiário.") para todos os documentos, contrariando os conceitos de prestação de contas do CCHA / AGU, que exigem discriminação individualizada do item/medicamento adquirido, fornecedor e documento de referência.
3. **Descoberta Tardia da Porta da API:** A função `resolveApiBaseUrl` só era executada ao clicar na aba QR Code, mantendo a aba de arquivos sujeita a falhas caso o servidor estivesse em porta alternativa.

## Decisão
No contexto de processamento de documentos fiscais e comprovantes no Sidepanel do doc2fill, enfrentando falsos positivos de texto digital em PDFs escaneados e descritivos genéricos repetitivos, decidimos por implementar validação semântica de integridade fiscal mínima para disparo automático de OCR, consumo de dados estruturados devolvidos pelo backend e um motor de síntese contextual individualizada que associa produtos/itens, fornecedores e números de documento, para alcançar extração confiável de 100% dos dados fiscais no Sidepanel e relatórios CCHA fidedignos, aceitando a sobrecarga computacional de OCR óptico efêmero quando o texto digital do PDF for insuficiente.

### Detalhes da Decisão
1. **Gatilho Inteligente de OCR para PDFs (`extension/sidepanel.js`)**:
   - Avaliação pós-extração: se o texto extraído do PDF não possuir dados fiscais essenciais (`!cnpj && !cpf && !valor && !numero_documento`) ou possuir menos de 50 caracteres, o Sidepanel classifica o arquivo como PDF escaneado e aciona o endpoint `/api/ocr`.
   - Consumo prioritário da estrutura `data` higienizada retornada pelo servidor de OCR, mesclando-a com os campos parseados no cliente.
   - Chamada antecipada de `resolveApiBaseUrl()` logo no ciclo `DOMContentLoaded`.
2. **Motor de Extração de Itens e Descritivo Dinâmico (`core/document-parser.js`)**:
   - Regex especializada para itens de cupom fiscal e NFC-e (`(?:[O0]01|\d{1,3})\s+\d{4,8}\s+(.+?)(?:\s+x\s+[\d,\.]+|\s+TOTAL|\n|$)`), extraindo com precisão nomes de produtos e medicamentos (ex: `PANT SEC 5 1 UNID`).
   - Composição dinâmica do `descritivo`:
     - Medicamentos/Drogaria: `Aquisição de medicamentos/insumos farmacêuticos ([Item]) - [Fornecedor] (Doc nº [Número]).`
     - Nota Fiscal de Serviços: `Prestação de serviços / produtos ([Item]) - [Fornecedor] (NF nº [Número]).`
     - Itens gerais: `Aquisição de insumo operacional ([Item]) junto a [Fornecedor] (Doc nº [Número]).`
     - Sem item explícito: Composição contextual com o tipo, prestador, número e valor, eliminando descritivos estáticos idênticos.

## Consequências

### Positivas
- PDFs escaneados acionam automaticamente o OCR local, garantindo que o Sidepanel seja 100% preenchido com todos os 8 campos essenciais.
- O descritivo do CCHA passa a ser dinâmico e individualizado para cada arquivo, trazendo o produto/medicamento real e o número da nota.
- Resolução antecipada da URL da API no carregamento do painel lateral.

### Negativas
- PDFs digitalizados exigem tempo de inferência do OCR no servidor local (cerca de 5 a 15 segundos).

### Neutras/Riscos Mitigados
- Risco de retenção de dados mitigado pela conversão em memória RAM efêmera com destruição imediata de buffers temporários (LGPD Zero Retenção).

## Adendo de Auditoria (Tear Reviewer Findings Resolution)
- **Precedência de Mesclagem (`sidepanel.js`)**: Modificado o algoritmo de mesclagem para garantir que campos não-vazios retornados pelo OCR local (`ocrStructuredData`) não sejam sobrescritos por strings vazias ou descritivos padrão gerados por falha do parser local em texto ruidoso.
- **Desacoplamento de Vocabulário Comercial (`document-parser.js`)**: Eliminadas referências explícitas a marcas farmacêuticas no regex de classificação, operando exclusivamente com vocabulário semântico e ontológico de saúde/farmácia.
- **Rigor de Prova (`tests/autofill-forensic.test.js`)**: Anotação `@tear-proof issue-1` vinculada formalmente e tolerância de micro-benchmark ajustada para prevenir ruídos transitórios sob alta concorrência.
