// doc2fill - Content Script Autofill Engine (Clean & Sophisticated Edition)
(() => {
  if (window.__doc2fill_initialized) return;
  window.__doc2fill_initialized = true;

  console.log('[doc2fill] Injetor minimalista ativo na página.');

  // Limpeza defensiva total para expurgar resíduos de versões anteriores
  ['doc2fill-floating-trigger', 'doc2fill-inpage-drawer', 'doc2fill-toast'].forEach((id) => {
    const el = document.getElementById(id);
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
  });

  // Mapeamentos fiscais padrão
  const FISCAL_MAPPINGS = [
    { key: 'cnpj', terms: ['cnpj', 'cpf', 'documento', 'prestador', 'emitente', 'identificacao'] },
    { key: 'razao', terms: ['razao', 'nome', 'fantasia', 'empresa', 'social', 'prestador_nome'] },
    { key: 'valor', terms: ['valor', 'bruto', 'total', 'quantia', 'servico_valor', 'valor_servico'] },
    { key: 'data', terms: ['data', 'emissao', 'competencia', 'dt_emissao'] },
    { key: 'servico', terms: ['servico', 'codigo', 'item', 'cnae', 'atividade', 'cod_servico'] },
    { key: 'irrf', terms: ['irrf', 'retencao', 'retido', 'imposto'] },
    { key: 'descricao', terms: ['descricao', 'discriminacao', 'historico', 'detalhe', 'observacao', 'servicos'] }
  ];

  // Listener para mensagens do Side Panel (Operação 100% Headless)
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'DOC2FILL_EXECUTE') {
      const result = executeAutofill(request.data);
      sendResponse(result);
      return true;
    }
  });

  // Executa o preenchimento automático inteligente
  function executeAutofill(data) {
    if (!data || typeof data !== 'object') {
      return { success: false, reason: 'Nenhum dado fornecido.' };
    }

    let filledCount = 0;
    const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([disabled]), textarea:not([disabled])'));

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

    if (filledCount > 0) {
      return { success: true, count: filledCount };
    }

    return { success: false, reason: 'Nenhum campo compatível encontrado na página.' };
  }

  function findBestMatchingInput(inputs, terms) {
    let best = null;
    let highestScore = 0;

    for (const input of inputs) {
      const id = (input.id || '').toLowerCase();
      const name = (input.name || '').toLowerCase();
      const placeholder = (input.placeholder || '').toLowerCase();
      const ariaLabel = (input.getAttribute('aria-label') || '').toLowerCase();

      let labelText = '';
      if (input.id) {
        const lbl = document.querySelector(`label[for="${input.id}"]`);
        if (lbl) labelText = (lbl.innerText || '').toLowerCase();
      }
      if (!labelText && input.closest('label')) {
        labelText = (input.closest('label').innerText || '').toLowerCase();
      }

      let score = 0;
      for (const term of terms) {
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
    input.value = val;

    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new Event('blur', { bubbles: true }));
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

})();

