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

/**
 * Valida e higieniza os campos enviados pelo formulário do portal
 * @param {Object} formData
 * @returns {{ valid: boolean, errors: string[], data?: Object }}
 */
export function validatePortalFormData(formData) {
  if (!formData || typeof formData !== 'object') {
    return { valid: false, errors: ['Dados do formulário ausentes ou inválidos'] };
  }

  const errors = [];
  const cnpjOrCpf = (formData.cnpj_prestador || formData.cnpj || '').trim();
  const valor = (formData.valor_bruto || formData.valor || '').trim();

  if (!cnpjOrCpf && !formData.razao_social) {
    errors.push('Informe ao menos o CNPJ/CPF ou Razão Social do prestador');
  }

  if (!valor) {
    errors.push('Informe o valor bruto do documento');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    data: {
      tipo_documento: formData.tipo_documento || 'nota_fiscal',
      beneficiario: formData.beneficiario || 'titular',
      natureza: formData.natureza || 'nao_cirurgico',
      cnpj_prestador: cnpjOrCpf,
      razao_social: (formData.razao_social || '').trim(),
      valor_bruto: valor,
      data_emissao: formData.data_emissao || '',
      cod_servico: formData.cod_servico || '',
      descricao_servico: (formData.descricao_servico || '').trim(),
      motivo: (formData.motivo || '').trim(),
      hasAnexo: Boolean(formData.anexo_documento || formData.hasAttachment)
    }
  };
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

  describe('validatePortalFormData (Reimbursement & Fiscal Form Data)', () => {
    it('Cenário 1 (Happy Path): valida e normaliza formulário completo de reembolso de saúde com anexo', () => {
      const payload = {
        tipo_documento: 'recibo',
        beneficiario: 'dependente',
        natureza: 'cirurgico',
        cnpj_prestador: '12.345.678/0001-90',
        razao_social: 'Dr. Roberto Clínico',
        valor_bruto: 'R$ 4.500,00',
        data_emissao: '2026-09-15',
        descricao_servico: 'Procedimento cirúrgico reconstrutivo',
        motivo: 'Tratamento reparador de sequela funcional',
        anexo_documento: 'recibo_dr_roberto.pdf'
      };

      const result = validatePortalFormData(payload);
      assert.equal(result.valid, true);
      assert.equal(result.data.tipo_documento, 'recibo');
      assert.equal(result.data.beneficiario, 'dependente');
      assert.equal(result.data.natureza, 'cirurgico');
      assert.equal(result.data.hasAnexo, true);
      assert.equal(result.data.motivo, 'Tratamento reparador de sequela funcional');
    });

    it('Cenário 2 (Edge Case): aceita dados fiscais mínimos atribuindo defaults seguros aos campos de saúde', () => {
      const minimal = {
        cnpj: '33.000.167/0001-01',
        valor: 'R$ 100,00'
      };

      const result = validatePortalFormData(minimal);
      assert.equal(result.valid, true);
      assert.equal(result.data.beneficiario, 'titular');
      assert.equal(result.data.tipo_documento, 'nota_fiscal');
      assert.equal(result.data.hasAnexo, false);
    });

    it('Cenário 3 (Error Path): rejeita entradas nulas ou com campos obrigatórios ausentes', () => {
      assert.equal(validatePortalFormData(null).valid, false);
      assert.equal(validatePortalFormData({}).valid, false);
      assert.equal(validatePortalFormData({ cnpj_prestador: '123' }).valid, false);
    });
  });
});
