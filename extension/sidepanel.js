// doc2fill - Sidepanel Controller (CCHA Honorários & Real File Parsing Edition)
import { translateClinicalProcedure } from './core/clinical-translator.js';
import { classifyDocumentType } from './core/classifier.js';
import { parseDocumentFields, extractTextFromPdfContent, normalizeCanonicalDocumentFields, isPdfEncrypted } from './core/document-parser.js';

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
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

  // Split-View Elements (S2-T1)
  const documentPreviewContainer = document.getElementById('document-preview-container');
  const previewDocImage = document.getElementById('preview-doc-image');
  const previewViewport = document.getElementById('preview-viewport');
  const btnZoom100 = document.getElementById('btn-zoom-100');
  const btnZoom150 = document.getElementById('btn-zoom-150');
  const btnZoom200 = document.getElementById('btn-zoom-200');
  const btnTogglePreview = document.getElementById('btn-toggle-preview');

  // Toolbar de Edição Manual (S2-T2)
  const btnRestoreFields = document.getElementById('btn-restore-fields');
  const btnClearFields = document.getElementById('btn-clear-fields');

  let activeSessionId = null;
  let relayPollInterval = null;
  let attachedFile = null;
  let lastCanonicalData = null;
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

  // Inicializa a descoberta da porta ativa da API imediatamente no carregamento
  resolveApiBaseUrl().catch(() => {});

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
    if (data.tipo_documento && fTipoDoc) {
      fTipoDoc.value = data.tipo_documento;
      if (!fTipoDoc.value && fTipoDoc.options) {
        const norm = (data.tipo_documento || '').toLowerCase();
        for (const opt of fTipoDoc.options) {
          const optVal = opt.value.toLowerCase();
          if (norm.includes('cupom') && optVal.includes('cupom')) {
            fTipoDoc.value = opt.value;
            break;
          }
          if (norm.includes('nota') && optVal.includes('nota')) {
            fTipoDoc.value = opt.value;
            break;
          }
          if (norm.includes('recibo') && optVal.includes('recibo')) {
            fTipoDoc.value = opt.value;
            break;
          }
          if (norm.includes('guia') && optVal.includes('guia')) {
            fTipoDoc.value = opt.value;
            break;
          }
          if (norm.includes('boleto') && optVal.includes('boleto')) {
            fTipoDoc.value = opt.value;
            break;
          }
        }
      }
    }
    if (fCnpj) {
      fCnpj.value = data.cpf_cnpj || data.cnpj || data.cpf || '';
    }
    if (fRazao) {
      fRazao.value = data.fornecedor || data.razao || data.nome || '';
    }
    if (fNumDoc) {
      fNumDoc.value = data.numero_documento || data.processo || '';
    }
    if (fData) {
      fData.value = data.data || '';
    }
    if (fValor) {
      fValor.value = data.valor || '';
    }
    if (fDescricao) {
      fDescricao.value = data.descritivo || data.descricao || '';
    }
    if (fMotivo) {
      fMotivo.value = data.motivo || '';
    }

    if (badgeAntiGlosa) {
      badgeAntiGlosa.textContent = '⚖️ CCHA Validado';
      badgeAntiGlosa.style.display = 'inline-block';
    }

    lastCanonicalData = { ...data };

    if (fileData) {
      attachedFile = fileData;
      if (attachmentStatusBox && attachmentText) {
        attachmentStatusBox.style.display = 'flex';
        attachmentText.textContent = `📎 ${fileData.name} (${(fileData.size / 1024).toFixed(1)} KB) pronto para anexar`;
      }

      // Renderiza Split-View visual da imagem em memória efêmera se for imagem
      if (documentPreviewContainer && previewDocImage && fileData.base64 && (fileData.type?.startsWith('image/') || fileData.name?.match(/\.(png|jpe?g|webp)$/i))) {
        previewDocImage.src = fileData.base64;
        documentPreviewContainer.style.display = 'flex';
      }
    }

    validationBadge.textContent = '✓ 8 Campos Prontos';
    validationBadge.classList.add('valid');
    btnAutofill.disabled = false;
  }

  // Controles de Zoom do Split-View (S2-T1)
  function setPreviewZoom(level) {
    if (!previewDocImage) return;
    previewDocImage.classList.remove('zoom-100', 'zoom-150', 'zoom-200');
    previewDocImage.classList.add(`zoom-${level}`);
    [btnZoom100, btnZoom150, btnZoom200].forEach((b) => {
      if (b) b.classList.toggle('active', b.dataset.zoom === String(level));
    });
  }

  if (btnZoom100) btnZoom100.addEventListener('click', () => setPreviewZoom(100));
  if (btnZoom150) btnZoom150.addEventListener('click', () => setPreviewZoom(150));
  if (btnZoom200) btnZoom200.addEventListener('click', () => setPreviewZoom(200));

  if (btnTogglePreview && previewViewport) {
    btnTogglePreview.addEventListener('click', () => {
      const isHidden = previewViewport.style.display === 'none';
      previewViewport.style.display = isHidden ? 'flex' : 'none';
      btnTogglePreview.textContent = isHidden ? '▲' : '▼';
    });
  }

  // Ações Rápidas de Edição Manual (S2-T2)
  if (btnRestoreFields) {
    btnRestoreFields.addEventListener('click', () => {
      if (lastCanonicalData) {
        populateFormFields(lastCanonicalData, attachedFile);
      }
    });
  }

  if (btnClearFields) {
    btnClearFields.addEventListener('click', () => {
      if (fTipoDoc) fTipoDoc.selectedIndex = 0;
      if (fCnpj) fCnpj.value = '';
      if (fRazao) fRazao.value = '';
      if (fNumDoc) fNumDoc.value = '';
      if (fData) fData.value = '';
      if (fValor) fValor.value = '';
      if (fDescricao) fDescricao.value = '';
      if (fMotivo) fMotivo.value = '';
      validationBadge.textContent = 'Edição manual livre';
      validationBadge.classList.remove('valid');
    });
  }

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
      if (e.dataTransfer && e.dataTransfer.files) {
        handleDocumentFile(e.dataTransfer.files);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target && e.target.files) {
        handleDocumentFile(e.target.files);
      }
    });
  }

  async function handleDocumentFile(filesOrFile) {
    if (!filesOrFile) return;
    const fileList = Array.isArray(filesOrFile) ? filesOrFile : (filesOrFile.length !== undefined ? Array.from(filesOrFile) : [filesOrFile]);
    if (fileList.length === 0) return;

    const file = fileList[0];
    if (fileList.length > 1) {
      console.warn(`[doc2fill] Múltiplos arquivos detectados (${fileList.length}). Processando apenas o primeiro: ${file.name}`);
    }

    const allowedExts = ['.pdf', '.png', '.jpg', '.jpeg'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowedExts.includes(ext)) {
      dropTitle.textContent = `⚠️ Formato não suportado: ${ext}`;
      dropSubtitle.textContent = 'Por favor, selecione um arquivo PDF, PNG ou JPG.';
      return;
    }

    if (file.size === 0) {
      dropTitle.textContent = `⚠️ Arquivo vazio`;
      dropSubtitle.textContent = 'Não foi possível identificar o texto. Preencha manualmente ou envie outra foto.';
      populateFormFields(normalizeCanonicalDocumentFields({}), null);
      return;
    }

    if (dropZone) dropZone.style.pointerEvents = 'none';
    dropTitle.textContent = `⏳ Lendo ${file.name}...`;
    dropSubtitle.textContent = `Extraindo texto e campos em memória efêmera...`;

    try {
      // 1. Assegura conexão ativa com a API local
      await resolveApiBaseUrl();

      // 2. Converte para base64 para anexo e eventual envio ao OCR
      const base64Promise = new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(file);
      });

      // 3. Extrai texto bruto (Imagens via OCR, PDF ou texto)
      let extractedText = '';
      let ocrStructuredData = null;

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
          if (ocrJson.success) {
            if (ocrJson.text) extractedText = ocrJson.text;
            if (ocrJson.data) ocrStructuredData = ocrJson.data;
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
        if (isPdfEncrypted(buffer)) {
          dropTitle.textContent = `🔒 PDF protegido por senha`;
          dropSubtitle.textContent = 'Não foi possível identificar o texto. Preencha manualmente ou envie outra foto.';
          populateFormFields(normalizeCanonicalDocumentFields({}), {
            name: file.name,
            type: file.type || 'application/pdf',
            size: file.size,
            base64: await base64Promise
          });
          return;
        }
        extractedText = extractTextFromPdfContent(buffer);

        // Avaliação preliminar de integridade do texto digital do PDF
        const preliminaryParsed = extractedText ? parseDocumentFields(extractedText, file.name) : null;
        const hasCoreFiscalFields = preliminaryParsed && (
          preliminaryParsed.cnpj ||
          preliminaryParsed.cpf ||
          preliminaryParsed.valor ||
          preliminaryParsed.numero_documento
        );

        // Se o PDF for digitalizado/escaneado, sem dados fiscais ou texto insuficiente, chama OCR local
        if (!hasCoreFiscalFields || !extractedText || extractedText.length < 50) {
          dropSubtitle.textContent = 'PDF digitalizado detectado: processando com OCR óptico local...';
          try {
            const b64 = await base64Promise;
            const ocrRes = await fetch(`${activeApiBaseUrl}/api/ocr`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image: b64, name: file.name })
            });
            const ocrJson = await ocrRes.json();
            if (ocrJson.success) {
              if (ocrJson.text) extractedText = ocrJson.text;
              if (ocrJson.data) ocrStructuredData = ocrJson.data;
            }
          } catch (ocrErr) {
            console.warn('[doc2fill sidepanel] OCR fallback no PDF:', ocrErr);
          }
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

      // 4. Extrai campos estruturados (CCHA / Honorários) e mescla com dados do OCR se houver
      const parsed = parseDocumentFields(extractedText, file.name);
      
      // Mesclagem com prioridade estrita: campos válidos do OCR nunca são esmagados por fallbacks locais
      const mergedData = { ...parsed };
      if (ocrStructuredData && typeof ocrStructuredData === 'object') {
        for (const [key, val] of Object.entries(ocrStructuredData)) {
          if (val && typeof val === 'string' && val.trim() !== '') {
            mergedData[key] = val;
          } else if (val !== null && val !== undefined && typeof val !== 'string') {
            mergedData[key] = val;
          }
        }
      }

      // 5. Normalização canônica estrita dos 8 campos (S1-T2)
      const canonicalData = normalizeCanonicalDocumentFields(mergedData);

      dropTitle.textContent = `✓ ${file.name}`;
      dropSubtitle.textContent = `Arquivo lido • ${(file.size / 1024).toFixed(1)} KB • 8 Campos canônicos extraídos`;

      populateFormFields(canonicalData, filePayload);
    } catch (err) {
      console.warn('[doc2fill] Erro ao processar arquivo:', err);
      dropTitle.textContent = `⚠️ Documento ilegível`;
      dropSubtitle.textContent = 'Não foi possível identificar o texto. Preencha manualmente ou envie outra foto.';
      populateFormFields(normalizeCanonicalDocumentFields({}), null);
    } finally {
      if (dropZone) dropZone.style.pointerEvents = 'auto';
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
          const canonical = normalizeCanonicalDocumentFields(payload.data);
          populateFormFields(canonical, payload.file || null);

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
      let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) {
        const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        tab = tabs && tabs.length > 0 ? tabs[0] : null;
      }
      if (!tab || !tab.id) {
        const allTabs = await chrome.tabs.query({ active: true });
        tab = allTabs && allTabs.length > 0 ? allTabs[0] : null;
      }

      if (!tab || !tab.id) {
        alert('Nenhuma aba ativa encontrada.');
        btnAutofill.innerHTML = '<span>⚡</span> Preencher Automaticamente no CCHA';
        btnAutofill.disabled = false;
        return;
      }

      let response = null;
      try {
        response = await chrome.tabs.sendMessage(tab.id, {
          action: 'DOC2FILL_EXECUTE',
          data: payload,
          file: attachedFile
        });
      } catch (sendErr) {
        // Se a página foi aberta antes do reload da extensão, auto-injeta o content script
        if (typeof chrome !== 'undefined' && chrome.scripting && chrome.scripting.executeScript) {
          try {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['content.js']
            });
            response = await chrome.tabs.sendMessage(tab.id, {
              action: 'DOC2FILL_EXECUTE',
              data: payload,
              file: attachedFile
            });
          } catch (injectErr) {
            console.warn('[doc2fill] Falha na auto-injeção programática:', injectErr);
            throw sendErr;
          }
        } else {
          throw sendErr;
        }
      }

      if (response && response.success) {
        btnAutofill.textContent = `✓ Preenchido (${response.count} campos)!`;
        try {
          const { saveDocumentToHistory } = await import('./core/history-store.js');
          await saveDocumentToHistory(payload);
        } catch (_) {}

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

  // 7. Atalhos de teclado no Sidepanel (Ctrl+Enter para disparar autofill, Escape para fechar zoom)
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (btnAutofill && !btnAutofill.disabled) {
        btnAutofill.click();
      }
    } else if (e.key === 'Escape') {
      if (btnTogglePreview && documentPreviewContainer && !documentPreviewContainer.classList.contains('hidden')) {
        btnTogglePreview.click();
      }
    }
  });
});
