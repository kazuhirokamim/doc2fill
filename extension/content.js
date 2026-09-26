// doc2fill - Content Script Autofill Engine (Clinical & File Attachment Edition)
(() => {
  const win = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null);
  const doc = typeof document !== 'undefined' ? document : null;
  if (win && win.__doc2fill_initialized) return;
  if (win) win.__doc2fill_initialized = true;

  if (typeof console !== 'undefined') {
    console.log('[doc2fill] Injetor clínico e fiscal ativo na página.');
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

  // Mapeamentos fiscais e jurídicos padrão com suporte ampliado ao portal CCHA (Honorários Advocatícios / AGU)
  const FISCAL_MAPPINGS = [
    { key: 'cnpj', terms: ['cnpj', 'cpf', 'documento', 'prestador', 'emitente', 'identificacao', 'cpf_cnpj', 'cpfcnpj', 'cpf_procurador', 'cpf_beneficiario', 'prestador_cpf', 'prestador_cnpj'] },
    { key: 'razao', terms: ['razao', 'nome', 'fantasia', 'empresa', 'social', 'prestador_nome', 'nome_prestador', 'nome_procurador', 'nome_advogado', 'clinica', 'medico'] },
    { key: 'valor', terms: ['valor', 'honorarios', 'valor_honorarios', 'quantia', 'valor_total', 'bruto', 'total', 'servico_valor', 'valor_servico', 'valor_pago', 'valor_despesa', 'valor_solicitado', '_valor'] },
    { key: 'data', terms: ['data', 'emissao', 'competencia', 'dt_emissao', 'data_requerimento', 'data_pagamento', 'dt_pagamento', 'data_atendimento', 'data_realizacao', '_data'] },
    { key: 'servico', terms: ['servico', 'codigo', 'item', 'cnae', 'atividade', 'cod_servico', 'codigo_tuss', 'tuss', 'tuss_codigo', 'rubrica', 'rubrica_ccha'] },
    { key: 'irrf', terms: ['irrf', 'retencao', 'retido', 'imposto', 'tributo'] },
    { key: 'descricao', terms: ['descricao', 'discriminacao', 'historico', 'detalhe', 'observacao', 'servicos', 'procedimento', 'despesa', 'especialidade', 'tipo_despesa', 'objeto', 'especificacao', 'honorarios_sucumbenciais'] },
    { key: 'beneficiario', terms: ['beneficiario', 'procurador', 'advogado', 'nome_beneficiario', 'requerente', 'nome_requerente', 'titular', 'dependente', 'parentesco', 'paciente', 'segurado', 'usuario', 'cpfTitular', 'dependenteCpf', 'dependenteNome', 'tipo_beneficiario'] },
    { key: 'motivo', terms: ['motivo', 'justificativa', 'fundamentacao', 'indicacao', 'necessidade', 'diagnostico', 'cid', 'justificativa_clinica', 'indicacao_clinica', 'relatorio_medico', 'laudo', 'relatorio', 'observacao'] },
    { key: 'natureza', terms: ['natureza', 'especie', 'tipo_processo', 'carater', 'cirurgico', 'tipo_procedimento'] },
    { key: 'tipo_documento', terms: ['tipo_documento', 'comprovante_tipo', 'especie', 'tipo_comprovante', 'tipo_doc', 'comprovante', 'tipo_despesa', 'tipo_requerimento'] },
    { key: 'matricula', terms: ['matricula', 'siape', 'matricula_siape', 'num_matricula', 'registro_funcional', 'oab'] },
    { key: 'orgao', terms: ['orgao', 'lotacao', 'carreira', 'cargo', 'unidade', 'agu', 'pgfn', 'pgf', 'pgbc'] },
    { key: 'banco', terms: ['banco', 'instituicao_bancaria', 'cod_banco', 'nome_banco'] },
    { key: 'agencia', terms: ['agencia', 'cod_agencia', 'prefixo_agencia'] },
    { key: 'conta', terms: ['conta', 'conta_corrente', 'num_conta', 'cc', 'conta_bancaria'] },
    { key: 'pix', terms: ['pix', 'chave_pix', 'tipo_pix', 'chavepix'] },
    { key: 'processo', terms: ['processo', 'numero_processo', 'num_processo', 'processo_judicial', 'processo_administrativo', 'protocolo'] }
  ];

  // Coleta profunda de elementos de formulário, incluindo suporte a Shadow DOM
  function getAllFormElements(root = document) {
    const selector = 'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([disabled]), textarea:not([disabled]), select:not([disabled])';
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
    const inputs = getAllFormElements(document);

    for (const m of FISCAL_MAPPINGS) {
      const val = data[m.key];
      if (!val || typeof val !== 'string' || val.trim() === '') continue;

      const target = findBestMatchingInput(inputs, m.terms);
      if (target) {
        fillInputElement(target, val.trim());
        highlightSuccessField(target);
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

  function findBestMatchingInput(inputs, terms) {
    let best = null;
    let highestScore = 0;
    const normalizedTerms = terms.map(normalizeText).filter(Boolean);

    for (const input of inputs) {
      const id = normalizeText(input.id || '');
      const name = normalizeText(input.name || '');
      const placeholder = normalizeText(input.placeholder || '');
      const ariaLabel = normalizeText(input.getAttribute('aria-label') || '');

      let labelText = '';
      if (input.id) {
        const lbl = document.querySelector(`label[for="${input.id}"]`);
        if (lbl) labelText = normalizeText(lbl.innerText || '');
      }
      if (!labelText && input.closest('label')) {
        labelText = normalizeText(input.closest('label').innerText || '');
      }

      let score = 0;
      for (const term of normalizedTerms) {
        if (id === term || name === term) score += 10;
        else if (id.includes(term) || name.includes(term)) score += 7;
        if (labelText.includes(term)) score += 5;
        if (placeholder.includes(term) || ariaLabel.includes(term)) score += 3;
      }

      if (score > highestScore) {
        highestScore = score;
        best = input;
      }
    }

    return highestScore > 0 ? best : null;
  }

  function fillInputElement(input, val) {
    input.focus();

    // Tratamento específico por tipo de elemento
    if (input.tagName === 'SELECT') {
      const normVal = normalizeText(val);
      let optionMatched = false;
      for (const opt of input.options) {
        if (normalizeText(opt.value) === normVal || normalizeText(opt.text).includes(normVal)) {
          input.value = opt.value;
          optionMatched = true;
          break;
        }
      }
      if (!optionMatched && input.options.length > 0) {
        input.selectedIndex = 0;
      }
    } else if (input.type === 'radio' || input.type === 'checkbox') {
      const normVal = normalizeText(val);
      const inputVal = normalizeText(input.value || '');
      const inputLabel = normalizeText(input.closest('label')?.innerText || '');

      if (inputVal === normVal || inputLabel.includes(normVal)) {
        input.checked = true;
      }
    } else {
      // Input de texto / textarea — compatibilidade universal com React/Vue setters
      const proto = Object.getOwnPropertyDescriptor(
        input.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype,
        'value'
      );
      if (proto && proto.set) {
        proto.set.call(input, val);
      } else {
        input.value = val;
      }
    }

    input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    try {
      input.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: val }));
    } catch (_) {
      // Ignora ambientes sem suporte a construtor InputEvent
    }
    input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    input.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
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
      getAllFormElements,
      fillInputElement,
      executeAutofill,
      attachFileToPage
    };
  }

})();
