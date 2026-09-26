// tests/extension/angular-adapter.test.js
// Suíte TDD para o Adaptador Angular Reactive Forms, ng-select e mat-select no CCHA (3 Cenários Obrigatórios Tear)
import test from 'node:test';
import assert from 'node:assert/strict';

// Mock de DOM para simular a árvore Angular do portal CCHA
class MockElement {
  constructor(tagName, attrs = {}) {
    this.tagName = tagName.toUpperCase();
    this.attrs = { ...attrs };
    this.style = {};
    this.value = attrs.value || '';
    this.children = [];
    this.parentNode = null;
    this.shadowRoot = null;
    this.eventsDispatched = [];
  }

  getAttribute(name) {
    return this.attrs[name] ?? null;
  }

  setAttribute(name, val) {
    this.attrs[name] = val;
  }

  get id() { return this.attrs.id || ''; }
  get name() { return this.attrs.name || ''; }
  get type() { return this.attrs.type || 'text'; }
  get placeholder() { return this.attrs.placeholder || ''; }

  focus() { this.focused = true; }

  dispatchEvent(event) {
    this.eventsDispatched.push(event.type);
    return true;
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  querySelector(sel) {
    for (const c of this.children) {
      if (sel.includes('mat-label') && c.tagName === 'MAT-LABEL') return c;
      if (sel.includes('label') && c.tagName === 'LABEL') return c;
      const sub = c.querySelector?.(sel);
      if (sub) return sub;
    }
    return null;
  }

  querySelectorAll(sel) {
    let matches = [];
    for (const c of this.children) {
      if (c.tagName.toLowerCase().includes(sel.toLowerCase().replace(/[^a-z-]/g, '')) || sel === '*') {
        matches.push(c);
      }
      if (c.querySelectorAll) {
        matches = matches.concat(c.querySelectorAll(sel));
      }
    }
    return matches;
  }

  closest(tag) {
    let p = this.parentNode;
    while (p) {
      if (p.tagName.toLowerCase() === tag.toLowerCase()) return p;
      p = p.parentNode;
    }
    return null;
  }
}

// Carrega o módulo sob teste
import '../../extension/content.js';

test('Angular Adapter — 1. Caminho Feliz (Happy Path): preenche inputs com formControlName e emite eventos reativos', () => {
  const engine = globalThis.__doc2fill_content_engine;
  assert.ok(engine, 'Content script engine deve estar exposto');

  // Cria estrutura Angular MDC similar ao portal CCHA
  const formField = new MockElement('mat-form-field');
  const matLabel = new MockElement('mat-label');
  matLabel.innerText = 'CPF do Beneficiário';
  formField.appendChild(matLabel);

  const inputCpf = new MockElement('input', {
    formcontrolname: 'cpf',
    type: 'text',
    placeholder: '000.000.000-00'
  });
  formField.appendChild(inputCpf);

  // Preenche via fillInputElement
  engine.fillInputElement(inputCpf, '123.456.789-00');

  assert.equal(inputCpf.value, '123.456.789-00');
  assert.ok(inputCpf.eventsDispatched.includes('input'), 'Deve disparar evento input');
  assert.ok(inputCpf.eventsDispatched.includes('change'), 'Deve disparar evento change');
  assert.ok(inputCpf.eventsDispatched.includes('blur'), 'Deve disparar evento blur');
});

test('Angular Adapter — 2. Casos de Borda (Edge Cases): ng-select e mat-select com formControlName', () => {
  const engine = globalThis.__doc2fill_content_engine;

  // Componente ng-select do CCHA
  const ngSelect = new MockElement('ng-select', {
    formcontrolname: 'orgao'
  });
  const inputChild = new MockElement('input', {
    type: 'text',
    role: 'combobox'
  });
  ngSelect.appendChild(inputChild);

  engine.fillInputElement(ngSelect, 'Advocacia-Geral da União (AGU)');

  assert.ok(ngSelect.eventsDispatched.includes('change') || inputChild.eventsDispatched.includes('input'));
});

test('Angular Adapter — 3. Tratamento de Erro (Error Path): dados nulos ou vazios não quebram o autofill', () => {
  const engine = globalThis.__doc2fill_content_engine;

  const resultNull = engine.executeAutofill(null);
  assert.equal(resultNull.success, false);
  assert.ok(resultNull.reason.includes('Nenhum dado'));

  const resultEmpty = engine.executeAutofill({});
  assert.equal(resultEmpty.success, false);
});
