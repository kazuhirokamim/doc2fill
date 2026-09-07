// doc2fill - Content Script Autofill Engine & In-Page Widget
(() => {
  if (window.__doc2fill_initialized) return;
  window.__doc2fill_initialized = true;

  console.log('[doc2fill] Injetor de Autofill ativo na página.');

  // Mapeamentos padrão para formulários governamentais
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
      showToastNotification(`⚡ doc2fill: ${filledCount} campos preenchidos com sucesso!`);
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

    // Dispara eventos para suportar frameworks reativos (React, Vue, Angular)
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
    }, 3500);
  }

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
        background: #0B0F19;
        color: #F8FAFC;
        padding: 14px 20px;
        border-radius: 10px;
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5), 0 0 0 1px #1E293B;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 13px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 10px;
        border-left: 4px solid #10B981;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      `;
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-12px)';
    }, 4000);
  }

  // Injeção do Floating Action Trigger (botão elegante e discreto na página)
  function injectFloatingTrigger() {
    if (document.getElementById('doc2fill-floating-trigger')) return;

    const trigger = document.createElement('div');
    trigger.id = 'doc2fill-floating-trigger';
    trigger.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999999;
      display: flex;
      align-items: center;
      gap: 8px;
      background: #0B0F19;
      color: #F8FAFC;
      border: 1px solid #1E293B;
      padding: 8px 14px;
      border-radius: 30px;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 12px;
      font-weight: 600;
      transition: all 0.25s ease;
      user-select: none;
    `;

    trigger.innerHTML = `
      <span style="display:flex; align-items:center; justify-content:center; width:20px; height:20px; background:#10B981; color:#0B0F19; border-radius:50%; font-size:11px; font-weight:800;">⚡</span>
      <span>doc2fill</span>
      <span style="font-size:9px; background:rgba(16,185,129,0.15); color:#10B981; padding:2px 6px; border-radius:12px; border:1px solid rgba(16,185,129,0.3);">AGU</span>
    `;

    trigger.addEventListener('mouseenter', () => {
      trigger.style.transform = 'translateY(-2px) scale(1.02)';
      trigger.style.boxShadow = '0 12px 30px rgba(16, 185, 129, 0.2)';
      trigger.style.borderColor = '#10B981';
    });

    trigger.addEventListener('mouseleave', () => {
      trigger.style.transform = 'translateY(0) scale(1)';
      trigger.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.35)';
      trigger.style.borderColor = '#1E293B';
    });

    trigger.addEventListener('click', () => {
      toggleInPageDrawer();
    });

    document.body.appendChild(trigger);
  }

  // Gaveta/Modal Flutuante In-Page
  function toggleInPageDrawer() {
    let drawer = document.getElementById('doc2fill-inpage-drawer');
    if (drawer) {
      drawer.style.display = drawer.style.display === 'none' ? 'block' : 'none';
      return;
    }

    drawer = document.createElement('div');
    drawer.id = 'doc2fill-inpage-drawer';
    drawer.style.cssText = `
      position: fixed;
      bottom: 74px;
      right: 24px;
      width: 320px;
      background: #0F172A;
      border: 1px solid #334155;
      border-radius: 12px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.6);
      z-index: 9999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #F8FAFC;
      overflow: hidden;
      animation: doc2fillSlideUp 0.25s ease;
    `;

    drawer.innerHTML = `
      <div style="background:#0B0F19; padding:12px 16px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #1E293B;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="color:#10B981; font-weight:800;">⚡ doc2fill</span>
          <span style="font-size:10px; background:#10B981; color:#064E3B; padding:2px 6px; border-radius:4px; font-weight:700;">★ VIP Lucas</span>
        </div>
        <button id="doc2fill-close-drawer" style="background:transparent; border:none; color:#94A3B8; font-size:16px; cursor:pointer;">✕</button>
      </div>
      <div style="padding:16px;">
        <p style="font-size:12px; color:#94A3B8; margin-bottom:14px; line-height:1.4;">
          Autofill inteligente com <strong>Zero Retenção de Dados</strong> em nuvem.
        </p>
        <div style="display:flex; flex-direction:column; gap:8px;">
          <button id="doc2fill-btn-open-sidepanel" style="background:#1E293B; border:1px solid #334155; color:#F8FAFC; padding:10px; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer; text-align:left; display:flex; align-items:center; gap:8px;">
            <span>📑</span> Abrir Painel Lateral (Side Panel)
          </button>
          <button id="doc2fill-btn-test-sample" style="background:#10B981; border:none; color:#064E3B; padding:10px; border-radius:6px; font-size:12px; font-weight:700; cursor:pointer; text-align:center; display:flex; align-items:center; justify-content:center; gap:8px;">
            <span>⚡</span> Preencher com Amostra da AGU
          </button>
        </div>
        <div style="margin-top:14px; padding-top:10px; border-top:1px solid #1E293B; font-size:10px; color:#64748B; text-align:center;">
          🔒 Conexão P2P Efêmera • Nenhuma informação é gravada
        </div>
      </div>
    `;

    document.body.appendChild(drawer);

    // Handlers
    document.getElementById('doc2fill-close-drawer').addEventListener('click', () => {
      drawer.style.display = 'none';
    });

    document.getElementById('doc2fill-btn-open-sidepanel').addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'DOC2FILL_OPEN_PANEL' }, (res) => {
        if (!res || !res.success) {
          showToastNotification('💡 Use o ícone do doc2fill na barra do Chrome para abrir o painel.');
        }
      });
      drawer.style.display = 'none';
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
      drawer.style.display = 'none';
    });
  }

  // Inicializa o trigger flutuante após carregamento da página
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectFloatingTrigger);
  } else {
    injectFloatingTrigger();
  }
})();
