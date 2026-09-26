---
numero: 8
titulo: Motor de OCR Server-Side para Fotos Mobile e Suporte a Angular Reactive Forms no CCHA
data: 2026-09-25
status: Aceito
autores:
  - Kazuhiro
  - Lucas
aplica_a:
  - core
  - server
  - extension
  - mobile-pwa
tags:
  - ocr
  - tesseract
  - ccha
  - angular-reactive-forms
  - ng-select
  - mat-select
---

# ADR-008: Motor de OCR Server-Side para Fotos Mobile e Suporte a Angular Reactive Forms no CCHA

## Contexto
Durante os testes práticos de validação no portal do Conselho Curador dos Honorários Advocatícios (CCHA), constatou-se que o envio de fotos capturadas pelo smartphone após leitura do QR Code não extraía nenhum dado textual, resultando na transmissão apenas do anexo bruto e de dados de demonstração estáticos. Uma inspeção minuciosa na base de código e no bundle de produção do CCHA revelou dois fatores críticos:
1. Ausência de motor de OCR (Visão Computacional): o repositório possuía apenas parser de texto ASCII para PDFs nativos e nenhum mecanismo de extração óptica de caracteres em imagens JPEG/PNG ou documentos digitalizados.
2. Incompatibilidade com Angular Ivy e Reactive Forms: o CCHA é construído em Angular com componentes `[formControlName]`, `ng-select` e `mat-select`. O `content.js` buscava apenas tags HTML tradicionais e não disparava os eventos do ciclo reativo do Angular (`InputEvent` com `insertText`, `change`, `blur`), impedindo o preenchimento automático.

## Decisão
No contexto de processamento de fotos de documentos tiradas pelo celular e preenchimento de formulários no portal do CCHA, enfrentando a ausência de motor de visão computacional e a estrutura reativa do Angular com ng-select e mat-select, decidimos por implementar motor de OCR local no servidor Node.js com Tesseract.js e adaptar o content script com suporte nativo a formControlName e componentes reativos Angular, para alcançar extração óptica em tempo real de fotos mobile com preenchimento automatizado confiável e sem retenção de dados, aceitando o acréscimo da biblioteca tesseract.js no backend local e o download inicial do modelo de idioma em memória cache local.

### Detalhes da Decisão
1. **Pipeline de OCR Local em Memória RAM**: Implementação do módulo `core/ocr-engine.js` acoplado ao servidor `server/demo-server.js` (rota `/api/ocr`), processando buffers de imagem via Tesseract.js em português e extraindo metadados estruturados (CPF, OAB, Processo, Nome, Banco, Agência, Conta, Valor) através do `core/document-parser.js`.
2. **Integração no Mobile PWA**: O `mobile-pwa/scanner.js` submete a foto capturada ao endpoint `/api/ocr` do relay local e transmite imediatamente os dados extraídos reais para a extensão.
3. **Adaptador Angular Reactive Forms**: O `extension/content.js` passa a inspecionar atributos `formcontrolname`, `ng-reflect-name`, nós `<mat-form-field>` e tags `<mat-label>`, operando sobre `<input>`, `<ng-select>` e `<mat-select>` com despacho de eventos `InputEvent`, `change` e `blur`.
4. **Preservação de Zero Retenção**: Imagens e buffers são descartados da memória RAM imediatamente após o término do processamento óptico.

## Consequências

### Positivas
- Extração de texto real e instantânea a partir de qualquer foto tirada pela câmera do celular ou documento anexado.
- Preenchimento 100% automatizado e compatível com as regras de validação reativa do Angular no CCHA.
- Dispositivo móvel não sofre aquecimento nem sobrecarga de CPU, pois o processamento de visão computacional é executado no Node.js local.
- Preservação inegociável da privacidade e conformidade estrita com LGPD (Zero Retenção).

### Negativas
- Adição da dependência `tesseract.js` ao `package.json` do backend Node.js.
- Primeira execução de OCR exige cache local do dataset de linguagem treinado para português (`por.traineddata`).

### Neutras/Riscos Mitigados
- Risco de latência de OCR em imagens pesadas mitigado por pré-processamento de escala e execução isolada em worker thread assíncrono.
- Risco de seletores Angular não nativos mitigado pela combinação de `formControlName`, busca semântica em `mat-label` e fallback para dispatch manual de eventos.
