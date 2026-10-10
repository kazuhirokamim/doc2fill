---
numero: 22
titulo: Injetor de Eventos Reativos e Mapeador Semantico de Selects
data: 2026-10-09
status: Aceito
autores:
  - Kazuhiro
  - Tear Maestro
  - Noesis Frontend Maestro
aplica_a:
  - extension
  - tests
tags:
  - content-script
  - reactive-forms
  - angular-material
  - select-matching
  - events-dispatch
---

# ADR-022: Injetor de Eventos Reativos e Mapeador Semântico de Selects

## Contexto
Sistemas governamentais e de gestão corporativa (como o Portal CCHA da AGU e plataformas hospitalares) empregam frameworks SPA reativos como Angular (Reactive Forms, Angular Material) e React. Nesses ambientes, a mera atribuição direta em campos de formulário é ignorada pelo controle de formulário interno do framework, fazendo com que dados preenchidos desapareçam no evento de blur ou na submissão. Da mesma forma, campos do tipo select contêm listas de opções com ligeiras variações semânticas que quebram o preenchimento caso a correspondência dependa de string literal idêntica.

## Decisão
No contexto de injeção no Content Script da Extensão Chrome, enfrentando a perda de reatividade em formulários Angular Material/React e inconsistências na seleção de opções em campos de seleção, decidimos por implementar a função setInputValueWithEvents acionando os setters de protótipo de HTMLInputElement e HTMLTextAreaElement acompanhados do despacho com flags composed: true e bubbles: true de input, InputEvent:insertText, change e blur, combinados a um algoritmo de correspondência semântica O(N) com fallback seguro para opções do tipo Outros, para alcançar preenchimento resiliente e persistente em qualquer framework moderno sem requerer permissões invasivas de depuração, aceitando a necessidade de shims de emulação para testes em Node.js.

### Detalhes da Decisão
1. **Injetor Reativo de Propriedades (setInputValueWithEvents):**
   - Extração do descritor de propriedade value via Object.getOwnPropertyDescriptor.
   - Invocação controlada do setter no elemento de destino para assegurar que observadores reativos do framework detectem a mutação.
2. **Cadeia Completa de Eventos com composed: true:**
   - Despacho de Event('input', { bubbles: true, cancelable: true, composed: true }).
   - Despacho de InputEvent('input', { bubbles: true, cancelable: true, composed: true, inputType: 'insertText', data: val }).
   - Despacho de Event('change', { bubbles: true, cancelable: true, composed: true }).
   - Despacho de Event('blur', { bubbles: true, cancelable: true, composed: true }).
3. **Mapeador Semântico de Selects com Fallback Seguro (S2-T4):**
   - Busca em 3 níveis: exato, grupo semântico (NF-e, NFC-e, DANFE, Recibo, Guia TISS) e fallback defensivo para Outros / Outro / Diversos quando nenhuma correspondência for encontrada.
4. **Suporte a Componentes Específicos:**
   - Detecção e flutuação de rótulos em mat-form-field.
   - Suporte a ng-select e mat-select.

## Consequências

### Positivas
- Zero perda de dados após preenchimento automático em formulários Angular, React e Vue.
- Alta tolerância a variações taxonômicas em selects fiscais e de despesas médicas.
- Código 100% contido em extension/content.js com menos de 450 linhas.

### Negativas
- Necessidade de shimming dos protótipos de DOM nos testes automatizados Node.js.

### Neutras/Riscos Mitigados
- Todos os eventos despachados operam isolados no contexto da página sem interferir com outros scripts e sem retenção de dados de navegação.
