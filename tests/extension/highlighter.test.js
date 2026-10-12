// tests/extension/highlighter.test.js
// Suíte TDD para o Highlighter Visual de Preenchimento de Formulários (Feedback Reativo)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { highlightFilledElement } from '../../extension/content.js';

describe('extension/content.js - Highlighter Visual de Formulários (TDD)', () => {
  it('Cenário 1 (Happy Path): aplica borda ciano e glow no elemento e restaura estilo após duração', async () => {
    const mockElement = {
      style: {
        outline: '',
        boxShadow: '',
        transition: ''
      }
    };

    highlightFilledElement(mockElement, 50);

    // Imediatamente após aplicação:
    assert.equal(mockElement.style.outline, '2px solid #00D2FF');
    assert.ok(mockElement.style.boxShadow.includes('rgba(0, 210, 255'));
    assert.ok(mockElement.style.transition.includes('0.3s'));

    // Aguarda o término da duração
    await new Promise((resolve) => setTimeout(resolve, 70));

    assert.equal(mockElement.style.outline, '');
    assert.equal(mockElement.style.boxShadow, '');
    assert.equal(mockElement.style.transition, '');
  });

  it('Cenário 2 (Edge Case): preserva estilos inline pré-existentes do formulário hospedeiro', async () => {
    const mockElement = {
      style: {
        outline: '1px solid black',
        boxShadow: 'none',
        transition: 'color 0.2s'
      }
    };

    highlightFilledElement(mockElement, 40);
    assert.equal(mockElement.style.outline, '2px solid #00D2FF');

    await new Promise((resolve) => setTimeout(resolve, 60));

    // Estilos pré-existentes restaurados com fidelidade
    assert.equal(mockElement.style.outline, '1px solid black');
    assert.equal(mockElement.style.boxShadow, 'none');
    assert.equal(mockElement.style.transition, 'color 0.2s');
  });

  it('Cenário 3 (Error Path): chamadas com elemento nulo, indefinido ou sem style não disparam erro', () => {
    assert.doesNotThrow(() => highlightFilledElement(null, 50));
    assert.doesNotThrow(() => highlightFilledElement(undefined, 50));
    assert.doesNotThrow(() => highlightFilledElement({}, 50));
    assert.doesNotThrow(() => highlightFilledElement({ style: null }, 50));
  });
});
