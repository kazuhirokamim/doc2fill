// doc2fill - Content Script Autofill Engine (CCHA & Angular Material / Reactive Forms Edition)

/**
 * Aplica destaque visual temporário (Flow Cyan) com contorno e glow suave no elemento preenchido.
 * @param {HTMLElement} el
 * @param {number} [durationMs=1500]
 */
export function highlightFilledElement(el, durationMs = 1500) {
  if (!el || !el.style) return;
  const originalOutline = el.style.outline;
  const originalBoxShadow = el.style.boxShadow;
  const originalTransition = el.style.transition;

  el.style.transition = 'all 0.3s ease';
  el.style.outline = '2px solid #00D2FF';
  el.style.boxShadow = '0 0 10px rgba(0, 210, 255, 0.45)';

  setTimeout(() => {
    try {
      el.style.outline = originalOutline;
      el.style.boxShadow = originalBoxShadow;
      el.style.transition = originalTransition;
    } catch (_) {}
  }, durationMs);
}

(() => {
  const win = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null);
  const doc = typeof document !== 'undefined' ? document : null;
  if (win && win.__doc2fill_initialized) return;
  if (win) win.__doc2fill_initialized = true;

  if (typeof console !== 'undefined') {
    console.log('[doc2fill] Injetor CCHA e Angular Reactive Forms ativo na página.');
  }

  // Limpeza defensiva total para expurgar resíduos de versões anteriores
  if (doc && typeof doc.getElementById === 'function') {
    ['doc2fill-floating-trigger', 'doc2fill-inpage-drawer', 'doc2fill-toast'].forEach((id) => {
      const el = doc.getElementById(id);
      if (el && el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });
  }

  // Normalização de texto livre de acentos e diacríticos
  function normalizeText(str) {
    if (!str || typeof str !== 'string') return '';
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  // Mapeamentos fiscais e jurídicos padrão com suporte ao portal CCHA (Honorários Advocatícios / AGU)
  const FISCAL_MAPPINGS = [
    { key: 'tipo_documento', terms: ['tipo_documento', 'comprovante_tipo', 'especie', 'tipo_comprovante', 'tipo_doc', 'comprovante', 'tipo_despesa', 'tipo_requerimento', 'tipodocumento'] },
    { key: 'cpf_cnpj', terms: ['cpf_cnpj', 'cpfcnpj', 'cnpj_prestador', 'prestador_cnpj', 'fornecedor_cnpj', 'cnpj', 'cpf_prestador', 'fornecedor_cpf', 'cpf', 'emitente', 'identificacao'] },
    { key: 'fornecedor', terms: ['fornecedor', 'nome_fornecedor', 'fornecedor_nome', 'razao_social', 'razao', 'nome_prestador', 'prestador_nome', 'fantasia', 'empresa', 'social'] },
    { key: 'numero_documento', terms: ['numero_documento', 'num_documento', 'numero_nf', 'num_nf', 'numero_nota', 'numero', 'num_recibo', 'numero_recibo', 'numero_cupom', 'numero_fatura', 'numero_comprovante', 'num_doc', 'protocolo_ccha', 'protocolo', 'processo', 'identificador'] },
    { key: 'data', terms: ['data_emissao', 'data_documento', 'emissao', 'competencia', 'dt_emissao', 'data_requerimento', 'data_pagamento', 'dt_pagamento', 'data_atendimento', 'data_realizacao', 'data'] },
    { key: 'valor', terms: ['valor_bruto', 'valor_total', 'valor_documento', 'valor_servico', 'valor_pago', 'valor_despesa', 'valor_honorarios', 'honorarios', 'valor', 'total'] },
    { key: 'descritivo', terms: ['discriminacao_servico', 'descricao_servico', 'descritivo', 'descricao', 'discriminacao', 'historico', 'detalhe', 'observacao', 'servicos', 'procedimento', 'objeto', 'especificacao'] },
    { key: 'motivo', terms: ['motivo_procedimento', 'motivo', 'justificativa_clinica', 'justificativa', 'fundamentacao', 'indicacao_clinica', 'indicacao', 'necessidade', 'diagnostico'] },
    // Aliases para retrocompatibilidade
    { key: 'cnpj', terms: ['cnpj_prestador', 'prestador_cnpj', 'fornecedor_cnpj', 'cnpj', 'cpf_cnpj', 'cpfcnpj'] },
    { key: 'cpf', terms: ['cpf_prestador', 'fornecedor_cpf', 'cpf', 'cpf_procurador', 'cpf_beneficiario', 'cpfcnpj'] },
    { key: 'razao', terms: ['razao_social', 'razao', 'nome_prestador', 'prestador_nome', 'nome_fornecedor', 'fornecedor_nome', 'empresa', 'social'] },
    { key: 'nome', terms: ['nome_prestador', 'prestador_nome', 'nome_fornecedor', 'fornecedor_nome', 'nome', 'razao'] },
    { key: 'descricao', terms: ['descricao_servico', 'discriminacao_servico', 'descricao', 'descritivo', 'discriminacao', 'historico'] },
    { key: 'processo', terms: ['processo', 'numero_processo', 'num_processo', 'processo_judicial', 'processo_administrativo', 'protocolo'] },
    { key: 'servico', terms: ['servico', 'codigo', 'item', 'cnae', 'atividade', 'cod_servico', 'codigo_tuss', 'tuss', 'tuss_codigo', 'rubrica', 'rubrica_ccha'] },
    { key: 'irrf', terms: ['irrf', 'retencao', 'retido', 'imposto', 'tributo'] },
    { key: 'beneficiario', terms: ['beneficiario', 'procurador', 'advogado', 'nome_beneficiario', 'requerente', 'nome_requerente', 'titular', 'dependente', 'parentesco', 'tipo_beneficiario'] },
    { key: 'natureza', terms: ['natureza', 'especie', 'tipo_processo', 'carater', 'tipo_procedimento'] },
    { key: 'matricula', terms: ['matricula', 'siape', 'matricula_siape', 'num_matricula', 'registro_funcional', 'oab', 'numerooab', 'ufoab'] },
    { key: 'orgao', terms: ['orgao', 'lotacao', 'carreira', 'cargo', 'categoria', 'unidade', 'agu', 'pgfn', 'pgf', 'pgbc'] },
    { key: 'banco', terms: ['banco', 'instituicao_bancaria', 'cod_banco', 'nome_banco'] },
    { key: 'agencia', terms: ['agencia', 'cod_agencia', 'prefixo_agencia'] },
    { key: 'conta', terms: ['conta', 'conta_corrente', 'num_conta', 'cc', 'conta_bancaria'] },
    { key: 'pix', terms: ['pix', 'chave_pix', 'tipo_pix', 'chavepix'] },
    { key: 'email', terms: ['email', 'emailinstitucional', 'emailpessoal'] }
  ];

  // Casamento semântico priorizado para opções de <select>
  function matchSemanticSelectOption(options, val) {
    if (!options || !val) return null;
    const normVal = normalizeText(val);
    if (!normVal) return null;

    // 1ª Tentativa: Match exato de valor ou texto
    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      const optVal = normalizeText(opt.value);
      const optText = normalizeText(opt.text);
      if (!optVal && i === 0) continue;
      if (optVal && optVal === normVal) return opt;
      if (optText && optText === normVal) return opt;
      if (optText && optText.includes(normVal)) return opt;
      if (optVal && optVal.length >= 4 && normVal.includes(optVal)) return opt;
    }

    // 2ª Tentativa: Mapeamento semântico priorizado (O(N) achatado)
    const semanticGroups = [
      { keys: ['cupom', 'nfc', 'sat', 'danfe', 'nota fiscal', 'nfse', 'nfe', 'fiscal'], matches: ['nota_fiscal', 'nota', 'fiscal', 'recibo'] },
      { keys: ['recibo', 'honorario', 'profissional', 'autonomo', 'rpa'], matches: ['recibo', 'honorarios', 'autonomo'] },
      { keys: ['guia', 'tiss', 'tuss', 'sadt', 'medica', 'consulta', 'exame'], matches: ['guia_medica', 'guia', 'tiss'] },
      { keys: ['boleto', 'bancario', 'fatura', 'pagamento', 'concessionaria'], matches: ['boleto', 'fatura', 'bancario', 'comprovante'] },
      { keys: ['farmacia', 'medicamento', 'drogaria', 'droga'], matches: ['nota_fiscal', 'recibo', 'outro'] }
    ];

    const normalizedOpts = Array.from(options).map((opt, i) => ({
      opt,
      val: normalizeText(opt.value),
      text: normalizeText(opt.text),
      isPlaceholder: i === 0 && !normalizeText(opt.value)
    }));

    for (const group of semanticGroups) {
      if (!group.keys.some(k => normVal.includes(k))) continue;
      for (const targetMatch of group.matches) {
        const found = normalizedOpts.find(o => !o.isPlaceholder && (o.val.includes(targetMatch) || o.text.includes(targetMatch)));
        if (found) return found.opt;
      }
    }

    // 3ª Tentativa (S2-T4): Fallback defensivo para "Outros" / "Outro" / "Diversos" quando não houver correspondência exata
    const fallbackOption = normalizedOpts.find(o => !o.isPlaceholder && (
      o.val.includes('outro') || o.text.includes('outro') ||
      o.val.includes('diversos') || o.text.includes('diversos')
    ));
    if (fallbackOption) return fallbackOption.opt;

    return null;
  }

  // Coleta profunda de elementos de formulário, incluindo Angular Reactive Forms, ng-select e Shadow DOM
  function getAllFormElements(root = document) {
    if (!root || !root.querySelectorAll) return [];
    const selector = 'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), ng-select:not([disabled]), mat-select:not([disabled]), [formcontrolname]:not([disabled])';
    let elements = Array.from(root.querySelectorAll(selector));

    const allNodes = root.querySelectorAll('*');
    for (const node of allNodes) {
      if (node.shadowRoot) {
        elements = elements.concat(getAllFormElements(node.shadowRoot));
      }
    }
    return elements;
  }

  // Listener para mensagens do Side Panel (Operação 100% Headless)
  if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage?.addListener) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'DOC2FILL_EXECUTE') {
        const result = executeAutofill(request.data, request.file);
        sendResponse(result);
        return true;
      }
    });
  }

  // Executa o preenchimento automático inteligente
  function executeAutofill(data, fileData) {
    if (!data || typeof data !== 'object') {
      return { success: false, reason: 'Nenhum dado fornecido.' };
    }

    let filledCount = 0;
    const filledElements = new Set();
    const rootDoc = typeof document !== 'undefined' ? document : null;
    const inputs = getAllFormElements(rootDoc);

    for (const m of FISCAL_MAPPINGS) {
      const val = data[m.key];
      if (!val || typeof val !== 'string' || val.trim() === '') continue;

      const target = findBestMatchingInput(inputs, m.terms, filledElements);
      if (target) {
        fillInputElement(target, val.trim());
        highlightSuccessField(target);
        filledElements.add(target);
        filledCount++;
      }
    }

    // Injeção de arquivo no <input type="file"> se fornecido
    if (fileData && fileData.name && fileData.base64) {
      const fileAttached = attachFileToPage(fileData);
      if (fileAttached) filledCount++;
    }

    if (filledCount > 0) {
      return { success: true, count: filledCount };
    }

    return { success: false, reason: 'Nenhum campo compatível encontrado na página.' };
  }

  function findBestMatchingInput(inputs, terms, filledElements = new Set()) {
    let best = null;
    let highestScore = 0;
    const normalizedTerms = terms.map(normalizeText).filter(Boolean);

    for (const input of inputs) {
      if (filledElements && filledElements.has(input)) continue;

      const id = normalizeText(input.id || '');
      const name = normalizeText(input.name || '');
      const placeholder = normalizeText(input.placeholder || '');
      const ariaLabel = normalizeText(input.getAttribute ? (input.getAttribute('aria-label') || '') : '');
      const fcn = normalizeText(input.getAttribute ? (input.getAttribute('formcontrolname') || '') : '');
      const ngReflect = normalizeText(input.getAttribute ? (input.getAttribute('ng-reflect-name') || '') : '');

      let labelText = '';
      if (input.id && document.querySelector) {
        const lbl = document.querySelector(`label[for="${input.id}"]`);
        if (lbl) labelText = normalizeText(lbl.innerText || '');
      }
      if (!labelText && input.closest) {
        const lbl = input.closest('label');
        if (lbl) labelText = normalizeText(lbl.innerText || '');
      }

      // Suporte a Angular Material: <mat-form-field> e <mat-label>
      if (!labelText && input.closest) {
        const matFormField = input.closest('mat-form-field');
        if (matFormField && matFormField.querySelector) {
          const matLabel = matFormField.querySelector('mat-label, .mat-mdc-floating-label, label');
          if (matLabel) labelText = normalizeText(matLabel.innerText || '');
        }
      }

      let score = 0;
      for (const term of normalizedTerms) {
        // Alta prioridade para formControlName e ng-reflect-name do Angular
        if (fcn === term) score += 20;
        else if (fcn.includes(term)) score += 14;

        if (ngReflect === term) score += 15;
        else if (ngReflect.includes(term)) score += 10;

        // Atributos HTML padrão
        if (id === term || name === term) score += 10;
        else if (id.includes(term) || name.includes(term)) score += 7;

        if (labelText === term) score += 8;
        else if (labelText.includes(term)) score += 5;

        if (placeholder.includes(term) || ariaLabel.includes(term)) score += 4;
      }

      if (score > highestScore) {
        highestScore = score;
        best = input;
      }
    }

    return highestScore > 0 ? best : null;
  }

  function fillInputElement(input, val) {
    if (typeof input.focus === 'function') {
      input.focus();
    }

    const tagName = (input.tagName || '').toUpperCase();

    // 1. Suporte a ng-select (Angular)
    if (tagName === 'NG-SELECT') {
      const childInput = input.querySelector ? input.querySelector('input') : null;
      if (childInput) {
        childInput.value = val;
        childInput.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      }
      input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      return;
    }

    // 2. Suporte a mat-select (Angular Material)
    if (tagName === 'MAT-SELECT') {
      input.dispatchEvent(new Event('click', { bubbles: true, cancelable: true }));
      input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      return;
    }

    // 3. Suporte a SELECT nativo com matching semântico
    if (tagName === 'SELECT') {
      const matchedOpt = matchSemanticSelectOption(input.options, val);
      if (matchedOpt) {
        input.value = matchedOpt.value;
        if (input.options) {
          input.selectedIndex = Array.from(input.options).indexOf(matchedOpt);
        }
      }
    } else if (input.type === 'radio' || input.type === 'checkbox') {
      const normVal = normalizeText(val);
      const inputVal = normalizeText(input.value || '');
      const inputLabel = normalizeText(input.closest?.('label')?.innerText || '');

      if (inputVal === normVal || inputLabel.includes(normVal)) {
        input.checked = true;
      }
    } else {
      // 4. Input de texto / date / number / textarea — compatibilidade universal com React/Vue/Angular Reactive Forms
      let finalVal = val;
      if (input.type === 'date') {
        // Converte DD/MM/AAAA ou DD.MM.AAAA para YYYY-MM-DD exigido por input[type="date"]
        if (/^\d{2}[\/\.]\d{2}[\/\.]\d{4}$/.test(finalVal)) {
          finalVal = finalVal.replace(/^(\d{2})[\/\.](\d{2})[\/\.](\d{4})$/, '$3-$2-$1');
        }
      } else if (input.type === 'text' && /(?:dd[\/\.]mm|data)/i.test(input.placeholder || '')) {
        // Se o input texto com máscara espera DD/MM/AAAA e recebeu YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(finalVal)) {
          finalVal = finalVal.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3/$2/$1');
        }
      } else if (input.type === 'number') {
        // Converte R$ 14.850,00 para 14850.00
        const numClean = finalVal.replace(/[^\d,\.]/g, '').replace(/\./g, '').replace(',', '.');
        if (numClean && !isNaN(Number(numClean))) {
          finalVal = numClean;
        }
      }

      setInputValueWithEvents(input, finalVal);
    }

    // Aplica destaque visual reativo suave (Highlighter Flow Cyan)
    highlightFilledElement(input);
  }

  // Injetor de propriedades nativas e despacho da cadeia reativa com bubbles e composed (S2-T3)
  function setInputValueWithEvents(input, val) {
    if (!input) return;
    const tagName = (input.tagName || '').toUpperCase();
    const proto = typeof window !== 'undefined' ? Object.getOwnPropertyDescriptor(
      tagName === 'TEXTAREA' ? window.HTMLTextAreaElement?.prototype : window.HTMLInputElement?.prototype,
      'value'
    ) : null;

    if (proto && proto.set) {
      proto.set.call(input, val);
    } else {
      input.value = val;
    }

    // Disparo da cadeia completa de eventos do ciclo reativo com bubbles e composed
    input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true, composed: true }));
    try {
      if (typeof InputEvent !== 'undefined') {
        input.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, composed: true, inputType: 'insertText', data: val }));
      }
    } catch (_) {}
    input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true, composed: true }));
    input.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true, composed: true }));

    // Se estiver em <mat-form-field>, ajusta estado flutuante do label
    const matField = input.closest ? input.closest('mat-form-field') : null;
    if (matField && matField.classList && typeof matField.classList.add === 'function') {
      matField.classList.add('mat-form-field-should-float', 'mat-focused');
    }
  }

  // Converte base64 para Blob e anexa via DataTransfer nativo
  function attachFileToPage(fileData) {
    try {
      const fileInputs = Array.from(document.querySelectorAll('input[type="file"]:not([disabled])'));
      if (fileInputs.length === 0) return false;

      const targetInput = fileInputs[0];
      const byteCharacters = atob(fileData.base64.split(',')[1] || fileData.base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: fileData.type || 'application/pdf' });
      const file = new File([blob], fileData.name || 'comprovante.pdf', { type: fileData.type || 'application/pdf' });

      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      targetInput.files = dataTransfer.files;

      targetInput.dispatchEvent(new Event('change', { bubbles: true }));
      targetInput.dispatchEvent(new Event('input', { bubbles: true }));
      highlightSuccessField(targetInput);
      return true;
    } catch (err) {
      console.warn('[doc2fill] Falha ao anexar arquivo via DataTransfer:', err);
      return false;
    }
  }

  // Destaque suave com anel esmeralda sutil
  function highlightSuccessField(el) {
    if (!el || !el.style) return;
    const originalBorder = el.style.borderColor;
    const originalBoxShadow = el.style.boxShadow;
    const originalTransition = el.style.transition;

    el.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
    el.style.borderColor = '#10B981';
    el.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.2)';

    setTimeout(() => {
      el.style.borderColor = originalBorder;
      el.style.boxShadow = originalBoxShadow;
      el.style.transition = originalTransition;
    }, 3200);
  }

  // Exposição da engine de content script para testes unitários e verificação semântica
  if (typeof globalThis !== 'undefined') {
    globalThis.__doc2fill_content_engine = {
      normalizeText,
      FISCAL_MAPPINGS,
      matchSemanticSelectOption,
      getAllFormElements,
      findBestMatchingInput,
      fillInputElement,
      setInputValueWithEvents,
      executeAutofill,
      attachFileToPage,
      highlightFilledElement
    };
  }

})();
