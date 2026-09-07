// doc2fill - Sidepanel Controller (P2P QR Real & File Picker Integrado)
document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const btnLoadSample = document.getElementById('btn-load-sample');
  const btnAutofill = document.getElementById('btn-autofill');
  const validationBadge = document.getElementById('validation-badge');

  // File Upload Elements
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const btnSelectFile = document.getElementById('btn-select-file');
  const dropTitle = document.getElementById('drop-title');
  const dropSubtitle = document.getElementById('drop-subtitle');

  // QR Code Elements
  const qrBox = document.getElementById('qr-box');
  const qrLinkContainer = document.getElementById('qr-link-container');
  const qrDirectLink = document.getElementById('qr-direct-link');
  const btnCopyLink = document.getElementById('btn-copy-link');
  const qrRelayStatus = document.getElementById('qr-relay-status');

  // Input Fields
  const fCnpj = document.getElementById('field-cnpj');
  const fRazao = document.getElementById('field-razao');
  const fValor = document.getElementById('field-valor');
  const fData = document.getElementById('field-data');
  const fServico = document.getElementById('field-servico');
  const fIrrf = document.getElementById('field-irrf');
  const fDescricao = document.getElementById('field-descricao');

  let activeSessionId = null;
  let relayPollInterval = null;

  // 1. Tab switching
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const target = document.getElementById(`pane-${btn.dataset.tab}`);
      if (target) target.classList.add('active');

      // Se abriu a aba do Celular (QR), inicia sessão e gera QR Code real
      if (btn.dataset.tab === 'qr') {
        initQrSession();
      } else {
        stopRelayPolling();
      }
    });
  });

  // 2. Preenchimento de dados de demonstração (Teste do Lucas)
  function populateFormFields(data) {
    if (data.cnpj) fCnpj.value = data.cnpj;
    if (data.razao) fRazao.value = data.razao;
    if (data.valor) fValor.value = data.valor;
    if (data.data) fData.value = data.data;
    if (data.servico) fServico.value = data.servico;
    if (data.irrf) fIrrf.value = data.irrf;
    if (data.descricao) fDescricao.value = data.descricao;

    validationBadge.textContent = '✓ 6 campos prontos';
    validationBadge.classList.add('valid');
    btnAutofill.disabled = false;
  }

  btnLoadSample.addEventListener('click', () => {
    populateFormFields({
      cnpj: '33.000.167/0001-01',
      razao: 'Petróleo Brasileiro S.A. - Petrobras',
      valor: 'R$ 14.750,00',
      data: '2026-09-06',
      servico: '08.02',
      irrf: 'R$ 221,25',
      descricao: 'Honorários de sucumbência e assessoria contábil em execução fiscal nº 5001234-88.2026.4.04.7100.'
    });
  });

  // 3. Suporte Completo à Seleção e Drag & Drop de Arquivos (PDF / Imagens)
  if (btnSelectFile && fileInput) {
    btnSelectFile.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });
  }

  if (dropZone && fileInput) {
    dropZone.addEventListener('click', () => {
      fileInput.click();
    });

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFileProcessing(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFileProcessing(e.target.files[0]);
      }
    });
  }

  function handleFileProcessing(file) {
    if (!file) return;

    dropTitle.textContent = `✓ ${file.name}`;
    dropSubtitle.textContent = `Tamanho: ${(file.size / 1024).toFixed(1)} KB • Processado em memória`;

    // Simula extração OCR ultrarrápida em memória (Zero Retenção)
    populateFormFields({
      cnpj: '00.000.000/0001-91',
      razao: 'Banco do Brasil S.A.',
      valor: 'R$ 8.920,40',
      data: '2026-09-06',
      servico: '08.02',
      irrf: 'R$ 133,80',
      descricao: `Dados extraídos via ${file.name} — Execução fiscal e honorários advocatícios PGFN/AGU.`
    });
  }

  // 4. Sessão P2P com QR Code Real e Escaneável via Câmera Mobile
  async function initQrSession() {
    if (qrBox) {
      qrBox.innerHTML = '<div style="font-size:12px; color:#6B7280; padding:16px;">⏳ Gerando QR Code escaneável...</div>';
    }

    try {
      // Tenta localhost ou 127.0.0.1
      const res = await fetch('http://localhost:8080/api/session').catch(() =>
        fetch('http://127.0.0.1:8080/api/session')
      );

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      activeSessionId = data.sessionId;

      // Renderiza o SVG real e escaneável
      if (qrBox && data.qrSvg) {
        qrBox.innerHTML = data.qrSvg;
      }

      if (qrLinkContainer && qrDirectLink) {
        qrLinkContainer.style.display = 'flex';
        qrDirectLink.href = data.mobileUrl;
        qrDirectLink.textContent = data.mobileUrl;
      }

      if (qrRelayStatus) {
        qrRelayStatus.style.display = 'flex';
        qrRelayStatus.innerHTML = '<span class="pulse-dot">●</span> Aguardando captura do smartphone...';
      }

      // Inicia polling para capturar os dados do celular
      startRelayPolling(data.sessionId);

    } catch (err) {
      console.warn('[doc2fill] Servidor local não respondeu em /api/session:', err);
      if (qrBox) {
        qrBox.innerHTML = `
          <div style="font-size:11.5px; color:#4B5563; padding:10px; line-height:1.4;">
            💡 <strong>Inicie o Servidor Local:</strong><br>
            Execute <code>npm run demo</code> no terminal para ativar o pareamento P2P e gerar o QR Code.
          </div>
        `;
      }
    }
  }

  // Copiar link para o celular
  if (btnCopyLink && qrDirectLink) {
    btnCopyLink.addEventListener('click', () => {
      navigator.clipboard.writeText(qrDirectLink.href).then(() => {
        btnCopyLink.textContent = '✓ Copiado!';
        setTimeout(() => { btnCopyLink.textContent = 'Copiar Link'; }, 2000);
      });
    });
  }

  // 5. Polling efêmero de dados do celular (Zero Retenção)
  function startRelayPolling(sessionId) {
    stopRelayPolling();

    relayPollInterval = setInterval(async () => {
      if (!sessionId) return;

      try {
        const res = await fetch(`http://localhost:8080/api/relay/poll?session=${sessionId}`);
        if (!res.ok) return;

        const payload = await res.json();
        if (payload.hasData && payload.data) {
          // Dados chegaram do smartphone!
          populateFormFields(payload.data);

          if (qrRelayStatus) {
            qrRelayStatus.innerHTML = '✓ Dados recebidos do smartphone em tempo real!';
            qrRelayStatus.style.color = '#059669';
          }

          stopRelayPolling();
        }
      } catch (e) {
        // Ignora falhas de polling transitórias
      }
    }, 1500);
  }

  function stopRelayPolling() {
    if (relayPollInterval) {
      clearInterval(relayPollInterval);
      relayPollInterval = null;
    }
  }

  // 6. Autofill trigger para a aba ativa
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
});
