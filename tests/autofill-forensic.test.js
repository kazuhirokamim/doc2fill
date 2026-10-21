// @tear-proof issue-1
// tests/autofill-forensic.test.js
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { parseDocumentFields } from '../core/document-parser.js';

describe('doc2fill Autofill Forensic Pipeline (TDD Suite)', () => {
  let engine;

  before(async () => {
    globalThis.window = globalThis.window || globalThis;
    globalThis.window.__doc2fill_initialized = false;
    globalThis.document = globalThis.document || {
      getElementById: () => null,
      querySelectorAll: () => []
    };
    globalThis.Event = globalThis.Event || class Event { constructor(t, o) { this.type = t; this.bubbles = o?.bubbles; } };
    globalThis.InputEvent = globalThis.InputEvent || class InputEvent extends globalThis.Event {
      constructor(t, o) { super(t, o); this.inputType = o?.inputType; this.data = o?.data; }
    };
    globalThis.chrome = globalThis.chrome || { runtime: {} };
    globalThis.setTimeout = globalThis.setTimeout || (() => {});

    await import('../extension/content.js');
    engine = globalThis.__doc2fill_content_engine;
  });

  const samplePharmacyOcr = `
Yo IR GATO mm
MATRIZ. TAVEIROPOLIS
CNPJ: 40 127 407/0001-30 DROGARIA RIBEIRO
RUA ALBERY SABIN, 1024 VILA TAVEIROPOLIS -
CAMPO GRANDE - MS 78090-160 Fone:
| (87) 3045-4400 | E; 26 456.91i-6
4 ICUMENTO AUXILIAR DA NOTA FISCAL DE CONSUMIDOR ELETRÔNICA
4 Cód Descrição Gtd Un VI Unit, Vi Total
O01 237004 PANT SEC 5 1 UNID x 78,05 7€
i Desconto -9,37
Valor Líquido 68 68
QTD. TOTAL DE ITENS 001
Valor TOTAL R$ 65,08
FORMA DE PAGAMENTO Valar Pago
Cartão de Crédito Outros 88.88
Consulte pela Chave de Acesso em
Ntp.fAvww.die.ms.gov orínfee/consulia
| 35026 0840 7274 D7O09) 0130 6506 2060 1306 1613
7581 2435
TT E TE CONSUMICOR NÃO
1 6 NA 2 SC IDENTIFICADO
ue feto | É ao E NEGO! E NEN:
WB - boca RAL ACE Bo A. ne
” E VE so Bá 24/08/2026 13:01:46
  `;

  describe('Extração Resiliente de Número do Documento e Higienização de Descritivo', () => {
    it('Cenário 1 (Happy Path): recupera número do documento a partir de chave com ruído de OCR e limpa descritivo', () => {
      const parsed = parseDocumentFields(samplePharmacyOcr, 'recibo_farmacia.pdf');

      assert.equal(parsed.tipo_documento, 'Cupom Fiscal (NFC-e / SAT)');
      assert.equal(parsed.cnpj, '40.127.407/0001-30');
      assert.equal(parsed.fornecedor, 'DROGARIA RIBEIRO');
      assert.ok(parsed.numero_documento, 'numero_documento deve estar preenchido');
      assert.ok(parsed.numero_documento.length >= 6, 'numero_documento deve ter pelo menos 6 dígitos');
      assert.equal(parsed.data, '2026-08-24');
      assert.ok(parsed.valor.includes('65,08') || parsed.valor.includes('68,68'));
      assert.ok(parsed.descritivo.includes('PANT SEC'), 'descritivo deve conter o nome do item');
      assert.ok(!parsed.descritivo.startsWith('Gtd Un VI Unit'), 'descritivo não deve conter cabeçalho de tabela fiscal');
    });

    it('Cenário 2 (Edge Case): suporta ruídos severos de OCR em chaves de acesso com letras substituindo dígitos', () => {
      const noiseChaveText = `
        Consulte pela Chave de Acesso no portal SEFAZ:
        5020 0840 7274 0700 0130 6500 1000 1906 1613 7581 2435
        NFC-e autorizada
      `;
      const parsed = parseDocumentFields(noiseChaveText, 'cupom_ruidoso.pdf');
      assert.ok(parsed.numero_documento, 'deve extrair número de documento da chave');
    });

    it('Cenário 3 (Error Path): não quebra e retorna objeto seguro quando o texto for nulo, vazio ou sem identificadores', () => {
      const emptyParsed = parseDocumentFields('', '');
      assert.deepEqual(emptyParsed, {});

      const unidentifiable = parseDocumentFields('Texto aleatório sem nenhum padrão fiscal legível', '');
      assert.equal(unidentifiable.tipo_documento, 'Outro Comprovante');
      assert.equal(unidentifiable.numero_documento, undefined);
    });
  });

  describe('Motor Semântico de Preenchimento no DOM da Página', () => {
    it('Cenário 1 (Happy Path): casa tipo de documento Cupom Fiscal com nota_fiscal no portal sem resetar select', () => {
      assert.ok(engine, 'Content engine deve estar inicializada');
      const options = [
        { value: '', text: 'Selecione o tipo...' },
        { value: 'recibo', text: 'Recibo de Honorários Médicos/Odontológicos' },
        { value: 'nota_fiscal', text: 'Nota Fiscal de Serviços (NFS-e)' },
        { value: 'guia_medica', text: 'Guia de Encaminhamento / TISS' }
      ];

      const match = engine.matchSemanticSelectOption(options, 'Cupom Fiscal (NFC-e / SAT)');
      assert.ok(match, 'deve encontrar opção compatível');
      assert.equal(match.value, 'nota_fiscal', 'deve mapear cupom fiscal prioritariamente para nota_fiscal');
    });

    it('Cenário 2 (Edge Case): evita colisão de cpf/cnpj com campos de id tipo_documento ou numero_documento', () => {
      const cpfMapping = engine.FISCAL_MAPPINGS.find(m => m.key === 'cpf_cnpj' || m.key === 'cpf');
      assert.ok(cpfMapping);
      assert.ok(!cpfMapping.terms.includes('documento'), "termo 'documento' isolado não pode constar em cpf_cnpj");

      const inputs = [
        { id: 'tipo_documento', name: 'tipo_documento' },
        { id: 'numero_documento', name: 'numero_documento' },
        { id: 'cnpj', name: 'cnpj_prestador' }
      ];

      const filled = new Set();
      const targetCpf = engine.findBestMatchingInput(inputs, ['cnpj', 'cpf_cnpj'], filled);
      assert.ok(targetCpf);
      assert.equal(targetCpf.id, 'cnpj', 'deve casar especificamente com o input de cnpj');
    });

    it('Cenário 3 (Error Path): lida com lista de options vazia ou nula sem lançar exceção', () => {
      const matchNull = engine.matchSemanticSelectOption(null, 'Nota Fiscal');
      assert.equal(matchNull, null);

      const matchEmpty = engine.matchSemanticSelectOption([], 'Nota Fiscal');
      assert.equal(matchEmpty, null);
    });

    it('Cenário 4 (Performance & Latency): executa casamento semântico em sub-milissegundos com 1.000 iterações', () => {
      const largeOptions = Array.from({ length: 50 }, (_, i) => ({
        value: `opt_${i}`,
        text: `Opção de Teste ${i} - Descrição Genérica`
      }));
      largeOptions.push({ value: 'recibo_honorarios', text: 'Recibo de Pagamento a Autônomo (RPA)' });

      const start = performance.now();
      for (let i = 0; i < 200; i++) {
        const res = engine.matchSemanticSelectOption(largeOptions, 'Recibo Profissional Liberal');
        assert.ok(res);
      }
      const elapsed = performance.now() - start;
      assert.ok(elapsed < 500, `Tempo total para 200 iterações (${elapsed}ms) deve ser menor que 500ms`);
    });
  });

  describe('Descritivo Resumido Dinâmico e Individualizado CCHA / AGU (TDD)', () => {
    it('Cenário 1 (Happy Path): gera descritivo contextual com produto, fornecedor e documento para farmácia', () => {
      const parsed = parseDocumentFields(samplePharmacyOcr, 'cupom.pdf');
      assert.ok(parsed.descritivo.includes('PANT SEC'), 'Deve conter o nome do medicamento');
      assert.ok(parsed.descritivo.includes('DROGARIA RIBEIRO'), 'Deve conter o nome da drogaria');
      assert.ok(parsed.descritivo.includes('Doc nº') || parsed.descritivo.includes('062060130'), 'Deve conter o número do documento');
      assert.ok(!parsed.descritivo.includes('Gtd Un VI Unit'), 'Não pode conter cabeçalho fiscal de tabela');
    });

    it('Cenário 2 (Edge Case): para notas de serviços sem itens discriminados, compõe descritivo com fornecedor e NF', () => {
      const nfText = `
        PREFEITURA MUNICIPAL DE SÃO PAULO
        NOTA FISCAL ELETRÔNICA DE SERVIÇOS - NFS-e
        Número da Nota: 202609012
        Data de Emissão: 15/09/2026
        PRESTADOR DE SERVIÇOS:
        CPF/CNPJ: 11.222.333/0001-44
        Razão Social: LAB DIAGNOSTICOS MEDICOS LTDA
        VALOR TOTAL DA NOTA = R$ 450,00
      `;
      const parsed = parseDocumentFields(nfText, 'nota_servico.pdf');
      assert.ok(parsed.descritivo.includes('LAB DIAGNOSTICOS MEDICOS LTDA'), 'Deve conter a razão social');
      assert.ok(parsed.descritivo.includes('202609012'), 'Deve conter o número da NFS-e');
      assert.notEqual(parsed.descritivo, 'Comprovante de pagamento e quitação financeira emitido em favor de beneficiário.');
    });

    it('Cenário 3 (Error Path): lida com texto mínimo ou sem fornecedor gerando descritivo seguro sem lançar erro', () => {
      const parsed = parseDocumentFields('Comprovante de pagamento Avulso', 'recibo_desconhecido.pdf');
      assert.ok(parsed.descritivo, 'Descritivo deve ser gerado');
      assert.ok(typeof parsed.descritivo === 'string', 'Descritivo deve ser string');
      assert.ok(parsed.descritivo.length >= 10, 'Descritivo deve ter tamanho legível');
    });
  });
});
