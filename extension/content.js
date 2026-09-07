// doc2fill - Content Script Autofill Engine (Neo-Brutalist Edition)
(() => {
  if (window.__doc2fill_initialized) return;
  window.__doc2fill_initialized = true;

  console.log('[doc2fill] Injetor Neo-Brutalista ativo na página.');

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
      showToastNotification(`⚡ ${filledCount} CAMPOS PREENCHIDOS COM SUCESSO!`);
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

    // Dispara eventos padrão
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  // Destaque tátil Neo-Brutalista com borda preta sólida e fundo verde elétrico
  function highlightSuccessField(el) {
    const originalBorder = el.style.border;
    const originalBoxShadow = el.style.boxShadow;
    const originalBackground = el.style.background;

    el.style.border = '2px solid #000000';
    el.style.boxShadow = '3px 3px 0px #00F59B';
    el.style.background = '#E8FFF3';

    setTimeout(() => {
      el.style.border = originalBorder;
      el.style.boxShadow = originalBoxShadow;
      el.style.background = originalBackground;
    }, 3500);
  }

  // Toast Neo-Brutalista (0-blur, borda preta 2px, tipografia de alto contraste)
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
        color: #000000;
        border: 2px solid #000000;
        box-shadow: 4px 4px 0px #000000;
        padding: 12px 18px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 12px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: -0.02em;
        display: flex;
        align-items: center;
        gap: 10px;
        transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      `;
      document.body.appendChild(toast);
    }

    toast.innerHTML = `
      <span style="background:#00F59B; color:#000000; border:2px solid #000000; padding:2px 6px; font-family:monospace; font-size:10px; font-weight:800; box-shadow:1px 1px 0px #000;">✓ STATUS</span>
      <span>${message}</span>
    `;
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-12px)';
    }, 4000);
  }

  // Injeção do Floating Action Trigger Neo-Brutalista
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
      background: #FFE600;
      color: #000000;
      border: 2px solid #000000;
      box-shadow: 4px 4px 0px #000000;
      padding: 8px 14px;
      cursor: pointer;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 12px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: -0.03em;
      transition: all 0.1s ease;
      user-select: none;
    `;

    trigger.innerHTML = `
      <span style="display:inline-flex; align-items:center; justify-content:center; width:20px; height:20px; background:#000000; color:#FFE600; font-size:11px; font-weight:900;">⚡</span>
      <span>DOC2FILL</span>
      <span style="font-family:monospace; font-size:10px; background:#FFFFFF; color:#000000; padding:2px 6px; border:1px solid #000000; font-weight:700;">AGU // VIP</span>
    `;

    trigger.addEventListener('mouseenter', () => {
      trigger.style.transform = 'translate(-2px, -2px)';
      trigger.style.boxShadow = '6px 6px 0px #000000';
    });

    trigger.addEventListener('mouseleave', () => {
      trigger.style.transform = 'translate(0, 0)';
      trigger.style.boxShadow = '4px 4px 0px #000000';
    });

    trigger.addEventListener('click', () => {
      toggleInPageDrawer();
    });

    document.body.appendChild(trigger);
  }

  // Gaveta/Modal Flutuante In-Page Neo-Brutalista
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
      width: 330px;
      background: #FFFFFF;
      border: 2px solid #000000;
      box-shadow: 6px 6px 0px #000000;
      z-index: 9999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #000000;
      overflow: hidden;
    `;

    drawer.innerHTML = `
      <div style="background:#FFE600; padding:10px 14px; display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #000000;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:14px; font-weight:900; letter-spacing:-0.03em; text-transform:uppercase;">⚡ DOC2FILL</span>
          <span style="font-family:monospace; font-size:9px; background:#FFFFFF; color:#000000; padding:2px 6px; border:1px solid #000000; font-weight:700;">★ VIP LUCAS</span>
        </div>
        <button id="doc2fill-close-drawer" style="background:#FFFFFF; border:2px solid #000000; box-shadow:2px 2px 0px #000000; color:#000000; font-weight:900; font-size:12px; width:24px; height:24px; display:flex; align-items:center; justify-content:center; cursor:pointer;">✕</button>
      </div>
      <div style="padding:14px; background:#F7F7F2;">
        <p style="font-size:11px; color:#222; margin-bottom:12px; line-height:1.4; font-weight:500;">
          Preenchimento automático inteligente com <strong>Zero Retenção de Dados</strong> em nuvem.
        </p>
        <div style="display:flex; flex-direction:column; gap:8px;">
          <button id="doc2fill-btn-open-sidepanel" style="background:#FFFFFF; border:2px solid #000000; box-shadow:3px 3px 0px #000000; color:#000000; padding:9px; font-size:11px; font-weight:900; text-transform:uppercase; cursor:pointer; text-align:left; display:flex; align-items:center; gap:8px;">
            <span>📑</span> ABRIR PAINEL LATERAL (SIDE PANEL)
          </button>
          <button id="doc2fill-btn-test-sample" style="background:#00F59B; border:2px solid #000000; box-shadow:4px 4px 0px #000000; color:#000000; padding:10px; font-size:12px; font-weight:900; text-transform:uppercase; cursor:pointer; text-align:center; display:flex; align-items:center; justify-content:center; gap:8px;">
            <span>⚡</span> PREENCHER COM AMOSTRA DA AGU
          </button>
        </div>
        <div style="margin-top:12px; padding-top:8px; border-top:1px dashed #000000; font-family:monospace; font-size:9px; font-weight:700; color:#333; text-align:center; text-transform:uppercase;">
          🔒 CANAL EFÊMERO P2P • ZERO DADOS SALVOS
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
          showToastNotification('💡 Use o ícone do doc2fill na barra do Chrome para abrir.');
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
