// doc2fill — Controlador Mobile PWA (Scanner da Câmera & Transmissão P2P)
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('camera-input');
  const container = document.getElementById('preview-container');
  const img = document.getElementById('preview-img');
  const statusBadge = document.getElementById('status-badge');
  const btnTransmit = document.getElementById('btn-transmit');

  const sessionId = new URLSearchParams(window.location.search).get('session');

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
      const payload = customData || {
        cnpj: '33.000.167/0001-01',
        razao: 'Petróleo Brasileiro S.A. - Petrobras',
        valor: 'R$ 14.750,00',
        data: '2026-09-06',
        servico: '08.02',
        irrf: 'R$ 221,25',
        descricao: 'Honorários de sucumbência e assessoria contábil em execução fiscal nº 5001234-88.2026.4.04.7100.'
      };

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
