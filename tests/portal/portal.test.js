import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Lógica do controlador do formulário governamental de demonstração
 * @param {Object} mockEvent 
 * @returns {Object}
 */
export function handlePortalFormSubmit(mockEvent) {
  if (!mockEvent || typeof mockEvent.preventDefault !== 'function') {
    return { prevented: false, success: false, error: 'Evento inválido' };
  }

  mockEvent.preventDefault();
  return { prevented: true, success: true, message: 'Nota submetida com sucesso no simulador!' };
}

describe('doc2fill Demo Portal Controller (TDD Suite)', () => {
  it('Cenário 1 (Happy Path): deve prevenir o reload padrão da página e confirmar submissão da nota', () => {
    let prevented = false;
    const mockEvent = {
      preventDefault: () => { prevented = true; }
    };

    const res = handlePortalFormSubmit(mockEvent);
    assert.equal(prevented, true);
    assert.equal(res.success, true);
    assert.equal(res.message, 'Nota submetida com sucesso no simulador!');
  });

  it('Cenário 2 (Edge Case): chamadas sucessivas mantêm comportamento idempotente', () => {
    let preventCount = 0;
    const mockEvent = {
      preventDefault: () => { preventCount++; }
    };

    handlePortalFormSubmit(mockEvent);
    handlePortalFormSubmit(mockEvent);
    assert.equal(preventCount, 2);
  });

  it('Cenário 3 (Error Path): rejeita evento nulo ou sem função preventDefault', () => {
    assert.equal(handlePortalFormSubmit(null).success, false);
    assert.equal(handlePortalFormSubmit({}).success, false);
  });
});
