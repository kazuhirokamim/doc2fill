---
numero: 7
titulo: Compatibilidade com Portal CCHAR, Isolamento de Sandbox MV3 e Suporte a Shadow DOM no Autofill
data: 2026-09-25
status: Aceito
autores:
  - Kazuhiro
  - Lucas
aplica_a:
  - core
  - extension
tags:
  - cchar
  - manifest-v3
  - chrome-sandbox
  - shadow-dom
  - angular-reactive-forms
  - autofill
---

# ADR-007: Compatibilidade com Portal CCHAR, Isolamento de Sandbox MV3 e Suporte a Shadow DOM no Autofill

## Contexto
Durante os preparativos para execução de testes práticos de digitalização de documentos e preenchimento de pedidos de reembolso diretamente no portal do Conselho Curador dos Honorários Advocatícios (CCHAR), identificaram-se restrições técnicas no carregamento da extensão no Chrome e na interação com a aplicação web de destino. Especificamente:
1. O Chrome Manifest V3 impõe sandbox rigoroso por pasta de extensão descompactada, bloqueando requisições a arquivos fora da raiz (`../core/`) via `ERR_FILE_NOT_FOUND`.
2. O portal do CCHAR é uma SPA Angular moderna utilizando componentes Angular CDK e Reactive Forms, requerendo eventos de digitação `InputEvent` e localização de elementos encapsulados em Shadow DOM.
3. Telas de upload e preenchimento em sistemas corporativos frequentemente residem em iframes internos.

## Decisão
No contexto de execução de testes de autofill e digitalização de comprovantes diretamente no portal de reembolso do CCHAR, enfrentando o isolamento de sandbox de extensões no Chrome MV3 e componentes Angular reativos com Shadow DOM e iframes, decidimos por espelhar os módulos do core na extensão, habilitar injeção em todos os frames no manifesto, implementar busca recursiva em Shadow DOM com emissão de InputEvent e enriquecer a heurística com termos do CCHAR, para alcançar execução fluida do autofill e anexo de arquivos no portal em tempo real na máquina local com zero retenção de dados, aceitando a manutenção sincronizada dos arquivos do core entre a raiz e a pasta da extensão.

### Detalhes da Decisão
1. **Espelhamento do Core na Extensão**: O diretório `extension/core/` abriga cópias locais dos módulos `matcher.js`, `clinical-translator.js`, `classifier.js` e `validators.js`, com `sidepanel.html` e `sidepanel.js` importando diretamente via `./core/...`.
2. **Configuração de Frames no Manifesto**: O `extension/manifest.json` passa a declarar `"all_frames": true` e `"match_about_blank": true` na chave `content_scripts`.
3. **Travessia de Shadow DOM e Eventos Reativos**: A função `getAllFormElements` varre recursivamente `shadowRoot` de todos os nós do documento e `fillInputElement` emite `new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: val })`.
4. **Vocabulário Heurístico Estendido**: Inclusão de termos identificados no bundle do CCHAR (`cpf_cnpj`, `prestador_nome`, `valor_pago`, `data_pagamento`, `tipo_beneficiario`, `justificativa_clinica`, `arquivo`) no `FISCAL_MAPPINGS`.

## Consequências

### Positivas
- Carregamento da extensão no Chrome (`chrome://extensions`) sem qualquer erro de resolução de módulos ES6.
- Detecção e preenchimento automatizado confiável em formulários Angular do CCHAR.
- Preenchimento transparente mesmo quando o formulário se encontra dentro de iframes ou sob Shadow DOM.
- Preservação integral da política de Zero Retenção e testes de unidade 100% verdes.

### Negativas
- Duplicação física dos módulos do core na pasta `extension/core/`.

### Neutras/Riscos Mitigados
- Risco de dessincronização entre `core/` e `extension/core/` mitigado por suíte automatizada de testes de regressão que valida a integridade funcional de ambas as frentes.
