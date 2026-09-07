// doc2fill - Content Script Autofill Engine
(() => {
  if (window.__doc2fill_initialized) return;
  window.__doc2fill_initialized = true;

  console.log('[doc2fill] Injetor de Autofill ativo na página.');

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'DOC2FILL_EXECUTE') {
      const result = executeAutofill(request.data);
      sendResponse(result);
    }
    return true;
  });

  function executeAutofill(data) {
    let filledCount = 0;

    const mappings = [
      { key: 'cnpj', value: data.cnpj, terms: ['cnpj', 'cpf', 'documento', 'prestador', 'emitente', 'identificacao'] },
      { key: 'razao', value: data.razao, terms: ['razao', 'nome', 'fantasia', 'empresa', 'social', 'prestador_nome'] },
      { key: 'valor', value: data.valor, terms: ['valor', 'bruto', 'total', 'quantia', 'servico_valor', 'valor_servico'] },
      { key: 'data', value: data.data, terms: ['data', 'emissao', 'competencia', 'dt_emissao'] },
      { key: 'servico', value: data.servico, terms: ['servico', 'codigo', 'item', 'cnae', 'atividade', 'cod_servico'] },
      { key: 'irrf', value: data.irrf, terms: ['irrf', 'retencao', 'retido', 'imposto'] },
      { key: 'descricao', value: data.descricao, terms: ['descricao', 'discriminacao', 'historico', 'detalhe', 'observacao', 'servicos'] }
    ];

    const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea'));

    for (const m of mappings) {
      if (!m.value) continue;

      const target = findBestMatchingInput(inputs, m.terms);
      if (target) {
        fillInputElement(target, m.value);
        highlightSuccessField(target);
        filledCount++;
      }
    }

    if (filledCount > 0) {
      showToastNotification(`⚡ doc2fill: ${filledCount} campos preenchidos com sucesso!`);
      return { success: true, count: filledCount };
    }

    return { success: false, reason: 'Nenhum campo compatível encontrado na página.' };
  }

  function findBestMatchingInput(inputs, terms) {
    for (const term of terms) {
      for (const input of inputs) {
        const id = (input.id || '').toLowerCase();
        const name = (input.name || '').toLowerCase();
        const placeholder = (input.placeholder || '').toLowerCase();
        const ariaLabel = (input.getAttribute('aria-label') || '').toLowerCase();

        // Check label parent or label[for]
        let labelText = '';
        if (input.id) {
          const lbl = document.querySelector(`label[for="${input.id}"]`);
          if (lbl) labelText = (lbl.innerText || '').toLowerCase();
        }
        if (!labelText && input.closest('label')) {
          labelText = (input.closest('label').innerText || '').toLowerCase();
        }

        if (
          id.includes(term) ||
          name.includes(term) ||
          placeholder.includes(term) ||
          ariaLabel.includes(term) ||
          labelText.includes(term)
        ) {
          return input;
        }
      }
    }
    return null;
  }

  function fillInputElement(input, val) {
    input.focus();
    input.value = val;

    // Dispara eventos reais de digitação para compatibilidade com React, Angular e Vue
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  function highlightSuccessField(el) {
    const originalBorder = el.style.borderColor;
    const originalBoxShadow = el.style.boxShadow;
    const originalTransition = el.style.transition;

    el.style.transition = 'all 0.3s ease';
    el.style.borderColor = '#10B981';
    el.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.35)';

    setTimeout(() => {
      el.style.borderColor = originalBorder;
      el.style.boxShadow = originalBoxShadow;
      el.style.transition = originalTransition;
    }, 3000);
  }

  function showToastNotification(message) {
    let toast = document.getElementById('doc2fill-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'doc2fill-toast';
      toast.style.position = 'fixed';
      toast.style.top = '20px';
      toast.style.right = '20px';
      toast.style.zIndex = '9999999';
      toast.style.background = '#0F172A';
      toast.style.color = '#F8FAFC';
      toast.style.padding = '12px 18px';
      toast.style.borderRadius = '8px';
      toast.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 0 0 1px #334155';
      toast.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      toast.style.fontSize = '13px';
      toast.style.fontWeight = '600';
      toast.style.display = 'flex';
      toast.style.alignItems = 'center';
      toast.style.gap = '8px';
      toast.style.borderLeft = '4px solid #10B981';
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
    toast.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
    }, 4000);
  }
})();
