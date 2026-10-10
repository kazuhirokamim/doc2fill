---
numero: 20
titulo: Blindagem Defensiva e Tratamento de Exceções no Pipeline de Extração
data: 2026-10-09
status: Aceito
autores:
  - Kazuhiro
  - Tear Maestro
  - Noesis Resilience Guard
aplica_a:
  - core
  - extension
  - tests
tags:
  - exception-handling
  - defense-in-depth
  - pdf-encryption-detect
  - ocr-variance
  - sidepanel-alerts
---

# ADR-020: Blindagem Defensiva e Tratamento de Exceções no Pipeline de Extração

## Contexto
Durante o uso diário do **doc2fill**, operadores submetem arquivos reais com condições atípicas: PDFs protegidos por senha de proprietário (`/Encrypt`), imagens com iluminação insuficiente, ruído térmico extremo ou 100% pretas/brancas, e arquivos vazios (0 bytes). Na ausência de detecção heurística preventiva, essas situações provocavam erros silenciosos no console do navegador ou deixavam a interface do Sidepanel em estado de carregamento permanente, frustrando a experiência do usuário.

## Decisão
No contexto de estabilização do pipeline de documentos do Doc2Fill para o encerramento da Sprint 1, enfrentando falhas atípicas de entrada como PDFs criptografados, imagens sem contraste e payloads corrompidos, decidimos por implementar uma camada de blindagem defensiva e sanitização com detecção heurística preventiva de encriptação de PDF (`isPdfEncrypted`), cálculo de contraste/variância em buffers de OCR (`hasSufficientImageContrast`) e renderização de cards de alerta Obsidian Alert no Sidepanel, para alcançar resiliência total a falhas (Zero Crash), feedback imediato ao operador e liberação contínua da interface para edição manual dos 8 campos, aceitando a impossibilidade técnica de extrair texto automaticamente de arquivos criptografados por senha sem a chave correspondente.

### Detalhes da Decisão
1. **Detecção Preventiva de Criptografia em PDFs:**
   - Adicionar a função `isPdfEncrypted(buffer)` que inspeciona a tabela de objetos cruzados do PDF em busca do dicionário `/Encrypt`. Se detectado, retorna `true` imediatamente sem tentar invocar streams protegidas.
2. **Avaliação de Contraste em Imagens de OCR:**
   - Adicionar a função `hasSufficientImageContrast(buffer)` em `core/ocr-engine.js` que amostra a distribuição de tons de cinza. Se a variância for inferior a um limiar mínimo, aborta o OCR com aviso claro.
3. **Cards Defensivos no Sidepanel:**
   - O componente visual de dropzone ganha tratamento dedicado de erro: quando o arquivo não puder ser lido, a dropzone exibe a mensagem de ajuda clara: `"Não foi possível identificar o texto. Preencha manualmente ou envie outra foto"`, reabilitando os botões e permitindo que o usuário digite os dados imediatamente nos 8 campos canônicos.
4. **Sem Falhas Silenciosas no Console:**
   - Todas as chamadas de E/S assíncronas tratam e normalizam mensagens de erro amigáveis sem lançar exceções não capturadas.

## Consequências

### Positivas
- Zero congelamento ou estado de carregamento infinito no Sidepanel da extensão.
- Redução de suporte técnico e frustração do usuário final ao lidar com notas fiscais corrompidas ou protegidas.
- Aderência plena à Regra Tear #25 (tolerância a falhas e recuperação graciosa).

### Negativas
- Pequeno acréscimo de verificações em memória (< 15ms) antes da chamada ao OCR.

### Neutras/Riscos Mitigados
- Risco de falso positivo em PDFs complexos foi mitigado inspecionando especificamente a existência do trailer `/Encrypt` associado à assinatura `%PDF-`.
