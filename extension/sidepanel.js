// doc2fill - Sidepanel Controller (Neo-Brutalist Edition)
document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const btnLoadSample = document.getElementById('btn-load-sample');
  const btnAutofill = document.getElementById('btn-autofill');
  const validationBadge = document.getElementById('validation-badge');

  // Input Fields
  const fCnpj = document.getElementById('field-cnpj');
  const fRazao = document.getElementById('field-razao');
  const fValor = document.getElementById('field-valor');
  const fData = document.getElementById('field-data');
  const fServico = document.getElementById('field-servico');
  const fIrrf = document.getElementById('field-irrf');
  const fDescricao = document.getElementById('field-descricao');

  // Tab switching
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const target = document.getElementById(`pane-${btn.dataset.tab}`);
      if (target) target.classList.add('active');
    });
  });

  // Sample data loader (Demonstração do Lucas)
  btnLoadSample.addEventListener('click', () => {
    fCnpj.value = '33.000.167/0001-01';
    fRazao.value = 'Petróleo Brasileiro S.A. - Petrobras';
    fValor.value = 'R$ 14.750,00';
    fData.value = '2026-09-06';
    fServico.value = '08.02';
    fIrrf.value = 'R$ 221,25';
    fDescricao.value = 'Honorários de sucumbência e assessoria contábil em execução fiscal nº 5001234-88.2026.4.04.7100.';

    validationBadge.textContent = '✓ 6 CAMPOS PRONTOS';
    validationBadge.classList.add('valid');
    btnAutofill.disabled = false;
  });

  // Autofill trigger to active tab
  btnAutofill.addEventListener('click', async () => {
    const payload = {
      cnpj: fCnpj.value.trim(),
      razao: fRazao.value.trim(),
      valor: fValor.value.trim(),
      data: fData.value.trim(),
      servico: fServico.value.trim(),
      irrf: fIrrf.value.trim(),
      descricao: fDescricao.value.trim()
    };

    btnAutofill.textContent = '⏳ PREENCHENDO FORMULÁRIO...';
    btnAutofill.disabled = true;

    try {
      // Query active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) {
        alert('Nenhuma aba ativa encontrada.');
        btnAutofill.innerHTML = '<span class="btn-bolt">⚡</span> PREENCHER FORMULÁRIO NA PÁGINA';
        btnAutofill.disabled = false;
        return;
      }

      // Send message to content script
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'DOC2FILL_EXECUTE',
        data: payload
      });

      if (response && response.success) {
        btnAutofill.textContent = '✅ PREENCHIDO COM SUCESSO!';
        setTimeout(() => {
          btnAutofill.innerHTML = '<span class="btn-bolt">⚡</span> PREENCHER FORMULÁRIO NA PÁGINA';
          btnAutofill.disabled = false;
        }, 2500);
      } else {
        alert('Não foi possível preencher automaticamente. Verifique se a página contém um formulário compatível.');
        btnAutofill.innerHTML = '<span class="btn-bolt">⚡</span> PREENCHER FORMULÁRIO NA PÁGINA';
        btnAutofill.disabled = false;
      }
    } catch (err) {
      console.error('doc2fill error:', err);
      alert('Erro de comunicação com a página. Certifique-se de atualizar a aba após recarregar a extensão.');
      btnAutofill.innerHTML = '<span class="btn-bolt">⚡</span> PREENCHER FORMULÁRIO NA PÁGINA';
      btnAutofill.disabled = false;
    }
  });

  // Render High-Contrast Neo-Brutalist QR Code Graphic
  const qrBox = document.getElementById('qr-box');
  if (qrBox) {
    qrBox.innerHTML = `
      <svg width="110" height="110" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="#FFFFFF" stroke="#000000" stroke-width="2"/>
        <rect x="10" y="10" width="26" height="26" fill="#000000"/>
        <rect x="15" y="15" width="16" height="16" fill="#FFFFFF"/>
        <rect x="19" y="19" width="8" height="8" fill="#000000"/>
        
        <rect x="64" y="10" width="26" height="26" fill="#000000"/>
        <rect x="69" y="15" width="16" height="16" fill="#FFFFFF"/>
        <rect x="73" y="19" width="8" height="8" fill="#000000"/>
        
        <rect x="10" y="64" width="26" height="26" fill="#000000"/>
        <rect x="15" y="69" width="16" height="16" fill="#FFFFFF"/>
        <rect x="19" y="73" width="8" height="8" fill="#000000"/>
        
        <rect x="44" y="44" width="12" height="12" fill="#FFE600" stroke="#000000" stroke-width="2"/>
        <rect x="42" y="15" width="16" height="6" fill="#000000"/>
        <rect x="42" y="78" width="16" height="6" fill="#000000"/>
        <rect x="68" y="45" width="20" height="8" fill="#000000"/>
        <rect x="15" y="45" width="18" height="8" fill="#000000"/>
      </svg>
      <span style="font-family:monospace; font-size:10px; font-weight:800; color:#000000; margin-top:6px; letter-spacing:0.05em;">[P2P PAIR // ZERO-CLOUD]</span>
    `;
  }
});
