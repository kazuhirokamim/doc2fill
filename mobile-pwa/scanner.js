// doc2fill — Controlador Mobile PWA (Scanner da Câmera & Transmissão P2P)
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('camera-input');
  const container = document.getElementById('preview-container');
  const img = document.getElementById('preview-img');
  const statusBadge = document.getElementById('status-badge');
  const btnTransmit = document.getElementById('btn-transmit');

  const sessionId = new URLSearchParams(window.location.search).get('session');

  const quickCopySection = document.getElementById('quick-copy-section');
  const quickCopyButtons = document.getElementById('quick-copy-buttons');

  const defaultHealthData = {
    tipo_documento: 'recibo',
    beneficiario: 'titular',
    natureza: 'nao_cirurgico',
    cnpj: '33.000.167/0001-01',
    razao: 'Dr. Roberto Santos Clínico e Dermatologista',
    valor: 'R$ 1.850,00',
    data: '2026-09-18',
    servico: '20.10.101-5',
    descricao: 'Tratamento de alopecia areata e alopécia cicatricial (TUSS 20.10.101-5)',
    motivo: 'Controle de processo inflamatório folicular ativo com repercussão dermatofuncional severa.'
  };

  function renderQuickCopyButtons(data) {
    if (!quickCopySection || !quickCopyButtons) return;
    quickCopyButtons.innerHTML = '';

    const fields = [
      { key: 'cnpj', label: 'Copiar CNPJ / CPF' },
      { key: 'razao', label: 'Copiar Nome / Razão Social' },
      { key: 'valor', label: 'Copiar Valor' },
      { key: 'descricao', label: 'Copiar Descrição Técnica TUSS' },
      { key: 'motivo', label: 'Copiar Motivo Anti-Glosa' }
    ];

    fields.forEach(f => {
      const val = data[f.key];
      if (!val) return;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.style.cssText = 'display:flex; justify-content:space-between; align-items:center; width:100%; padding:10px 14px; background:#F1F5F9; border:1px solid #CBD5E1; border-radius:10px; font-size:12.5px; color:#1E293B; cursor:pointer; font-weight:500; transition:all 0.15s;';
      btn.innerHTML = `<span>${f.label}</span><span style="font-size:11px; color:#64748B; max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${val}</span>`;

      btn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(val);
          btn.style.background = '#DCFCE7';
          btn.style.borderColor = '#86EFAC';
          const original = btn.innerHTML;
          btn.innerHTML = `<span>✓ Copiado!</span><span style="font-size:11px; color:#166534;">Pronto para colar</span>`;
          setTimeout(() => {
            btn.innerHTML = original;
            btn.style.background = '#F1F5F9';
            btn.style.borderColor = '#CBD5E1';
          }, 1500);
        } catch (e) {
          console.warn('Falha ao copiar:', e);
        }
      });

      quickCopyButtons.appendChild(btn);
    });

    quickCopySection.style.display = 'block';
  }

  // Renderiza botões assistidos na inicialização com os dados padrão
  renderQuickCopyButtons(defaultHealthData);

  async function sendToExtension(customData) {
    if (!sessionId) {
      if (statusBadge) {
        statusBadge.textContent = '⚠️ Abra este link pelo QR Code da extensão';
        statusBadge.style.background = '#FEF3C7';
        statusBadge.style.color = '#92400E';
      }
      return;
    }

    if (statusBadge) {
      statusBadge.textContent = '⏳ Transmitindo dados via P2P...';
    }

    try {
      const payload = customData || defaultHealthData;

      const res = await fetch('/api/relay/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session: sessionId, data: payload })
      });
      const resJson = await res.json();
      if (resJson.success && statusBadge) {
        statusBadge.textContent = '✓ Transmitido para a extensão no computador!';
        statusBadge.style.background = '#ECFDF5';
        statusBadge.style.color = '#065F46';
      }
    } catch (err) {
      if (statusBadge) {
        statusBadge.textContent = '❌ Erro ao conectar com o computador';
        statusBadge.style.background = '#FEE2E2';
        statusBadge.style.color = '#991B1B';
      }
    }
  }

  if (input) {
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (img) img.src = ev.target.result;
          if (container) container.style.display = 'block';
          sendToExtension();
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (btnTransmit) {
    btnTransmit.addEventListener('click', () => {
      sendToExtension();
    });
  }
});
