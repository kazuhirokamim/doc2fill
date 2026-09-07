// doc2fill - Sidepanel Controller
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

  // Sample data loader (Teste do Lucas)
  btnLoadSample.addEventListener('click', () => {
    fCnpj.value = '33.000.167/0001-01';
    fRazao.value = 'Petróleo Brasileiro S.A. - Petrobras';
    fValor.value = 'R$ 14.750,00';
    fData.value = '2026-09-06';
    fServico.value = '08.02';
    fIrrf.value = 'R$ 221,25';
    fDescricao.value = 'Honorários de sucumbência e assessoria contábil em execução fiscal nº 5001234-88.2026.4.04.7100.';

    validationBadge.textContent = '✓ 6 Campos Prontos';
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

    btnAutofill.textContent = '⏳ Preenchendo...';
    btnAutofill.disabled = true;

    try {
      // Query active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) {
        alert('Nenhuma aba ativa encontrada.');
        return;
      }

      // Send message to content script
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'DOC2FILL_EXECUTE',
        data: payload
      });

      if (response && response.success) {
        btnAutofill.textContent = '✅ Formulário Preenchido!';
        setTimeout(() => {
          btnAutofill.innerHTML = '<span class="btn-icon">⚡</span> Preencher Formulário na Página';
          btnAutofill.disabled = false;
        }, 2500);
      } else {
        alert('Não foi possível preencher automaticamente. Verifique se a página é um formulário compatível.');
        btnAutofill.innerHTML = '<span class="btn-icon">⚡</span> Preencher Formulário na Página';
        btnAutofill.disabled = false;
      }
    } catch (err) {
      console.error('doc2fill error:', err);
      alert('Erro de comunicação com a página. Certifique-se de atualizar a página após carregar a extensão.');
      btnAutofill.innerHTML = '<span class="btn-icon">⚡</span> Preencher Formulário na Página';
      btnAutofill.disabled = false;
    }
  });

  // Render Dynamic SVG QR Code
  const qrBox = document.getElementById('qr-box');
  if (qrBox) {
    qrBox.innerHTML = `
      <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="#FFFFFF"/>
        <rect x="10" y="10" width="25" height="25" fill="#000000"/>
        <rect x="15" y="15" width="15" height="15" fill="#FFFFFF"/>
        <rect x="18" y="18" width="9" height="9" fill="#000000"/>
        <rect x="65" y="10" width="25" height="25" fill="#000000"/>
        <rect x="70" y="15" width="15" height="15" fill="#FFFFFF"/>
        <rect x="73" y="18" width="9" height="9" fill="#000000"/>
        <rect x="10" y="65" width="25" height="25" fill="#000000"/>
        <rect x="15" y="70" width="15" height="15" fill="#FFFFFF"/>
        <rect x="18" y="73" width="9" height="9" fill="#000000"/>
        <circle cx="50" cy="50" r="8" fill="#10B981"/>
        <rect x="42" y="15" width="16" height="6" fill="#000000"/>
        <rect x="42" y="78" width="16" height="6" fill="#000000"/>
        <rect x="68" y="45" width="20" height="8" fill="#000000"/>
        <rect x="15" y="45" width="18" height="8" fill="#000000"/>
      </svg>
      <span style="color:#0B0F19; font-size:10px; margin-top:4px;">doc2fill P2P Pair</span>
    `;
  }
});
