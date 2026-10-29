---
numero: 37
titulo: Extracao Semantica Resiliente, Datas por Extenso e Simplificacao CCHA
data: 2026-10-28
status: Proposto
autores:
  - Kazuhiro
  - Tear Maestro
aplica_a:
  - core
  - extension
  - tests
tags:
  - ccha
  - data-extenso
  - anti-glosa
  - layout-danfe
---

# ADR-037: Extração Semântica Resiliente, Datas por Extenso e Simplificação CCHA

## Contexto
Nos testes empíricos de MVP com documentos reais (cupons térmicos Drogasil, DANFE mercantil de e-commerce e DANFSe de serviços médicos), o Doc2Fill apresentou pequenas falhas de acurácia que demandam edições manuais:
1. **Perda de Dia em Datas com Hífen e Falta de Suporte a Datas por Extenso:** Datas como `11-09-2026` não casavam no regex (que esperava barra ou ponto) e caíam no fallback de primeiro dia (`2026-09-01`) da chave SEFAZ. Recibos com datas por extenso (ex: `09 de novembro de 2026`) não eram interpretados.
2. **Poluição de Fornecedor por Canhoto DANFE:** A detecção de Razão Social capturava a linha superior inteira do canhoto (`RECEBEMOS DE ... OS PRODUTOS CONSTANTES...`).
3. **Valores Omitidos em Tabelas Multilinhas DANFE:** Tabela de impostos onde cabeçalho e números ficam em linhas separadas sem símbolo `R$`.
4. **Descritivos Prolixos e Ruído de OCR:** Concatenação de nomes brutos de itens e números de documentos geravam risco de glosa de despesas farmacêuticas perante o CCHA.
5. **Motivo Burocrático Redundante:** O motivo citava CCHA/AGU desnecessariamente, quando o requisito formal auditável é a `Recomendação médica.`

## Decisão
No contexto de extração e autopreenchimento de comprovantes para o CCHA, enfrentando datas com hífens ignoradas em favor de estimativa da chave SEFAZ, ausência de suporte a datas por extenso, captura de canhotos como Razão Social e descritivos poluídos com ruído de OCR, decidimos por implementar a Opção 1 (Módulo desacoplado de normalização de datas em PT-BR, higienização de canhotos DANFE, tabelas multilinhas de impostos e padronização concisa de descritivo e motivo anti-glosa), para alcançar extração semântica precisa com taxa de edição manual próxima de zero e eliminação de risco de glosa, aceitando o esforço de manter um dicionário estático dos meses do ano em português.

## Consequências

### Positivas
- Resolução definitiva da data de emissão em cupons NFC-e e recibos com datas por extenso.
- Captura fiel do emitente real em DANFEs mercantis expurgando o texto protocolar do canhoto.
- Extração precisa de valores totais em tabelas de impostos sem prefixo monetário.
- Descritivos e motivos perfeitamente alinhados às exigências de auditoria do CCHA (`Recomendação médica.`).
- Manutenção do teto de linhas (< 700 linhas) em cumprimento à Regra Tear #24.

### Negativas
- Necessidade de sincronização entre `core/` e `extension/core/` via script de build.

### Neutras/Riscos Mitigados
- Todos os contratos de integração com portais permanecem preservados.
- O campo Número do Documento é tornado opcional na interface sem quebrar o esquema canônico.
