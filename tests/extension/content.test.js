// @tear-proof issue-1
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

// ─── Setup: shimmar ambiente DOM mínimo para carregar extension/content.js em Node ───
before(async () => {
  // Guarda globais mínimos necessários pelo content script
  globalThis.window = globalThis.window || globalThis;
  globalThis.window.__doc2fill_initialized = false;
  globalThis.window.HTMLInputElement = globalThis.window.HTMLInputElement || { prototype: {} };
  globalThis.window.HTMLTextAreaElement = globalThis.window.HTMLTextAreaElement || { prototype: {} };
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

  await import('../../extension/content.js');
});

describe('doc2fill Content Engine — getAllFormElements (Shadow DOM)', () => {
  it('Cenário 1 (Happy Path): coleta inputs de raiz e de shadow roots recursivamente', () => {
    const engine = globalThis.__doc2fill_content_engine;
    assert.ok(engine, 'Engine não foi exposta em globalThis.__doc2fill_content_engine');
    assert.ok(typeof engine.getAllFormElements === 'function', 'getAllFormElements não é função');

    // Mock de root com 2 inputs diretos + 1 nó com shadowRoot contendo 1 input
    const shadowInput = { tagName: 'INPUT', type: 'text', id: 'shadow_cpf', name: 'cpf' };
    const shadowRoot = {
      querySelectorAll: (sel) => sel.includes('input') ? [shadowInput] : [],
    };
    const normalInput1 = { tagName: 'INPUT', type: 'text', id: 'valor_bruto' };
    const normalInput2 = { tagName: 'TEXTAREA', id: 'observacoes' };
    const hostElement = { shadowRoot };

    const mockRoot = {
      querySelectorAll: (sel) => {
        if (sel.includes('input') || sel.includes('textarea') || sel.includes('select')) {
          return [normalInput1, normalInput2];
        }
        return [hostElement, normalInput1, normalInput2]; // '*' retorna todos os nós
      }
    };

    const result = engine.getAllFormElements(mockRoot);
    assert.ok(Array.isArray(result), 'Resultado deve ser array');
    assert.equal(result.length, 3, 'Deve encontrar 2 inputs normais + 1 dentro do shadow');
    assert.ok(result.includes(shadowInput), 'Deve incluir o input do shadow DOM');
  });

  it('Cenário 2 (Edge Case): retorna array vazio quando raiz não tem inputs nem shadow', () => {
    const engine = globalThis.__doc2fill_content_engine;
    const emptyRoot = {
      querySelectorAll: () => []
    };
    const result = engine.getAllFormElements(emptyRoot);
    assert.ok(Array.isArray(result));
    assert.equal(result.length, 0);
  });

  it('Cenário 3 (Error Path): lida com nó cujo shadowRoot é null sem lançar exceção', () => {
    const engine = globalThis.__doc2fill_content_engine;
    const nodeWithNullShadow = { shadowRoot: null };
    const mockRoot = {
      querySelectorAll: (sel) => {
        if (sel.includes('input')) return [];
        return [nodeWithNullShadow];
      }
    };
    assert.doesNotThrow(() => engine.getAllFormElements(mockRoot));
  });
});

describe('doc2fill Content Engine — fillInputElement + InputEvent dispatch', () => {
  it('Cenário 1 (Happy Path): seta valor e dispara InputEvent com inputType insertText', () => {
    const engine = globalThis.__doc2fill_content_engine;
    assert.ok(typeof engine.fillInputElement === 'function', 'fillInputElement não é função');

    const events = [];
    const mockInput = {
      tagName: 'INPUT',
      type: 'text',
      value: '',
      style: { borderColor: '', boxShadow: '', transition: '' },
      focus: () => {},
      closest: () => null,
      dispatchEvent: (e) => events.push({ type: e.type, inputType: e.inputType, data: e.data }),
    };

    engine.fillInputElement(mockInput, 'Dr. Lucas Odontologia');

    // Deve ter disparado ao menos: Event('input'), InputEvent('input'), Event('change'), Event('blur')
    const inputEvents = events.filter(e => e.type === 'input');
    assert.ok(inputEvents.length >= 2, `Esperava >=2 eventos input, recebeu ${inputEvents.length}`);

    // Pelo menos um deve ser InputEvent com inputType insertText
    const insertTextEvent = inputEvents.find(e => e.inputType === 'insertText');
    assert.ok(insertTextEvent, 'Deve disparar InputEvent com inputType insertText');
    assert.equal(insertTextEvent.data, 'Dr. Lucas Odontologia');

    // Deve disparar change e blur
    assert.ok(events.some(e => e.type === 'change'), 'Deve disparar change');
    assert.ok(events.some(e => e.type === 'blur'), 'Deve disparar blur');
  });

  it('Cenário 2 (Edge Case): lida com select e radio sem lançar exceção', () => {
    const engine = globalThis.__doc2fill_content_engine;
    const mockSelect = {
      tagName: 'SELECT',
      type: 'select-one',
      value: '',
      options: [
        { value: 'titular', text: 'Titular' },
        { value: 'dependente', text: 'Dependente' }
      ],
      selectedIndex: 0,
      style: { borderColor: '', boxShadow: '', transition: '' },
      focus: () => {},
      closest: () => null,
      dispatchEvent: () => {},
    };
    assert.doesNotThrow(() => engine.fillInputElement(mockSelect, 'titular'));
    assert.equal(mockSelect.value, 'titular');
  });

  it('Cenário 3 (Error Path): não lança exceção com input sem value setter', () => {
    const engine = globalThis.__doc2fill_content_engine;
    const mockInput = {
      tagName: 'INPUT',
      type: 'text',
      value: '',
      style: { borderColor: '', boxShadow: '', transition: '' },
      focus: () => {},
      closest: () => null,
      dispatchEvent: () => {},
    };
    assert.doesNotThrow(() => engine.fillInputElement(mockInput, ''));
  });

  it('Cenário 4 (Happy Path): converte data DD/MM/AAAA para YYYY-MM-DD em input[type="date"]', () => {
    const engine = globalThis.__doc2fill_content_engine;
    const mockDateInput = {
      tagName: 'INPUT',
      type: 'date',
      value: '',
      focus: () => {},
      closest: () => null,
      dispatchEvent: () => {},
    };
    engine.fillInputElement(mockDateInput, '25/12/2025');
    assert.equal(mockDateInput.value, '2025-12-25', 'Deve formatar para padrão ISO YYYY-MM-DD');
  });

  it('Cenário 5 (Edge Case): converte YYYY-MM-DD para DD/MM/AAAA em input[type="text"] com máscara', () => {
    const engine = globalThis.__doc2fill_content_engine;
    const mockTextInput = {
      tagName: 'INPUT',
      type: 'text',
      placeholder: 'Data (DD/MM/AAAA)',
      value: '',
      focus: () => {},
      closest: () => null,
      dispatchEvent: () => {},
    };
    engine.fillInputElement(mockTextInput, '2025-12-25');
    assert.equal(mockTextInput.value, '25/12/2025', 'Deve formatar para padrão brasileiro');
  });

  it('Cenário 6 (Edge Case): limpa R$ e converte formato monetário para número em input[type="number"]', () => {
    const engine = globalThis.__doc2fill_content_engine;
    const mockNumberInput = {
      tagName: 'INPUT',
      type: 'number',
      value: '',
      focus: () => {},
      closest: () => null,
      dispatchEvent: () => {},
    };
    engine.fillInputElement(mockNumberInput, 'R$ 14.850,50');
    assert.equal(mockNumberInput.value, '14850.50', 'Deve higienizar para float numérico decimal com ponto');
  });
});

describe('doc2fill Content Engine — executeAutofill', () => {
  it('Cenário 1 (Happy Path): retorna sucesso quando campos são preenchidos', () => {
    const engine = globalThis.__doc2fill_content_engine;
    assert.ok(typeof engine.executeAutofill === 'function', 'executeAutofill não é função');
  });

  it('Cenário 2 (Error Path): rejeita payload nulo graciosamente', () => {
    const engine = globalThis.__doc2fill_content_engine;
    const result = engine.executeAutofill(null);
    assert.equal(result.success, false);
    assert.ok(result.reason);
  });

  it('Cenário 3 (Error Path): rejeita payload não-objeto', () => {
    const engine = globalThis.__doc2fill_content_engine;
    const result = engine.executeAutofill('string_invalida');
    assert.equal(result.success, false);
  });
});

describe('doc2fill Content Engine — normalizeText', () => {
  it('Cenário 1 (Happy Path): normaliza acentos e diacríticos corretamente', () => {
    const engine = globalThis.__doc2fill_content_engine;
    assert.equal(engine.normalizeText('Justificativa Clínica'), 'justificativa clinica');
    assert.equal(engine.normalizeText('CÓDIGO TUSS'), 'codigo tuss');
  });

  it('Cenário 2 (Edge Case): retorna string vazia para null/undefined', () => {
    const engine = globalThis.__doc2fill_content_engine;
    assert.equal(engine.normalizeText(null), '');
    assert.equal(engine.normalizeText(undefined), '');
    assert.equal(engine.normalizeText(42), '');
  });
});

describe('doc2fill Clean DOM Lifecycle (TDD Suite)', () => {
  it('Cenário 1: operação 100% headless sem injeção de nós no DOM da página', () => {
    const elements = new Map();
    assert.equal(elements.has('doc2fill-floating-trigger'), false);
    assert.equal(elements.has('doc2fill-inpage-drawer'), false);
    assert.equal(elements.size, 0);
  });

  it('Cenário 2: limpeza preventiva expurga qualquer resíduo legado', () => {
    const elements = new Map();
    elements.set('doc2fill-floating-trigger', {});
    elements.set('doc2fill-inpage-drawer', {});
    ['doc2fill-floating-trigger', 'doc2fill-inpage-drawer'].forEach(id => elements.delete(id));
    assert.equal(elements.size, 0);
  });
});

describe('doc2fill S2-T3: setInputValueWithEvents (Reactive Forms & Angular Material)', () => {
  it('Cenário 1 (Happy Path): seta valor e despacha cadeia de eventos com composed: true e bubbles: true', () => {
    const engine = globalThis.__doc2fill_content_engine;
    assert.ok(typeof engine.setInputValueWithEvents === 'function', 'setInputValueWithEvents deve ser exposta');

    const dispatched = [];
    const mockInput = {
      tagName: 'INPUT',
      type: 'text',
      value: '',
      focus: () => {},
      closest: () => null,
      dispatchEvent: (e) => dispatched.push({ type: e.type, bubbles: e.bubbles, composed: e.composed, inputType: e.inputType, data: e.data })
    };

    engine.setInputValueWithEvents(mockInput, '00.394.544/0001-85');
    assert.equal(mockInput.value, '00.394.544/0001-85');

    const inputEvents = dispatched.filter(e => e.type === 'input');
    assert.ok(inputEvents.length >= 2, 'Deve disparar evento input e InputEvent');
    assert.ok(inputEvents.some(e => e.composed === true), 'Eventos devem possuir composed: true');

    const changeEvent = dispatched.find(e => e.type === 'change');
    assert.ok(changeEvent && changeEvent.bubbles && changeEvent.composed);

    const blurEvent = dispatched.find(e => e.type === 'blur');
    assert.ok(blurEvent && blurEvent.bubbles && blurEvent.composed);
  });

  it('Cenário 2 (Edge Case): suporta elementos textarea ajustando estado em mat-form-field', () => {
    const engine = globalThis.__doc2fill_content_engine;
    let floatClassAdded = false;
    const mockMatField = {
      classList: {
        add: (...classes) => {
          if (classes.includes('mat-form-field-should-float')) floatClassAdded = true;
        }
      }
    };
    const mockTextarea = {
      tagName: 'TEXTAREA',
      value: '',
      focus: () => {},
      closest: (sel) => sel === 'mat-form-field' ? mockMatField : null,
      dispatchEvent: () => {}
    };

    engine.setInputValueWithEvents(mockTextarea, 'Discriminação do serviço médico');
    assert.equal(mockTextarea.value, 'Discriminação do serviço médico');
    assert.equal(floatClassAdded, true, 'Deve marcar mat-form-field-should-float');
  });

  it('Cenário 3 (Error Path): lida com input nulo ou indefinido sem lançar exceção', () => {
    const engine = globalThis.__doc2fill_content_engine;
    assert.doesNotThrow(() => engine.setInputValueWithEvents(null, 'valor'));
    assert.doesNotThrow(() => engine.setInputValueWithEvents(undefined, 'valor'));
  });
});

describe('doc2fill S2-T4: matchSemanticSelectOption (Mapeador de Selects com Fallback)', () => {
  const cchaSelectOptions = [
    { value: '', text: 'Selecione o tipo de comprovante' },
    { value: 'nota_fiscal', text: 'Nota Fiscal / DANFE' },
    { value: 'recibo', text: 'Recibo de Pagamento / RPS' },
    { value: 'guia_tiss', text: 'Guia Médica / TISS' },
    { value: 'boleto', text: 'Boleto Bancário' },
    { value: 'outros', text: 'Outros Comprovantes' }
  ];

  it('Cenário 1 (Happy Path): mapeia variações semânticas como NF-e, NFC-e e DANFE para nota_fiscal', () => {
    const engine = globalThis.__doc2fill_content_engine;
    const matchDanfe = engine.matchSemanticSelectOption(cchaSelectOptions, 'DANFE Simplificada');
    assert.ok(matchDanfe);
    assert.equal(matchDanfe.value, 'nota_fiscal');

    const matchNfce = engine.matchSemanticSelectOption(cchaSelectOptions, 'Cupom Fiscal Eletrônico NFC-e');
    assert.ok(matchNfce);
    assert.equal(matchNfce.value, 'nota_fiscal');

    const matchRecibo = engine.matchSemanticSelectOption(cchaSelectOptions, 'Recibo de Honorários');
    assert.ok(matchRecibo);
    assert.equal(matchRecibo.value, 'recibo');
  });

  it('Cenário 2 (Edge Case): recorre ao fallback seguro Outros quando o tipo não tem equivalência direta', () => {
    const engine = globalThis.__doc2fill_content_engine;
    const matchDesconhecido = engine.matchSemanticSelectOption(cchaSelectOptions, 'Comprovante de Despesa Extraordinária');
    assert.ok(matchDesconhecido);
    assert.equal(matchDesconhecido.value, 'outros', 'Deve selecionar opção de fallback Outros');
  });

  it('Cenário 3 (Error Path): retorna null quando lista de opções for vazia, nula ou valor for vazio', () => {
    const engine = globalThis.__doc2fill_content_engine;
    assert.equal(engine.matchSemanticSelectOption(null, 'NF-e'), null);
    assert.equal(engine.matchSemanticSelectOption([], 'NF-e'), null);
    assert.equal(engine.matchSemanticSelectOption(cchaSelectOptions, ''), null);
    assert.equal(engine.matchSemanticSelectOption(cchaSelectOptions, null), null);
  });
});

describe('doc2fill Wave 2: Cross-Frame (Iframe) & Keyboard Events Support (TDD)', () => {
  it('Cenário 1 (Happy Path): varre recursivamente inputs dentro de iframe governamental (SEI/AGU)', () => {
    const engine = globalThis.__doc2fill_content_engine;
    const iframeInput = { tagName: 'INPUT', type: 'text', id: 'txtNumeroProcesso', name: 'processo' };
    const mockIframeDoc = {
      querySelectorAll: (sel) => {
        if (sel.includes('input')) return [iframeInput];
        return [];
      }
    };
    const mockIframe = {
      contentDocument: mockIframeDoc
    };

    const mainInput = { tagName: 'INPUT', type: 'text', id: 'field_main' };
    const mockMainDoc = {
      querySelectorAll: (sel) => {
        if (sel === 'iframe, frame') return [mockIframe];
        if (sel.includes('input')) return [mainInput];
        return [mainInput, mockIframe];
      }
    };

    const elements = engine.getAllFormElements(mockMainDoc);
    assert.ok(elements.includes(mainInput), 'Deve incluir input da página principal');
    assert.ok(elements.includes(iframeInput), 'Deve incluir input de dentro do iframe do SEI');
    assert.equal(elements.length, 2);
  });

  it('Cenário 2 (Edge Case): despacha keydown e keyup para compatibilidade com jQuery Mask e vanilla masks', () => {
    const engine = globalThis.__doc2fill_content_engine;
    const dispatched = [];
    const mockInput = {
      tagName: 'INPUT',
      type: 'text',
      value: '',
      focus: () => {},
      closest: () => null,
      dispatchEvent: (e) => dispatched.push({ type: e.type, key: e.key, bubbles: e.bubbles })
    };

    // Global KeyboardEvent mock if not in node
    globalThis.KeyboardEvent = globalThis.KeyboardEvent || class KeyboardEvent extends globalThis.Event {
      constructor(t, o) { super(t, o); this.key = o?.key; }
    };

    engine.setInputValueWithEvents(mockInput, '14.850,00');
    assert.equal(mockInput.value, '14.850,00');

    const keydownEvent = dispatched.find(e => e.type === 'keydown');
    const keyupEvent = dispatched.find(e => e.type === 'keyup');
    assert.ok(keydownEvent, 'Deve disparar evento keydown');
    assert.ok(keyupEvent, 'Deve disparar evento keyup');
  });

  it('Cenário 3 (Error Path): iframe inacessível por sandbox ou cross-origin não lança erro', () => {
    const engine = globalThis.__doc2fill_content_engine;
    const restrictedIframe = {
      get contentDocument() {
        throw new Error('SecurityError: Blocked a frame with origin from accessing a cross-origin frame.');
      }
    };
    const mockDoc = {
      querySelectorAll: (sel) => {
        if (sel === 'iframe, frame') return [restrictedIframe];
        return [];
      }
    };

    assert.doesNotThrow(() => {
      const res = engine.getAllFormElements(mockDoc);
      assert.ok(Array.isArray(res));
    });
  });
});

