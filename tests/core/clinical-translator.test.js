import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  translateClinicalProcedure, 
  ClinicalOntologyEngine,
  CLINICAL_ONTOLOGY_DICTIONARY 
} from '../../core/clinical-translator.js';

describe('doc2fill Clinical Translator & Anti-Glosa Engine (TDD Suite)', () => {
  describe('translateClinicalProcedure', () => {
    it('Cenário 1 (Happy Path): converte termos estéticos leigos para nomenclatura TUSS/ANS técnica e casada', () => {
      // 1.1 Lente de contato dental / faceta
      const dentalResult = translateClinicalProcedure('Lente de contato dental nos dentes anteriores');
      assert.equal(dentalResult.matched, true);
      assert.equal(dentalResult.category, 'odontologia');
      assert.equal(dentalResult.natureza, 'Não Cirúrgico (Ambulatorial)');
      assert.ok(dentalResult.descricaoTecnica.includes('Reabilitação funcional'));
      assert.ok(dentalResult.motivoNecessidade.includes('desgaste oclusal'));

      // 1.2 Implante Capilar / Alopecia
      const capilarResult = translateClinicalProcedure('Sessão de implante capilar fio a fio');
      assert.equal(capilarResult.matched, true);
      assert.equal(capilarResult.category, 'dermatologia');
      assert.equal(capilarResult.natureza, 'Cirúrgico');
      assert.ok(capilarResult.descricaoTecnica.includes('Alopecia'));
      assert.ok(capilarResult.motivoNecessidade.toLowerCase().includes('atrofia folicular'));

      // 1.3 Toxina Botulínica (Botox)
      const botoxResult = translateClinicalProcedure('Aplicação de Botox facial');
      assert.equal(botoxResult.matched, true);
      assert.ok(botoxResult.descricaoTecnica.includes('Toxina Botulínica Tipo A'));
      assert.ok(botoxResult.motivoNecessidade.includes('distonia') || botoxResult.motivoNecessidade.includes('bruxismo'));

      // 1.4 Rinoplastia
      const rinoResult = translateClinicalProcedure('Cirurgia de rinoplastia');
      assert.equal(rinoResult.matched, true);
      assert.equal(rinoResult.natureza, 'Cirúrgico');
      assert.ok(rinoResult.descricaoTecnica.includes('Rinosseptoplastia funcional'));
    });

    it('Cenário 2 (Edge Case): lida com variações de acentuação, maiúsculas/minúsculas e termos não estéticos', () => {
      // Variações de maiúsculas e acentos
      const resultUpper = translateClinicalProcedure('TRATAMENTO COM LENTES DE CONTATO');
      assert.equal(resultUpper.matched, true);

      // Termo não cadastrado no dicionário estético (preserva descrição original com dignidade e tom profissional)
      const consultaComum = translateClinicalProcedure('Consulta Médica Cardiológica de Rotina');
      assert.equal(consultaComum.matched, false);
      assert.equal(consultaComum.descricaoTecnica, 'Consulta Médica Cardiológica de Rotina');
      assert.equal(consultaComum.motivoNecessidade, 'Avaliação e acompanhamento clínico especializado.');
      assert.equal(consultaComum.natureza, 'Não Cirúrgico (Ambulatorial)');
    });

    it('Cenário 3 (Error Path): lida com entradas nulas, vazias ou tipos inválidos sem quebrar', () => {
      assert.deepEqual(translateClinicalProcedure(null), {
        matched: false,
        descricaoTecnica: '',
        motivoNecessidade: '',
        natureza: 'Não Cirúrgico (Ambulatorial)'
      });

      assert.deepEqual(translateClinicalProcedure(''), {
        matched: false,
        descricaoTecnica: '',
        motivoNecessidade: '',
        natureza: 'Não Cirúrgico (Ambulatorial)'
      });

      assert.deepEqual(translateClinicalProcedure(12345), {
        matched: false,
        descricaoTecnica: '',
        motivoNecessidade: '',
        natureza: 'Não Cirúrgico (Ambulatorial)'
      });
    });
  });

  describe('ClinicalOntologyEngine (Strategy Pattern)', () => {
    it('permite registrar novos termos dinamicamente e trocar de estratégia', () => {
      const engine = new ClinicalOntologyEngine();
      engine.registerProcedure('bichectomia', {
        category: 'odontologia',
        natureza: 'Cirúrgico',
        descricaoTecnica: 'Intervenção para remoção de corpo adiposo bucal por mordedura crônica jugal',
        motivoNecessidade: 'Trauma mastigatório recorrente da mucosa jugal com risco de lesão tecidual contínua'
      });

      const res = engine.translate('Paciente realizou bichectomia bilateral');
      assert.equal(res.matched, true);
      assert.ok(res.descricaoTecnica.includes('mordedura crônica'));
    });
  });
});
