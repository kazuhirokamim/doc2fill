// doc2fill - Sidepanel Controller (Clean & Refined Edition)
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

  // Sample data loader (Demonstração Lucas)
  btnLoadSample.addEventListener('click', () => {
    fCnpj.value = '33.000.167/0001-01';
    fRazao.value = 'Petróleo Brasileiro S.A. - Petrobras';
    fValor.value = 'R$ 14.750,00';
    fData.value = '2026-09-06';
    fServico.value = '08.02';
    fIrrf.value = 'R$ 221,25';
    fDescricao.value = 'Honorários de sucumbência e assessoria contábil em execução fiscal nº 5001234-88.2026.4.04.7100.';

    validationBadge.textContent = '✓ 6 campos prontos';
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

    btnAutofill.textContent = 'Preenchendo formulário...';
    btnAutofill.disabled = true;

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) {
        alert('Nenhuma aba ativa encontrada.');
        btnAutofill.innerHTML = '<span>⚡</span> Preencher Formulário na Página';
        btnAutofill.disabled = false;
        return;
      }

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'DOC2FILL_EXECUTE',
        data: payload
      });

      if (response && response.success) {
        btnAutofill.textContent = '✓ Formulário Preenchido!';
        setTimeout(() => {
          btnAutofill.innerHTML = '<span>⚡</span> Preencher Formulário na Página';
          btnAutofill.disabled = false;
        }, 2200);
      } else {
        alert('Não foi possível preencher. Verifique se a página é um formulário compatível.');
        btnAutofill.innerHTML = '<span>⚡</span> Preencher Formulário na Página';
        btnAutofill.disabled = false;
      }
    } catch (err) {
      console.error('doc2fill error:', err);
      alert('Erro de conexão com a página. Recarregue a aba após atualizar a extensão.');
      btnAutofill.innerHTML = '<span>⚡</span> Preencher Formulário na Página';
      btnAutofill.disabled = false;
    }
  });

  // Render Minimalist QR Code Graphic
  const qrBox = document.getElementById('qr-box');
  if (qrBox) {
    qrBox.innerHTML = `
      <svg width="104" height="104" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="8" fill="#FFFFFF"/>
        <rect x="10" y="10" width="24" height="24" rx="4" fill="#111827"/>
        <rect x="15" y="15" width="14" height="14" rx="2" fill="#FFFFFF"/>
        <rect x="19" y="19" width="6" height="6" rx="1" fill="#111827"/>
        
        <rect x="66" y="10" width="24" height="24" rx="4" fill="#111827"/>
        <rect x="71" y="15" width="14" height="14" rx="2" fill="#FFFFFF"/>
        <rect x="75" y="19" width="6" height="6" rx="1" fill="#111827"/>
        
        <rect x="10" y="66" width="24" height="24" rx="4" fill="#111827"/>
        <rect x="15" y="71" width="14" height="14" rx="2" fill="#FFFFFF"/>
        <rect x="19" y="75" width="6" height="6" rx="1" fill="#111827"/>
        
        <circle cx="50" cy="50" r="5" fill="#10B981"/>
        <rect x="42" y="14" width="16" height="5" rx="2" fill="#111827"/>
        <rect x="42" y="81" width="16" height="5" rx="2" fill="#111827"/>
        <rect x="68" y="47" width="18" height="6" rx="2" fill="#111827"/>
        <rect x="14" y="47" width="18" height="6" rx="2" fill="#111827"/>
      </svg>
      <span style="font-size:10.5px; color:#6B7280; margin-top:8px; font-weight:500;">Pareamento P2P Criptografado</span>
    `;
  }
});
