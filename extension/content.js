// doc2fill - Content Script Autofill Engine (Clean & Sophisticated Edition)
(() => {
  if (window.__doc2fill_initialized) return;
  window.__doc2fill_initialized = true;

  console.log('[doc2fill] Injetor minimalista ativo na página.');

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

  // Listener para mensagens do background ou do sidepanel
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'DOC2FILL_EXECUTE') {
      const result = executeAutofill(request.data);
      sendResponse(result);
      return true;
    }

    if (request.action === 'DOC2FILL_TOGGLE_DRAWER') {
      toggleInPageDrawer();
      sendResponse({ acknowledged: true });
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
      showToastNotification(`⚡ ${filledCount} campos preenchidos com sucesso!`);
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

  // Toast minimalista (branco puro, sombra difusa, cantos suaves)
  function showToastNotification(message) {
    let toast = document.getElementById('doc2fill-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'doc2fill-toast';
      toast.style.cssText = `
        position: fixed;
        top: 24px;
        right: 24px;
        z-index: 99999999;
        background: #FFFFFF;
        color: #111827;
        border: 1px solid #E5E7EB;
        border-radius: 12px;
        box-shadow: 0 10px 25px -4px rgba(0, 0, 0, 0.08), 0 4px 8px -2px rgba(0, 0, 0, 0.04);
        padding: 12px 18px;
        font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
        font-size: 13px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 10px;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      `;
      document.body.appendChild(toast);
    }

    toast.innerHTML = `
      <span style="display:inline-flex; align-items:center; justify-content:center; width:22px; height:22px; background:#ECFDF5; color:#065F46; border-radius:50%; font-size:12px; font-weight:600;">✓</span>
      <span>${message}</span>
    `;
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      setTimeout(() => {
        if (toast && toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 400);
    }, 3200);
  }

  // Modal Flutuante In-Page (Acionado apenas sob demanda como fallback)
  function toggleInPageDrawer() {
    let drawer = document.getElementById('doc2fill-inpage-drawer');
    if (drawer) {
      if (drawer.parentNode) drawer.parentNode.removeChild(drawer);
      return;
    }

    drawer = document.createElement('div');
    drawer.id = 'doc2fill-inpage-drawer';
    drawer.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 320px;
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 18px;
      box-shadow: 0 20px 40px -4px rgba(0, 0, 0, 0.12), 0 8px 16px -2px rgba(0, 0, 0, 0.04);
      z-index: 9999999;
      font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
      color: #111827;
      overflow: hidden;
      animation: doc2fillFadeUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    `;

    drawer.innerHTML = `
      <div style="background:#FFFFFF; padding:14px 18px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #F3F4F6;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:14px; font-weight:600; color:#111827;">doc2fill</span>
          <span style="font-size:10px; background:#FEF3C7; color:#92400E; padding:2px 7px; border-radius:9999px; font-weight:500;">VIP Lucas</span>
        </div>
        <button id="doc2fill-close-drawer" style="background:#F3F4F6; border:none; border-radius:50%; color:#6B7280; width:24px; height:24px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:11px;">✕</button>
      </div>
      <div style="padding:18px;">
        <p style="font-size:12px; color:#4B5563; margin-bottom:16px; line-height:1.5;">
          Autofill inteligente com <strong>Zero Retenção de Dados</strong> em nuvem.
        </p>
        <div style="display:flex; flex-direction:column; gap:8px;">
          <button id="doc2fill-btn-open-sidepanel" style="background:#FFFFFF; border:1px solid #E5E7EB; color:#111827; padding:9px 12px; border-radius:10px; font-size:12px; font-weight:500; cursor:pointer; text-align:left; display:flex; align-items:center; gap:8px; transition:background 0.15s;">
            <span>📑</span> Abrir Painel Lateral (Side Panel)
          </button>
          <button id="doc2fill-btn-test-sample" style="background:#111827; border:none; color:#FFFFFF; padding:10px 14px; border-radius:10px; font-size:12px; font-weight:500; cursor:pointer; text-align:center; display:flex; align-items:center; justify-content:center; gap:8px; transition:background 0.15s;">
            <span>⚡</span> Preencher com Amostra da AGU
          </button>
        </div>
        <div style="margin-top:16px; padding-top:10px; border-top:1px solid #F3F4F6; font-size:10.5px; color:#9CA3AF; text-align:center;">
          🔒 Conexão efêmera direta • Zero persistência
        </div>
      </div>
    `;

    document.body.appendChild(drawer);

    const closeCleanly = () => {
      if (drawer && drawer.parentNode) {
        drawer.parentNode.removeChild(drawer);
      }
    };

    // Handlers
    document.getElementById('doc2fill-close-drawer').addEventListener('click', closeCleanly);

    document.getElementById('doc2fill-btn-open-sidepanel').addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'DOC2FILL_OPEN_PANEL' }, (res) => {
        if (!res || !res.success) {
          showToastNotification('💡 Use o ícone do doc2fill na barra do navegador.');
        }
      });
      closeCleanly();
    });

    document.getElementById('doc2fill-btn-test-sample').addEventListener('click', () => {
      const sampleData = {
        cnpj: '33.000.167/0001-01',
        razao: 'Petróleo Brasileiro S.A. - Petrobras',
        valor: 'R$ 14.750,00',
        data: '2026-09-06',
        servico: '08.02',
        irrf: 'R$ 221,25',
        descricao: 'Honorários de sucumbência e assessoria contábil em execução fiscal nº 5001234-88.2026.4.04.7100.'
      };
      executeAutofill(sampleData);
      closeCleanly();
    });
  }
})();

