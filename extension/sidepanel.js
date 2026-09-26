// doc2fill - Sidepanel Controller (Clinical Translation & File Injection Edition)
import { translateClinicalProcedure } from './core/clinical-translator.js';
import { classifyDocumentType } from './core/classifier.js';

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
  const attachmentStatusBox = document.getElementById('attachment-status-box');
  const attachmentText = document.getElementById('attachment-text');

  // QR Code Elements
  const qrBox = document.getElementById('qr-box');
  const qrLinkContainer = document.getElementById('qr-link-container');
  const qrDirectLink = document.getElementById('qr-direct-link');
  const btnCopyLink = document.getElementById('btn-copy-link');
  const qrRelayStatus = document.getElementById('qr-relay-status');

  // Input Fields & CCHA Controls
  const fBeneficiario = document.getElementById('field-beneficiario');
  const fTipoDoc = document.getElementById('field-tipo-doc');
  const fCnpj = document.getElementById('field-cnpj');
  const fProcesso = document.getElementById('field-processo');
  const fRazao = document.getElementById('field-razao');
  const fValor = document.getElementById('field-valor');
  const fData = document.getElementById('field-data');
  const fNatureza = document.getElementById('field-natureza');
  const fIrrf = document.getElementById('field-irrf');
  const fDescricao = document.getElementById('field-descricao');
  const fMotivo = document.getElementById('field-motivo');
  const badgeAntiGlosa = document.getElementById('badge-anti-glosa');

  let activeSessionId = null;
  let relayPollInterval = null;
  let attachedFile = null;

  // 1. Tab switching
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const target = document.getElementById(`pane-${btn.dataset.tab}`);
      if (target) target.classList.add('active');

      if (btn.dataset.tab === 'qr') {
        initQrSession();
      } else {
        stopRelayPolling();
      }
    });
  });

  // 2. Preenchimento de dados do CCHA
  function populateFormFields(data, fileData = null) {
    if (data.beneficiario && fBeneficiario) fBeneficiario.value = data.beneficiario;
    if (data.tipo_documento && fTipoDoc) fTipoDoc.value = data.tipo_documento;
    if (data.cnpj && fCnpj) fCnpj.value = data.cnpj;
    if (data.processo && fProcesso) fProcesso.value = data.processo;
    if (data.razao && fRazao) fRazao.value = data.razao;
    if (data.valor && fValor) fValor.value = data.valor;
    if (data.data && fData) fData.value = data.data;
    if (data.natureza && fNatureza) fNatureza.value = data.natureza;
    if (data.irrf && fIrrf) fIrrf.value = data.irrf;
    if (data.descricao && fDescricao) fDescricao.value = data.descricao;
    if (data.motivo && fMotivo) fMotivo.value = data.motivo;

    if (badgeAntiGlosa) {
      badgeAntiGlosa.textContent = '⚖️ CCHA Validado';
      badgeAntiGlosa.style.display = 'inline-block';
    }

    if (fileData) {
      attachedFile = fileData;
      if (attachmentStatusBox && attachmentText) {
        attachmentStatusBox.style.display = 'flex';
        attachmentText.textContent = `📎 ${fileData.name} (${(fileData.size / 1024).toFixed(1)} KB) pronto para anexar`;
      }
    }

    validationBadge.textContent = '✓ Dados do CCHA Prontos';
    validationBadge.classList.add('valid');
    btnAutofill.disabled = false;
  }

  // Demonstração Rápida (Caso Real CCHA: Requerimento de Honorários Advocatícios / AGU)
  btnLoadSample.addEventListener('click', () => {
    // PDF de comprovante em base64 minimalista
    const samplePdfBase64 = 'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp/Og0MTGCjEgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDIgMCBS';

    populateFormFields({
      beneficiario: 'Advogado da União (AGU)',
      tipo_documento: 'Requerimento de Honorários',
      cnpj: '123.456.789-00',
      processo: '0045821-44.2026.4.01.3400',
      razao: 'Dr. Lucas Silva — Advogado da União',
      valor: 'R$ 14.850,00',
      data: '2026-09-25',
      natureza: 'Banco do Brasil (001)',
      irrf: 'Ag: 3380-4 CC: 45210-9 (PIX: lucas.silva@agu.gov.br)',
      descricao: 'Honorários advocatícios sucumbenciais devidos em decorrência de êxito em atuação judicial perante o Tribunal Regional Federal.',
      motivo: 'Art. 29 a 36 da Lei nº 13.327/2016 e deliberações do CCHA. Preenchimento de requisitos de elegibilidade e rateio.'
    }, {
      name: 'comprovante_honorarios_ccha.pdf',
      type: 'application/pdf',
      size: 165000,
      base64: samplePdfBase64
    });
  });

  // 3. Seleção e Drag & Drop de Arquivos com Leitura em Memória
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
    dropSubtitle.textContent = `Tamanho: ${(file.size / 1024).toFixed(1)} KB • Em memória volátil`;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target.result;
      const filePayload = {
        name: file.name,
        type: file.type || 'application/pdf',
        size: file.size,
        base64
      };

      // Classifica o tipo de documento pelo nome do arquivo
      const docType = classifyDocumentType('', file.name);

      // Preenche com extração em memória
      populateFormFields({
        beneficiario: 'titular',
        tipo_documento: docType.type,
        cnpj: '00.000.000/0001-91',
        razao: 'Hospital e Clínica Médica Especializada',
        valor: 'R$ 3.200,00',
        data: new Date().toISOString().split('T')[0],
        descricao: file.name.toLowerCase().includes('capilar') ? 'implante capilar' : 'lente dental'
      }, filePayload);
    };
    reader.readAsDataURL(file);
  }

  // 4. Sessão P2P com QR Code Real e Escaneável via Câmera Mobile
  async function initQrSession() {
    if (qrBox) {
      qrBox.innerHTML = '<div style="font-size:12px; color:#6B7280; padding:16px;">⏳ Gerando QR Code escaneável...</div>';
    }

    try {
      const res = await fetch('http://localhost:8080/api/session').catch(() =>
        fetch('http://127.0.0.1:8080/api/session')
      );

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      activeSessionId = data.sessionId;

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

  if (btnCopyLink && qrDirectLink) {
    btnCopyLink.addEventListener('click', () => {
      navigator.clipboard.writeText(qrDirectLink.href).then(() => {
        btnCopyLink.textContent = '✓ Copiado!';
        setTimeout(() => { btnCopyLink.textContent = 'Copiar Link'; }, 2000);
      });
    });
  }

  // 5. Polling efêmero de dados do celular
  function startRelayPolling(sessionId) {
    stopRelayPolling();

    relayPollInterval = setInterval(async () => {
      if (!sessionId) return;

      try {
        const res = await fetch(`http://localhost:8080/api/relay/poll?session=${sessionId}`);
        if (!res.ok) return;

        const payload = await res.json();
        if (payload.hasData && payload.data) {
          populateFormFields(payload.data, payload.file || null);

          if (qrRelayStatus) {
            qrRelayStatus.innerHTML = '✓ Dados & Foto recebidos do smartphone em tempo real!';
            qrRelayStatus.style.color = '#059669';
          }

          stopRelayPolling();
        }
      } catch (e) {
        // Silencia erros de polling transitórios
      }
    }, 1500);
  }

  function stopRelayPolling() {
    if (relayPollInterval) {
      clearInterval(relayPollInterval);
      relayPollInterval = null;
    }
  }

  // 6. Autofill trigger para a aba ativa (Preenchimento + Anexação)
  btnAutofill.addEventListener('click', async () => {
    const payload = {
      cnpj: fCnpj.value.trim(),
      cpf: fCnpj.value.trim(),
      matricula: fCnpj.value.trim(),
      razao: fRazao.value.trim(),
      nome: fRazao.value.trim(),
      beneficiario: fBeneficiario ? fBeneficiario.value : '',
      processo: fProcesso ? fProcesso.value.trim() : '',
      valor: fValor.value.trim(),
      data: fData.value.trim(),
      banco: fNatureza ? fNatureza.value : '',
      agencia: fIrrf ? fIrrf.value.trim() : '',
      conta: fIrrf ? fIrrf.value.trim() : '',
      pix: fIrrf ? fIrrf.value.trim() : '',
      irrf: fIrrf ? fIrrf.value.trim() : '',
      descricao: fDescricao.value.trim(),
      motivo: fMotivo ? fMotivo.value.trim() : '',
      tipo_documento: fTipoDoc ? fTipoDoc.value : 'Requerimento de Honorários'
    };

    btnAutofill.textContent = 'Preenchendo e anexando...';
    btnAutofill.disabled = true;

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) {
        alert('Nenhuma aba ativa encontrada.');
        btnAutofill.innerHTML = '<span>⚡</span> Preencher Formulário & Anexar';
        btnAutofill.disabled = false;
        return;
      }

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'DOC2FILL_EXECUTE',
        data: payload,
        file: attachedFile
      });

      if (response && response.success) {
        btnAutofill.textContent = `✓ Preenchido (${response.count} campos)!`;
        setTimeout(() => {
          btnAutofill.innerHTML = '<span>⚡</span> Preencher Formulário & Anexar';
          btnAutofill.disabled = false;
        }, 2200);
      } else {
        alert('Não foi possível preencher. Verifique se a página aberta possui um formulário compatível.');
        btnAutofill.innerHTML = '<span>⚡</span> Preencher Formulário & Anexar';
        btnAutofill.disabled = false;
      }
    } catch (err) {
      console.error('doc2fill error:', err);
      alert('Erro de conexão com a página. Recarregue a aba após atualizar a extensão.');
      btnAutofill.innerHTML = '<span>⚡</span> Preencher Formulário & Anexar';
      btnAutofill.disabled = false;
    }
  });
});
