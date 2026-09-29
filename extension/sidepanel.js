// doc2fill - Sidepanel Controller (CCHA Honorários & Real File Parsing Edition)
import { translateClinicalProcedure } from './core/clinical-translator.js';
import { classifyDocumentType } from './core/classifier.js';
import { parseDocumentFields, extractTextFromPdfContent } from './core/document-parser.js';

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

  // Input Fields & CCHA Controls (8 Campos Focados)
  const fTipoDoc = document.getElementById('field-tipo-doc');
  const fCnpj = document.getElementById('field-cnpj');
  const fRazao = document.getElementById('field-razao');
  const fNumDoc = document.getElementById('field-num-doc');
  const fData = document.getElementById('field-data');
  const fValor = document.getElementById('field-valor');
  const fDescricao = document.getElementById('field-descricao');
  const fMotivo = document.getElementById('field-motivo');
  const badgeAntiGlosa = document.getElementById('badge-anti-glosa');

  let activeSessionId = null;
  let relayPollInterval = null;
  let attachedFile = null;
  let activeApiBaseUrl = 'http://localhost:3333';

  // Descobre dinamicamente a porta ativa do servidor local (3333, 8080, 3334, 3030...)
  async function resolveApiBaseUrl() {
    const candidatePorts = [3333, 8080, 3334, 3030, 4040];
    for (const port of candidatePorts) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 600);
        const res = await fetch(`http://localhost:${port}/api/session`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res && res.ok) {
          activeApiBaseUrl = `http://localhost:${port}`;
          return { baseUrl: activeApiBaseUrl, sessionData: await res.json() };
        }
      } catch (_) {}
    }
    return { baseUrl: activeApiBaseUrl, sessionData: null };
  }

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

  // 2. Preenchimento dos 8 campos focados
  function populateFormFields(data, fileData = null) {
    if (data.tipo_documento && fTipoDoc) fTipoDoc.value = data.tipo_documento;
    if ((data.cpf_cnpj || data.cnpj || data.cpf) && fCnpj) {
      fCnpj.value = data.cpf_cnpj || data.cnpj || data.cpf;
    }
    if ((data.fornecedor || data.razao || data.nome) && fRazao) {
      fRazao.value = data.fornecedor || data.razao || data.nome;
    }
    if ((data.numero_documento || data.processo) && fNumDoc) {
      fNumDoc.value = data.numero_documento || data.processo;
    }
    if (data.data && fData) fData.value = data.data;
    if (data.valor && fValor) fValor.value = data.valor;
    if ((data.descritivo || data.descricao) && fDescricao) {
      fDescricao.value = data.descritivo || data.descricao;
    }
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

    validationBadge.textContent = '✓ 8 Campos Prontos';
    validationBadge.classList.add('valid');
    btnAutofill.disabled = false;
  }

  // Demonstração Rápida (Caso Real CCHA: Requerimento de Honorários Advocatícios / AGU)
  btnLoadSample.addEventListener('click', () => {
    // PDF de comprovante em base64 minimalista
    const samplePdfBase64 = 'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp/Og0MTGCjEgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDIgMCBS';

    populateFormFields({
      tipo_documento: 'Nota Fiscal de Serviços (NFS-e)',
      cpf_cnpj: '12.345.678/0001-90',
      fornecedor: 'Dr. Lucas Silva — Perícias & Consultoria Jurídica',
      numero_documento: '00045821',
      data: '2026-09-25',
      valor: 'R$ 14.850,00',
      descritivo: 'Honorários advocatícios sucumbenciais devidos perante o CCHA em decorrência de êxito em atuação judicial.',
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

  async function handleFileProcessing(file) {
    if (!file) return;

    dropTitle.textContent = `⏳ Lendo ${file.name}...`;
    dropSubtitle.textContent = `Extraindo texto e campos em memória efêmera...`;

    try {
      // 1. Converte para base64 para anexo
      const base64Promise = new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(file);
      });

      // 2. Extrai texto bruto (Imagens via OCR, PDF ou texto)
      let extractedText = '';
      if (file.type.startsWith('image/') || file.name.match(/\.(png|jpe?g|webp|bmp)$/i)) {
        dropSubtitle.textContent = 'Processando com OCR óptico em português...';
        try {
          const b64 = await base64Promise;
          const ocrRes = await fetch(`${activeApiBaseUrl}/api/ocr`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: b64, name: file.name })
          });
          const ocrJson = await ocrRes.json();
          if (ocrJson.success && ocrJson.text) {
            extractedText = ocrJson.text;
          }
        } catch (ocrErr) {
          console.warn('[doc2fill sidepanel] OCR fallback:', ocrErr);
        }
      } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        const bufferPromise = new Promise((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result);
          r.onerror = reject;
          r.readAsArrayBuffer(file);
        });
        const buffer = await bufferPromise;
        extractedText = extractTextFromPdfContent(buffer);

        // Se o PDF for puramente escaneado (sem texto digital ASCII), tenta OCR
        if (!extractedText || extractedText.length < 20) {
          try {
            const b64 = await base64Promise;
            const ocrRes = await fetch(`${activeApiBaseUrl}/api/ocr`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image: b64, name: file.name })
            });
            const ocrJson = await ocrRes.json();
            if (ocrJson.success && ocrJson.text) {
              extractedText = ocrJson.text;
            }
          } catch (_) {}
        }
      } else if (file.type.startsWith('text/') || file.name.match(/\.(txt|csv|json|xml|html)$/i)) {
        const textPromise = new Promise((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result);
          r.onerror = reject;
          r.readAsText(file);
        });
        extractedText = await textPromise;
      }

      const base64 = await base64Promise;
      const filePayload = {
        name: file.name,
        type: file.type || 'application/pdf',
        size: file.size,
        base64
      };

      // 3. Extrai campos estruturados (CCHA / Honorários)
      const parsed = parseDocumentFields(extractedText, file.name);

      dropTitle.textContent = `✓ ${file.name}`;
      dropSubtitle.textContent = `Arquivo lido • ${(file.size / 1024).toFixed(1)} KB • Dados extraídos`;

      populateFormFields(parsed, filePayload);
    } catch (err) {
      console.error('[doc2fill] Erro ao processar arquivo:', err);
      dropTitle.textContent = `⚠️ Erro ao ler ${file.name}`;
      dropSubtitle.textContent = 'Não foi possível ler o arquivo. Tente novamente.';
    }
  }

  // 4. Sessão P2P com QR Code Real e Escaneável via Câmera Mobile
  async function initQrSession() {
    if (qrBox) {
      qrBox.innerHTML = '<div style="font-size:12px; color:#6B7280; padding:16px;">⏳ Gerando QR Code escaneável...</div>';
    }

    try {
      const { baseUrl, sessionData } = await resolveApiBaseUrl();
      let data = sessionData;

      if (!data) {
        const res = await fetch(`${baseUrl}/api/session`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        data = await res.json();
      }

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
            Execute <code>npm run dev</code> no terminal para ativar o pareamento P2P e gerar o QR Code.
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
        const res = await fetch(`${activeApiBaseUrl}/api/relay/poll?session=${sessionId}`);
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

  // 6. Autofill trigger para a aba ativa (Preenchimento dos 8 campos + Anexação)
  btnAutofill.addEventListener('click', async () => {
    const payload = {
      tipo_documento: fTipoDoc ? fTipoDoc.value : 'Nota Fiscal de Serviços (NFS-e)',
      cpf_cnpj: fCnpj ? fCnpj.value.trim() : '',
      cnpj: fCnpj ? fCnpj.value.trim() : '',
      cpf: fCnpj ? fCnpj.value.trim() : '',
      fornecedor: fRazao ? fRazao.value.trim() : '',
      razao: fRazao ? fRazao.value.trim() : '',
      nome: fRazao ? fRazao.value.trim() : '',
      numero_documento: fNumDoc ? fNumDoc.value.trim() : '',
      processo: fNumDoc ? fNumDoc.value.trim() : '',
      data: fData ? fData.value.trim() : '',
      valor: fValor ? fValor.value.trim() : '',
      descritivo: fDescricao ? fDescricao.value.trim() : '',
      descricao: fDescricao ? fDescricao.value.trim() : '',
      motivo: fMotivo ? fMotivo.value.trim() : ''
    };

    btnAutofill.textContent = 'Preenchendo no CCHA...';
    btnAutofill.disabled = true;

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) {
        alert('Nenhuma aba ativa encontrada.');
        btnAutofill.innerHTML = '<span>⚡</span> Preencher Automaticamente no CCHA';
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
          btnAutofill.innerHTML = '<span>⚡</span> Preencher Automaticamente no CCHA';
          btnAutofill.disabled = false;
        }, 2200);
      } else {
        alert('Não foi possível preencher. Verifique se a página aberta possui um formulário compatível.');
        btnAutofill.innerHTML = '<span>⚡</span> Preencher Automaticamente no CCHA';
        btnAutofill.disabled = false;
      }
    } catch (err) {
      console.error('doc2fill error:', err);
      alert('Erro de conexão com a página. Recarregue a aba após atualizar a extensão.');
      btnAutofill.innerHTML = '<span>⚡</span> Preencher Automaticamente no CCHA';
      btnAutofill.disabled = false;
    }
  });
});
